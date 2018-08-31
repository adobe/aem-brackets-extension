/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/
(function () {
    'use strict';
    var Os = require('os'),
        Crypto = require('crypto'),
        Fs = require('fs-extra'),
        Path = require('path'),
        AdmZip = require('adm-zip'),
        Q = require('q'),
        Glob = require('glob'),
        XMLDom = require('xmldom'),
        XPath = require('xpath'),
        PackMgr = require('./PackMgr'),
        Filter = require('./Filter'),
        FilterRule = require('./FilterRule'),
        Constants = require('./Constants'),
        JCR_ROOT = 'jcr_root',
        EXCLUDES = ['.vlt', '.vltignore', '.vlt-sync.log', '.vlt-sync-config.properties', '.DS_Store'],
        VLTIGNORE = '.vltignore',
        pseudoRandomBytes = Q.denodeify(Crypto.pseudoRandomBytes),
        glob = Q.denodeify(Glob),
        Archiver = require('archiver'),
        VaultIgnoreParser = require('./VaultIgnore');

    Q.longStackSupport = true;
    var PUSH = 'push';
    var PULL = 'pull';

    /**
     * Returns the filtering path (the path after 'jcr_root/').
     *
     * @param {String} path the local project patch from which to extract the remote path
     * @returns {String} the filtering path
     */
    function getFilter(path) {
        var filter = path.substring(path.indexOf(JCR_ROOT) + JCR_ROOT.length);
        if (filter === '') {
            filter = '/';
        }
        return filter;
    }

    /**
     * Returns the filtering folder path: the path's parent if the path points file or the path itself if the path points to a folder.
     *
     * @param {String} path the filtering path
     * @returns {promise|Q.promise} a promise resolved with the filtering folder path
     */
    function getFilterFolderPath(path) {
        var deferred = Q.defer();
        Fs.stat(path).then(
            function (statObj) {
                if (statObj.isDirectory()) {
                    var ffp = path.substring(path.indexOf(JCR_ROOT) + JCR_ROOT.length);
                    if (ffp === '') {
                        ffp = '/';
                    }
                    deferred.resolve(ffp);
                } else {
                    var filterFolderPath = Path.dirname(path);
                    deferred.resolve(
                        filterFolderPath.substring(filterFolderPath.indexOf(JCR_ROOT + Path.sep) + (JCR_ROOT + Path.sep).length - 1)
                    );
                }
            }
        );
        return deferred.promise;
    }

    /**
     * Returns the full path down to the <code>jcr_root</code> folder (e.g. for
     * 'workspace/adobe/code/myproj/content-pkg/jcr_root/apps/myproj' this function will return
     * 'workspace/adobe/code/myproj/content-pkg/jcr_root').
     *
     * @param {String} path the path for which to extract the root path
     * @returns {String} the root path
     */
    function getRootPath(path) {
        return path.substring(0, path.indexOf(JCR_ROOT));
    }

    /**
     * Returns the remote path for a file from a content package (e.g. for 'workspace/adobe/code/myproj/content-pkg/jcr_root/apps/myproj'
     * this function will return '/apps/myproj').
     *
     * @param {String} path the local file system path of a file
     * @returns {String} the remote path
     */
    function getRemotePath(path) {
        var remotePath = path.substring(path.indexOf(JCR_ROOT) + JCR_ROOT.length, path.length);
        if (remotePath === '') {
            remotePath = '/';
        }
        return remotePath.replace(/\\/g, '/');
    }

    /**
     * Checks if a <code>path</code> belongs to a JCR checkout or not.
     *
     * @param {String} path the path to check
     * @returns {Boolean} <code>true</code> if the path belongs to a JCR checkout, <code>false</code> otherwise
     */
    function isPathInJCRCheckout(path) {
        return path.indexOf(JCR_ROOT) >= 0;
    }

    /**
     * Returns the package name used for syncing content based on the JCR path of the content to be synced.
     *
     * @param {String} remotePath the remote path of the content to be synced
     * @returns {String} the package name
     */
    function getPackageName(remotePath) {
        return ('repo_' + remotePath.replace(/\//g, '_')).replace(/\\/g, '_').replace(/__/g, '_');
    }

    /**
     * Returns a timestamp as milliseconds since epoch time in order to provide a package version.
     *
     * @returns {number} package version number
     */
    function getPackageVersion() {
        return new Date().getTime();
    }

    /**
     * Creates a unique temporary folder and returns a promise on this folder's path.
     *
     * @returns {String} the temporary's folder path
     */
    function getTempWorkingFolder() {
        return pseudoRandomBytes(4).then(
            function (bytesBuffer) {
                return Path.normalize(Os.tmpdir() + Path.sep + bytesBuffer.toString('hex'));
            }
        ).then(
            function (temporaryWorkingFolder) {
                return Fs.mkdir(temporaryWorkingFolder, '0755').then(
                    function () {
                        return temporaryWorkingFolder;
                    }
                );
            }
        );
    }

    /**
     * Generates an excludes file at the path indicated by <code>excludesFilePath</code>.
     *
     * @param {String} path the path of the content tree that will be synced
     * @param {String} excludesFilePath the path where to generate the excludes file
     */
    function writeExcludes(path, excludesFilePath) {
        var rootPath = getRootPath(path),
            deferred = Q.defer();
        Fs.appendFile(excludesFilePath, '')
            .then(
            function () {
                return Fs.appendFile(excludesFilePath, EXCLUDES.join('\n')).then(Fs.appendFile(excludesFilePath, '\n'));
            }
        ).then(
            function () {
                return exists(rootPath + VLTIGNORE).then(
                    function () {
                        Fs.readFile(rootPath + VLTIGNORE).then(
                            /*
                             *   if there's a local '.vltignore' file append its contents to the excludes file
                             */
                            function (data) {
                                var ignores = [];
                                var lines = data.toString().split('\n');
                                for (var li = 0; li < lines.length; li++) {
                                    var line = lines[li];
                                    if (line) {
                                        if (/^.*\n$/.test(line)) {
                                            ignores.push(line);
                                        } else {
                                            ignores.push(line + '\n');
                                        }
                                    }
                                }
                                Fs.appendFile(excludesFilePath, ignores.join('\n')).done();
                            }
                        ).done();
                    },
                    function () {
                        // do nothing
                    }
                );
            }
        ).then(
            function () {
                var searchFolder = Path.normalize(path);

                function readAndAppend(file, relPath) {
                    return Fs.readFile(file).then(
                        function (data) {
                            var ignores = [];
                            var lines = data.toString().split('\n');
                            for (var li = 0; li < lines.length; li++) {
                                var line = lines[li];
                                if (line) {
                                    if (/^.*\n$/.test(line)) {
                                        ignores.push(relPath + line);
                                    } else {
                                        ignores.push(relPath + line + '\n');
                                    }
                                }
                            }
                            return Fs.appendFile(excludesFilePath, ignores.join('\n'));
                        }
                    );
                }

                glob('**/' + VLTIGNORE, {cwd: searchFolder}).then(
                    function (files) {
                        var promises = [];
                        for (var i = 0; i < files.length; i++) {
                            var file = searchFolder + Path.sep + files[i];
                            var relPath = '/' + file.substring(0, file.lastIndexOf(Path.sep)).replace(path, '');
                            if (relPath[0] === '/' && relPath.length > 1) {
                                relPath = relPath.substring(1, relPath.length);
                            } else if (relPath === '/') {
                                relPath = '';
                            }
                            if (relPath) {
                                relPath += Path.sep;
                            }
                            promises.push(readAndAppend(file, relPath));
                        }
                        return Q.all(promises);
                    }
                ).then(
                    function () {
                        deferred.resolve(excludesFilePath);
                    }
                );

            }
        ).catch(
            function (error) {
                deferred.reject(new Error(error));
            }
        );
        return deferred.promise;
    }

    /**
     * Creates the meta-inf file structure for the content package that will be uploaded.
     *
     * @param {String} tempWorkingDirectory the random unique temporary folder
     * @param {String} remotePath the remote path to which the sync is performed
     * @param {Array.<Filter>} filters the Apache JackRabbit FileVault filters for the package that will be synchronised
     * @param {String} packageGroup the package group
     * @param {String} packageName the package name
     * @param {String} packageVersion the package version
     * @returns {promise|Q.promise} a promise resolved when the package's META-INF information has been persisted
     */
    function createPackageMetaInf(tempWorkingDirectory, remotePath, filters, packageGroup, packageName, packageVersion) {
        var filter, ri, rule;
        var filterString = '<?xml version="1.0" encoding="UTF-8"?>\n\t<workspaceFilter version="1.0">\n';
        if (filters) {
            for (var i = 0; i < filters.length; i++) {
                filter = filters[i];
                if (remotePath !== '/' && remotePath.indexOf(filter.root) === 0 && remotePath.length > filter.root.length) {
                    // we're syncing something which is below a filter
                    if (remotePath.endsWith('/.content.xml')) {
                        remotePath = remotePath.substring(0, remotePath.length - 13);
                    } else if (remotePath.endsWith('_cq_editConfig.xml')) {
                        remotePath = remotePath.substring(0, remotePath.length - 4);
                    }
                    remotePath = remotePath.replace(/\/_cq_/g, '/cq:');
                    filterString += '<filter root="' + remotePath + '"/>';
                } else {
                    // we're either syncing a full content package (remotePath is /) or something that matches a filter exactly
                    filterString += '<filter root="' + filter.root + '">';
                    for (ri = 0; ri < filter.rules.length; ri++) {
                        rule = filter.rules[ri];
                        filterString += '<' + rule.type + ' pattern="' + rule.pattern.source + '"/>';
                    }
                    filterString += '</filter>';
                }
            }
        }
        filterString += '</workspaceFilter>';

        return Fs.mkdirp(tempWorkingDirectory + Path.sep + 'META-INF' + Path.sep + 'vault').then(
            function () {
                return Fs.mkdirp(tempWorkingDirectory + Path.sep + JCR_ROOT);
            }
        ).then(
            function () {
                return Fs.appendFile(
                        tempWorkingDirectory + Path.sep + 'META-INF' + Path.sep + 'vault' + Path.sep + 'filter.xml',
                    filterString
                );
            }
        ).then(
            function () {
                return Fs.appendFile(
                        tempWorkingDirectory + Path.sep + 'META-INF' + Path.sep + 'vault' + Path.sep + 'properties.xml',
                        '\
<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n\
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">\n\
<properties>\n\
<entry key="name">' + packageName + '</entry>\n\
<entry key="version">' + packageVersion + '</entry>\n\
<entry key="group">' + packageGroup + '</entry>\n\
</properties>\n'
                );
            }
        );
    }

    /**
     * Builds a list of files that can be synchronised according to the defined <code>filters</code> and <code>excludePatterns</code>.
     *
     * @param {Array.<Filter>} filters the Apache Jackrabbit FileVault filter rules (see #parseFilterXML)
     * @param {Object} vaultIgnore the vaultIgnore object obtained from {VaultIgnore#compile}
     * @param {String} file the path of a file from the file system
     * @return {promise|Q.promise} a promise resolved with an object containing the pre-sync status; the object's direct properties are
     * file paths storing objects like {filter: Filter, result: Number, remoteFilePath: String} or {result: Number, remoteFilePath: String}
     */
    function buildSyncStatusList(filters, vaultIgnore, file) {
        var deferred = Q.defer(),
            fileSyncStatus = {},
            i;
        getFolderContents(file).then(
            function (contents) {
                var remotePath = getRemotePath(file),
                    remoteFilePath,
                    cfile;
                for (var ci = 0; ci < contents.length; ci++) {
                    cfile = contents[ci];
                    remoteFilePath = getRemotePath(cfile);
                    for (i = 0; i < filters.length; i++) {
                        var filter = filters[i];
                        var syncStatus = filter.getSyncStatus(remoteFilePath);
                        if (syncStatus === Constants.sync.FILTER_INCLUDED) {
                            // short-circuit: if a filter marks a path as included no other filter can exclude it
                            fileSyncStatus[remoteFilePath] = {filter: filter, result: syncStatus};
                            break;
                        } else {
                            if (fileSyncStatus[remoteFilePath]) {
                                if (fileSyncStatus[remoteFilePath].result === Constants.sync.FILTER_IGNORED) {
                                    fileSyncStatus[remoteFilePath].result = syncStatus;
                                }
                            } else {
                                fileSyncStatus[remoteFilePath] = {filter: filter, result: syncStatus};
                            }
                        }
                    }
                    if (fileSyncStatus[remoteFilePath] && fileSyncStatus[remoteFilePath].result === Constants.sync.FILTER_INCLUDED) {
                        var relPath = Path.relative(remotePath, remoteFilePath);
                        if (vaultIgnore.denies(relPath)) {
                            fileSyncStatus[remoteFilePath] = {result: Constants.sync.EXCLUDED};
                        }
                    }
                }
                deferred.resolve(fileSyncStatus);
            },
            function (err) {
                deferred.reject(err);
            }
        ).done();
        return deferred.promise;
    }

    function copyFilter(file, fileSyncStatus) {
        var remotePath = getRemotePath(file);
        var entry = fileSyncStatus[remotePath];
        if (entry && entry.result === Constants.sync.FILTER_INCLUDED) {
            return true;
        }
        for (var f in fileSyncStatus) {
            if (fileSyncStatus.hasOwnProperty(f)) {
                if (remotePath.indexOf(f) === 0 || f.indexOf(remotePath) === 0) {
                    if (fileSyncStatus[f].result === Constants.sync.FILTER_INCLUDED) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Creates a zip archive from the <code>folder</code>.
     *
     * @param {String} folder the temporary working folder from which to create the archive
     * @param {String} archiveName the archive name (without the '.zip' extension)
     * @returns {promise|Q.promise}
     */
    function createContentPackageArchive(folder, archiveName) {
        var deferred = Q.defer(),
            archive = Archiver('zip'),
            archivePath = folder + Path.sep + archiveName + '.zip',
            archiveStream = Fs.createWriteStream(archivePath);

        archiveStream.on('close', function () {
            deferred.resolve(archivePath)
        });

        archive.on('error', function (err) {
            deferred.reject(err);
        });

        archive.pipe(archiveStream);
        archive.bulk([
            {
                expand: true,
                cwd: folder,
                src: ['jcr_root' + Path.sep + '**', 'META-INF' + Path.sep + '**'],
                dest: '.',
                dot: true,
                filter: function (file) {
                    return !fileIsInBasicExcludes(file);
                }
            }
        ]);
        archive.finalize();
        return deferred.promise;
    }

    function extractContentPackageArchive(folder, archiveFile) {
        var zip = new AdmZip(archiveFile),
            deferred = Q.defer();
        try {
            zip.extractAllTo(folder, true);
            deferred.resolve();
        } catch (err) {
            deferred.reject(err);
        }
        return deferred.promise;
    }

    function walkSync(dir, filelist = []) {
        Fs.readdirSync(dir).forEach(file => {
            filelist = Fs.statSync(Path.join(dir, file)).isDirectory() ?
                walkSync(Path.join(dir, file), filelist) :
                filelist.concat(Path.join(dir, file));
        });
        return filelist;
    }

    /**
     * Checks if a <code>path</code> exists on the file system.
     *
     * @param {String} path the path to check
     * @returns {promise|Q.promise} a promise
     */
    function exists(path) {
        var deferred = Q.defer();
        Fs.exists(path, function (exists) {
            exists ? deferred.resolve() : deferred.reject('File ' + path + ' does not exist');
        });
        return deferred.promise;
    }

    /**
     * Retrieves the descendants of a folder. In case the supplied path is a file the returned promise will be resolved with an array
     * containing only the file's path.
     *
     * @param {String} path the folder for which to get the descendants
     * @returns {promise|Q.promise} a promise resolved with the String array of descendant paths
     */
    function getFolderContents(path) {
        var deferred = Q.defer();
        exists(path).then(
            function () {
                var filelist = [];
                try {
                    filelist = walkSync(path, filelist);
                    deferred.resolve(filelist);
                } catch (e) {
                    // path was a file
                    filelist.push(path);
                    deferred.resolve(filelist);
                }
            },
            function (err) {
                deferred.reject(err);
            }
        ).done();
        return deferred.promise;
    }

    function getHashForFile(file) {
        var deferred = Q.defer();
        var md5sum = Crypto.createHash('md5');
        var stream = Fs.createReadStream(file);

        stream.on('data', function (chunk) {
            md5sum.update(chunk);
        });

        stream.on('end', function () {
            deferred.resolve(md5sum.digest('hex'));
        });

        stream.on('error', function (error) {
            deferred.reject(error);
        });
        return deferred.promise;
    }

    /**
     * Prepares a map of hashes for an array of {@code files}. The map's keys are the file paths relative to the supplied {@code root}.
     *
     * @param {String} root the path root for which relative paths will be generated for the map's keys
     * @param {Array.<String>} files an array of absolute file paths
     * @returns {promise|Q.promise} a promise resolved with the map of hashes
     */
    function prepareHashesForFiles(root, files) {
        var deferred = Q.defer(),
            map = {},
            promises = [],
            i;
        for (i = 0; i < files.length; i++) {
            var file = files[i];
            if (Fs.statSync(file).isFile()) {
                promises.push(getHashForFile(file));
            }
        }
        Q.allSettled(promises).then(function (results) {
            for (i = 0; i < results.length; i++) {
                var result = results[i];
                if (result.state === 'fulfilled') {
                    map[Path.relative(root, files[i])] = result.value;
                } else {
                    deferred.reject(new Error(result.reason));
                }
            }
            if (!deferred.isRejected) {
                deferred.resolve(map);
            }
        });
        return deferred.promise;
    }

    function fileIsInBasicExcludes(file) {
        var i;
        file = Path.basename(file);
        for (i = 0; i < EXCLUDES.length; i++) {
            if (file === EXCLUDES[i]) {
                return true;
            }
        }
        return false;
    }

    /**
     * Parses the Apache Jackrabbit FileVault filter file from the path provided by <code>file</code> and returns a promise resolved with an
     * array of patterns discovered in the file.
     *
     * @param {String} file the path to the filter file
     * @returns {promise|Q.promise} a promise resolved with the filters array (see {@link Filter})
     */
    function parseFilterXML(file) {
        var deferred = Q.defer();
        Fs.readFile(file).then(
            function (fileBuffer) {
                var xml = fileBuffer.toString();
                var DOMParser = XMLDom.DOMParser;
                var document = new DOMParser().parseFromString(xml);
                var filterElements = XPath.select('/workspaceFilter/filter', document);
                var filters = [];
                if (filterElements && filterElements.length && filterElements.length > 0) {
                    for (var i = 0; i < filterElements.length; i++) {
                        var filterNode = filterElements[i];
                        var root = XPath.select1('@root', filterNode);
                        if (root) {
                            var rootValue = root.value;
                            var childNodes = filterNode.childNodes;
                            var rules = [];
                            for (var j = 0; j < childNodes.length; j++) {
                                var child = childNodes[j];
                                if (child.nodeType === 1) {
                                    // we have an Element
                                    var tag = child.tagName.toLowerCase();
                                    var pattern = XPath.select1('@pattern', child);
                                    if (pattern) {
                                        if (tag === FilterRule.EXCLUDE_RULE || tag === FilterRule.INCLUDE_RULE) {
                                            rules.push(new FilterRule(tag, new RegExp(pattern.value)));
                                        } else {
                                            deferred.reject(new Error('Invalid filter - unknown element [' + tag + ']'));
                                            return;
                                        }
                                    }
                                }
                            }
                            var filter = new Filter(rootValue, rules);
                            filters.push(filter);
                        } else {
                            deferred.reject(new Error('Invalid filter - missing root attribute.'));
                            return;
                        }
                    }
                    deferred.resolve(filters);
                } else {
                    deferred.reject(new Error('Invalid filter file - unknown XML structure'));
                }
            },
            function (err) {
                deferred.reject(err);
            }
        );
        return deferred.promise;
    }

    /**
     * Synchronises the supplied file-system path path with an AEM server.
     *
     * @param {String} server the URL of the AEM server (e.g. http://localhost:4502/contextpath)
     * @param {boolean} acceptSelfSignedCert flag to indicate if self-signed certificates should be accepted or not
     * @param {String} user the user used for synchronisation
     * @param {String} password the user's password
     * @param {String} path the path on the file-system for which to perform the synchronisation operation
     * @param {String} filterFile the path to the Apache Jackrabbit FileVault filter corresponding to the synchronisation path
     * @param {String} action the synchronisation operation type (VaultSyncManager.PULL or VaultSyncManager.PUSH)
     * @returns {promise|Q.promise} a promise resolved when the synchronisation operation completed successfully
     */
    function sync(server, acceptSelfSignedCert, user, password, path, filterFile, action) {
        var deferred = Q.defer();
        path = Path.resolve(path);
        if (isPathInJCRCheckout(path)) {
            var filter = getFilter(path),
                filterFolderPath = '',
                packageName = getPackageName(filter),
                packageVersion = getPackageVersion(),
                fullPackageName = 'tmp/repo' + '/' + packageName + '-' + packageVersion + '.zip',
                filters = [],
                fileSyncStatus = {},
                remotePath = getRemotePath(path),
                pathsFromRemote = {},
                acceptSelfSigned = acceptSelfSignedCert || false,
                vaultIgnore;
            parseFilterXML(filterFile).then(
                function (_filters) {
                    filters = _filters;
                }
            ).then(
                function () {
                    getTempWorkingFolder().then(
                        function (tempFolder) {
                            return getFilterFolderPath(path).then(
                                function (ffp) {
                                    filterFolderPath = ffp;
                                }
                            ).then(
                                function () {
                                    return Fs.mkdirp(tempFolder + Path.sep + JCR_ROOT + filterFolderPath);
                                }
                            ).then(
                                function () {
                                    return writeExcludes(path, tempFolder + Path.sep + '.excludes');
                                }
                            ).then(
                                function (excludesFilePath) {
                                    if (action === PUSH) {
                                        vaultIgnore = VaultIgnoreParser.compile(Fs.readFileSync(excludesFilePath, 'utf8'));
                                        return buildSyncStatusList(filters, vaultIgnore, path).then(
                                            function (_fileSyncStatus) {
                                                fileSyncStatus = _fileSyncStatus;
                                            }
                                        ).then(
                                            function () {
                                                return exists(path).then(
                                                    function () {
                                                        return Fs.copy(
                                                            path,
                                                            tempFolder + Path.sep + JCR_ROOT + Path.sep +
                                                                (filterFolderPath === filter ? filterFolderPath : filter),
                                                                {
                                                                    filter: function (file) {
                                                                        return copyFilter(file, fileSyncStatus);
                                                                    }
                                                            }

                                                        );
                                                    }
                                                );
                                            }
                                        ).then(
                                            function () {
                                                return Fs.remove(tempFolder + Path.sep + '.excludes');
                                            }
                                        ).then(
                                            function () {
                                                var filterSyncStatusFilters = {},
                                                    filters = [],
                                                    syncPath,
                                                    f;
                                                // we need to get the set of filters for what we're pushing
                                                for (syncPath in fileSyncStatus) {
                                                    if (fileSyncStatus.hasOwnProperty(syncPath)) {
                                                        var entry = fileSyncStatus[syncPath];
                                                        if (entry.result && entry.filter instanceof Filter) {
                                                            f = entry.filter;
                                                            filterSyncStatusFilters[f.root] = f;
                                                        }
                                                    }
                                                }
                                                for (syncPath in filterSyncStatusFilters) {
                                                    if (filterSyncStatusFilters.hasOwnProperty(syncPath)) {
                                                        filters.push(filterSyncStatusFilters[syncPath]);
                                                    }
                                                }
                                                return createPackageMetaInf(tempFolder, remotePath, filters, 'tmp/repo', packageName,
                                                    packageVersion.toString());
                                            }
                                        ).then(
                                            function () {
                                                return createContentPackageArchive(tempFolder, 'pkg');
                                            }
                                        ).then(
                                            function (zipFileName) {
                                                return PackMgr.uploadPackage(server, acceptSelfSigned, user, password, zipFileName).then(
                                                    function () {
                                                        return PackMgr.installPackage(server, acceptSelfSigned, user, password, fullPackageName).then(
                                                            function () {
                                                                return PackMgr.deletePackage(server, acceptSelfSigned, user, password, fullPackageName);
                                                            }
                                                        );
                                                    }
                                                );
                                            }
                                        ).then(
                                            function () {
                                                return Fs.remove(tempFolder);
                                            }
                                        );
                                    } else if (action === PULL) {
                                        var zipFileName = '',
                                            localHashes,
                                            tempHashes;
                                        return createPackageMetaInf(tempFolder, remotePath, filters, 'tmp/repo', packageName,
                                            packageVersion.toString()).then(
                                            function () {
                                                return createContentPackageArchive(tempFolder, 'pkg').then(
                                                    function (_zipFileName) {
                                                        zipFileName = _zipFileName;
                                                        return PackMgr.uploadPackage(server, acceptSelfSigned, user, password, zipFileName)
                                                            .then(
                                                            function () {
                                                                return PackMgr.buildPackage(server, acceptSelfSigned, user, password, fullPackageName);
                                                            }
                                                        );
                                                    }
                                                )
                                            }
                                        ).then(
                                            function () {
                                                return getTempWorkingFolder().then(
                                                    function (newTempWorkingFolder) {
                                                        return Fs.copy(
                                                                tempFolder + Path.sep + '.excludes',
                                                                newTempWorkingFolder + Path.sep + '.excludes'
                                                        ).then(
                                                            function () {
                                                                return Fs.remove(tempFolder).then(
                                                                    function () {
                                                                        tempFolder = newTempWorkingFolder;
                                                                    }
                                                                );
                                                            }
                                                        );
                                                    }
                                                );
                                            }
                                        ).then(
                                            function () {
                                                return PackMgr.downloadPackage(
                                                    server, acceptSelfSigned, user, password, fullPackageName, tempFolder, 'pkg.zip'
                                                ).then(
                                                    function (downloadedPackage) {
                                                        return PackMgr.deletePackage(server, acceptSelfSigned, user, password,
                                                            fullPackageName).then(
                                                            function () {
                                                                return extractContentPackageArchive(tempFolder,
                                                                    downloadedPackage);
                                                            }
                                                        );
                                                    }
                                                ).then(
                                                    function () {
                                                        return getFolderContents(path).then(
                                                            function (files) {
                                                                return prepareHashesForFiles(path, files).then(
                                                                    function (_hashes) {
                                                                        localHashes = _hashes;
                                                                    }
                                                                )
                                                            }
                                                        );
                                                    }
                                                ).then(
                                                    function () {
                                                        var relativeSyncPath = Path.relative(getRootPath(path), path);
                                                        var tempSyncPath = tempFolder + Path.sep + relativeSyncPath;
                                                        return getFolderContents(tempSyncPath).then(
                                                            function (files) {
                                                                return prepareHashesForFiles(tempSyncPath, files).then(
                                                                    function (_hashes) {
                                                                        tempHashes = _hashes;
                                                                    }
                                                                )
                                                            }
                                                        );
                                                    }
                                                );
                                            }
                                        ).then(
                                            function () {
                                                excludesFilePath = tempFolder + Path.sep + '.excludes';
                                                vaultIgnore = VaultIgnoreParser.compile(Fs.readFileSync(excludesFilePath, 'utf8'));
                                                return buildSyncStatusList(filters, vaultIgnore,
                                                        tempFolder + Path.sep + JCR_ROOT + filter).then(
                                                    function (_fileSyncStatus) {
                                                        fileSyncStatus = _fileSyncStatus;
                                                    }
                                                ).then(
                                                    function () {
                                                        return exists(tempFolder + Path.sep + JCR_ROOT + filter).then(
                                                            function () {
                                                                return Fs.copy(
                                                                    tempFolder + Path.sep + JCR_ROOT + filter,
                                                                    path,
                                                                    {
                                                                        filter: function (file) {
                                                                            var rPath = getRemotePath(file);
                                                                            var relativePath = Path.relative(tempFolder + Path.sep + JCR_ROOT, file);
                                                                            if (copyFilter(file, fileSyncStatus)) {
                                                                                pathsFromRemote[rPath] = true;
                                                                                var tempHash = tempHashes[relativePath];
                                                                                var localHash = localHashes[relativePath];
                                                                                if (localHash) {
                                                                                    return !(localHash === tempHash);
                                                                                }
                                                                                return true;
                                                                            }
                                                                            return false;
                                                                        }
                                                                    }

                                                                );
                                                            },
                                                            function (err) {
                                                                /**
                                                                 * if the file-system entry doesn't exist it means that it might have got
                                                                 * deleted on the server; do nothing
                                                                 */
                                                            }
                                                        );
                                                    }
                                                ).then(
                                                    function () {
                                                        return buildSyncStatusList(filters, vaultIgnore, path).then(
                                                            function (_localFileSyncStatus) {
                                                                return getFolderContents(path).then(
                                                                    function (files) {
                                                                        var i,
                                                                            file,
                                                                            rPath;
                                                                        var foldersToDelete = [];
                                                                        for (i = 0; i < files.length; i++) {
                                                                            file = files[i];
                                                                            rPath = getRemotePath(file);
                                                                            if (!pathsFromRemote[rPath] && vaultIgnore.accepts(rPath.slice(1))) {
                                                                                if (!fileIsInBasicExcludes(file)) {
                                                                                    if (_localFileSyncStatus[rPath] !== undefined &&
                                                                                        _localFileSyncStatus[rPath].result !== Constants.sync.FILTER_IGNORED &&
                                                                                        _localFileSyncStatus[rPath].result !== Constants.sync.FILTER_EXCLUDED
                                                                                    ) {
                                                                                        fileSyncStatus[rPath] = {
                                                                                            path: file,
                                                                                            result: Constants.sync.DELETED_FROM_REMOTE
                                                                                        };
                                                                                        Fs.removeSync(file);
                                                                                        if (Path.basename(file) === '.content.xml') {
                                                                                            foldersToDelete.push(Path.dirname(file));
                                                                                        }
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                        for (i = 0; i < foldersToDelete.length; i++) {
                                                                            Fs.removeSync(foldersToDelete[i]);
                                                                        }
                                                                    }
                                                                );
                                                            }
                                                        );
                                                    }
                                                ).then(
                                                    function () {
                                                        return Fs.remove(tempFolder);
                                                    }
                                                );
                                            }
                                        );
                                    }
                                }
                            );
                        }
                    ).then(
                        function () {
                            var syncResult = [];
                            for (var key in fileSyncStatus) {
                                if (fileSyncStatus.hasOwnProperty(key)) {
                                    var entry = fileSyncStatus[key];
                                    syncResult.push({path: key, result: entry.result});
                                }
                            }
                            deferred.resolve(syncResult);
                        },
                        function (err) {
                            if (err instanceof Array) {
                                if (err.length > 0) {
                                    deferred.reject(err[0]);
                                }
                            }
                            deferred.reject(new Error('Unable to ' + action + ' content for ' + path + ': ' + err.message));
                        }
                    ).done();
                }
            ).done();
        } else {
            deferred.reject(new Error('Path ' + path + ' does not seem to belong to a JCR checkout.'));
        }
        return deferred.promise;
    }

    exports.sync = sync;
    exports.PULL = PULL;
    exports.PUSH = PUSH;
}());
