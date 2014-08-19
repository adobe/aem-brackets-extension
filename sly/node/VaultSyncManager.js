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
        mkdir = Q.denodeify(Fs.mkdir),
        mkdirp = Q.denodeify(Fs.mkdirs),
        copy = Q.denodeify(Fs.copy),
        remove = Q.denodeify(Fs.remove),
        appendFile = Q.denodeify(Fs.appendFile),
        readFile = Q.denodeify(Fs.readFile),
        glob = Q.denodeify(Glob),
        stat = Q.denodeify(Fs.stat);

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
        stat(path).then(
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
                mkdir(temporaryWorkingFolder, '0755').done();
                return temporaryWorkingFolder;
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
        appendFile(excludesFilePath, '')
            .then(
            function () {
                return appendFile(excludesFilePath, EXCLUDES.join('\n')).then(appendFile(excludesFilePath, '\n'));
            }
        ).then(
            function () {
                return exists(rootPath + VLTIGNORE).then(
                    function () {
                        readFile(rootPath + VLTIGNORE).then(
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
                                appendFile(excludesFilePath, ignores.join('\n')).done();
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
                    return readFile(file).then(
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
                            return appendFile(excludesFilePath, ignores.join('\n'));
                        }
                    );
                }

                glob('**/' + VLTIGNORE, {cwd: searchFolder}).then(
                    function (files) {
                        var promises = [];
                        for (var i = 0; i < files.length; i++) {
                            var file = searchFolder + Path.sep + files[i];
                            var relPath = file.substring(0, file.lastIndexOf(Path.sep)).replace(path, '');
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
        ).done();
        return deferred.promise;
    }

    /**
     * Checks if a remote path is allowed for synchronisation by the filters defined in the filter file.
     *
     * @param {String} remotePath the remote path
     * @param {Filter[]} filters the filters array
     * @returns {Boolean} <code>true</code> if the path is allowed to be synced, <code>false</code> otherwise
     * @see parseFilterXML
     */
    function remotePathAllowedByFilters(remotePath, filters) {
        for (var i = 0; i < filters.length; i++) {
            var filter = filters[i];
            var syncStatus = filter.getSyncStatus(remotePath);
            if (syncStatus === Constants.sync.FILTER_INCLUDED) {
                return true;
            }
        }
        return false;
    }

    /**
     * Creates the meta-inf file structure for the content package that will be uploaded.
     *
     * @param {String} tempWorkingDirectory the random unique temporary folder
     * @param {String} filter the content package's filter
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

        return mkdirp(tempWorkingDirectory + Path.sep + 'META-INF' + Path.sep + 'vault').then(
            function () {
                return mkdirp(tempWorkingDirectory + Path.sep + JCR_ROOT);
            }
        ).then(
            function () {
                return appendFile(
                        tempWorkingDirectory + Path.sep + 'META-INF' + Path.sep + 'vault' + Path.sep + 'filter.xml',
                    filterString
                );
            }
        ).then(
            function () {
                return appendFile(
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
     * @param {Filter[]} filters the Apache Jackrabbit FileVault filter rules (see #parseFilterXML)
     * @param {Array} excludesPatterns an patterns array (all the patterns should be valid RegEx objects)
     * @param {String} file the path of a file from the file system
     * @return {promise|Q.promise} a promise resolved with an object containing the pre-sync status; the object's direct properties are
     * file paths storing objects like {filter: Filter, result: Number, remoteFilePath: String} or {result: Number, remoteFilePath: String}
     */
    function buildSyncStatusList(filters, excludesPatterns, file) {
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
                    var relPath = Path.relative(remotePath, remoteFilePath);
                    for (i = 0; i < filters.length; i++) {
                        var filter = filters[i];
                        var syncStatus = filter.getSyncStatus(remoteFilePath);
                        if (Path.basename(cfile) === '.content.xml' &&
                            (remoteFilePath.indexOf(filter.root) === 0 || filter.root.indexOf(Path.dirname(remoteFilePath)) === 0)) {
                            syncStatus = Constants.sync.FILTER_INCLUDED;
                        }
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
                        for (i = 0; i < excludesPatterns.length; i++) {
                            var pattern = excludesPatterns[i];
                            // for windows replace any path separators with /
                            if (pattern.test(Path.basename(remoteFilePath)) || pattern.test(relPath)) {
                                fileSyncStatus[remoteFilePath] = {result: -2};
                            }
                        }
                    }
                }
                deferred.resolve(fileSyncStatus);
            }
        ).done();
        return deferred.promise;
    }

    /**
     * Reads an excludes file and generates a patterns array that can be used to match files.
     *
     * @param {String} excludesFile the path to the excludes file
     * @returns {promise|Q.promise} an array containing a pattern for each line of the excludes file
     */
    function excludesPatternsGenerator(excludesFile) {
        var deferred = Q.defer();
        readFile(excludesFile).then(
            function (fileContents) {
                var result = [],
                    lines = fileContents.toString().split('\n');
                lines.forEach(function (line) {
                    if (line) {
                        result.push(
                            new RegExp('^' + line.replace(/\\/g, '\\\\').replace(/\./g, '\\.').replace(/\*/g, '.*') + '(\\.dir)?$')
                        );
                    }
                });
                deferred.resolve(result);
            },
            function (error) {
                deferred.reject(new Error(error));
            }
        ).done();
        return deferred.promise;
    }

    function copyFilter(file, fileSyncStatus) {
        var remotePath = getRemotePath(file);
        for (var f in fileSyncStatus) {
            if (fileSyncStatus.hasOwnProperty(f)) {
                var entry = fileSyncStatus[f];
                if (remotePath.indexOf(f) === 0 || f.indexOf(remotePath) === 0) {
                    if (entry.result === Constants.sync.FILTER_INCLUDED) {
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
        var zip = new AdmZip(),
            zipFileName = folder + Path.sep + archiveName + '.zip',
            deferred = Q.defer();
        try {
            zip.addLocalFolder(folder, '');
            zip.writeZip(zipFileName);
            deferred.resolve(zipFileName);
        } catch (err) {
            deferred.reject(err);
        }
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

    /**
     * This recursive function walks over the descendants of a folder.
     *
     * @param {String} dir the folder to walk
     * @param {Function} callback a Node-style errback function which will receive a String array of descendant paths; in case the supplied
     * <code>dir</code> path is a file, the array will contain only the file's path
     */
    function walk(dir, callback) {
        var results = [];
        Fs.stat(dir, function (err, stat) {
            if (err) {
                callback(err);
            }
            if (!stat.isDirectory()) {
                results.push(dir);
                callback(null, results);
            } else {
                Fs.readdir(dir, function (err, list) {
                    if (err) {
                        callback(err);
                    }
                    var pending = list.length;
                    if (!pending) {
                        results.push(dir);
                        callback(null, results);
                    }
                    list.forEach(function (file) {
                        file = Path.normalize(dir + Path.sep + file);
                        Fs.stat(file, function (err, stat) {
                            if (stat && stat.isDirectory()) {
                                walk(file, function (err, res) {
                                    results = results.concat(res);
                                    if (!--pending) {
                                        callback(null, results);
                                    }
                                });
                            } else {
                                results.push(file);
                                if (!--pending) {
                                    callback(null, results);
                                }
                            }
                        });
                    });
                });
            }
        });
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
     * @param {String} folder the folder for which to get the descendants
     * @returns {promise|Q.promise} a promise resolved with the String array of descendant paths
     */
    function getFolderContents(folder) {
        var deferred = Q.defer();
        exists(folder).then(
            function () {
                walk(folder, function (err, results) {
                    if (err) {
                        deferred.reject(err);
                    }
                    deferred.resolve(results);
                });
            },
            function (err) {
                deferred.resolve([]);
            }
        ).done();
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
        readFile(file).then(
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
     * @param {String} user the user used for synchronisation
     * @param {String} password the user's password
     * @param {String} path the path on the file-system for which to perform the synchronisation operation
     * @param {String} filterFile the path to the Apache Jackrabbit FileVault filter corresponding to the synchronisation path
     * @param {String} action the synchronisation operation type (VaultSyncManager.PULL or VaultSyncManager.PUSH)
     * @returns {promise|Q.promise} a promise resolved when the synchronisation operation completed successfully
     */
    function sync(server, user, password, path, filterFile, action) {
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
                pathsFromRemote = {};
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
                                    return mkdirp(tempFolder + Path.sep + JCR_ROOT + filterFolderPath);
                                }
                            ).then(
                                function () {
                                    return writeExcludes(path, tempFolder + Path.sep + '.excludes');
                                }
                            ).then(
                                function (excludesFilePath) {
                                    if (action === PUSH) {
                                        return excludesPatternsGenerator(excludesFilePath).then(
                                            function (excludesPatterns) {
                                                return buildSyncStatusList(filters, excludesPatterns, path).then(
                                                    function (_fileSyncStatus) {
                                                        fileSyncStatus = _fileSyncStatus;
                                                    }
                                                );
                                            }
                                        ).then(
                                            function () {
                                                return exists(path).then(
                                                    function () {
                                                        return copy(
                                                            path,
                                                                tempFolder + Path.sep + JCR_ROOT + Path.sep +
                                                                (filterFolderPath === filter ? filterFolderPath : filter),
                                                            function (file) {
                                                                return copyFilter(file, fileSyncStatus);
                                                            }
                                                        );
                                                    }
                                                );
                                            }
                                        ).then(
                                            function () {
                                                return remove(tempFolder + Path.sep + '.excludes');
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
                                                return PackMgr.uploadPackage(server, user, password, zipFileName).then(
                                                    function () {
                                                        return PackMgr.installPackage(server, user, password, fullPackageName).then(
                                                            function () {
                                                                return PackMgr.deletePackage(server, user, password, fullPackageName);
                                                            }
                                                        );
                                                    }
                                                );
                                            }
                                        ).then(
                                            function () {
                                                return remove(tempFolder);
                                            }
                                        );
                                    } else if (action === PULL) {
                                        var zipFileName = '';
                                        return createPackageMetaInf(tempFolder, remotePath, filters, 'tmp/repo', packageName,
                                            packageVersion.toString()).then(
                                            function () {
                                                return createContentPackageArchive(tempFolder, 'pkg').then(
                                                    function (_zipFileName) {
                                                        zipFileName = _zipFileName;
                                                        return PackMgr.uploadPackage(server, user, password, zipFileName)
                                                            .then(
                                                            function () {
                                                                return PackMgr.buildPackage(server, user, password, fullPackageName);
                                                            }
                                                        );
                                                    }
                                                )
                                            }
                                        ).then(
                                            function () {
                                                return getTempWorkingFolder().then(
                                                    function (newTempWorkingFolder) {
                                                        return copy(
                                                                tempFolder + Path.sep + '.excludes',
                                                                newTempWorkingFolder + Path.sep + '.excludes'
                                                        ).then(
                                                            function () {
                                                                return remove(tempFolder).then(
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
                                                    server, user, password, fullPackageName, tempFolder, 'pkg.zip'
                                                ).then(
                                                    function (downloadedPackage) {
                                                        return PackMgr.deletePackage(server, user, password,
                                                            fullPackageName).then(
                                                            function () {
                                                                return extractContentPackageArchive(tempFolder,
                                                                    downloadedPackage);
                                                            }
                                                        );
                                                    }
                                                );
                                            }
                                        ).then(
                                            function () {
                                                excludesFilePath = tempFolder + Path.sep + '.excludes';
                                                return excludesPatternsGenerator(excludesFilePath).then(
                                                    function (excludesPatterns) {
                                                        return buildSyncStatusList(filters, excludesPatterns,
                                                                tempFolder + Path.sep + JCR_ROOT + filter).then(
                                                            function (_fileSyncStatus) {
                                                                fileSyncStatus = _fileSyncStatus;
                                                            }
                                                        );
                                                    }
                                                ).then(
                                                    function () {
                                                        return exists(tempFolder + Path.sep + JCR_ROOT + filter).then(
                                                            function () {
                                                                return copy(
                                                                    tempFolder + Path.sep + JCR_ROOT + filter,
                                                                    path,
                                                                    function (file) {
                                                                        var rPath = getRemotePath(file);
                                                                        if (copyFilter(file, fileSyncStatus)) {
                                                                            pathsFromRemote[rPath] = true;
                                                                            return true;
                                                                        }
                                                                        return false;
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
                                                        var shouldDeleteLocalFiles = false,
                                                            emptyFileSyncStatus = true;
                                                        for (var f in fileSyncStatus) {
                                                            if (fileSyncStatus.hasOwnProperty(f)) {
                                                                emptyFileSyncStatus = false;
                                                                var entry = fileSyncStatus[f];
                                                                if (Path.basename(f) !== '.content.xml' &&
                                                                    entry.result !== Constants.sync.FILTER_IGNORED) {
                                                                    shouldDeleteLocalFiles = true;
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                        if (emptyFileSyncStatus) {
                                                            shouldDeleteLocalFiles = true;
                                                        }
                                                        if (shouldDeleteLocalFiles) {
                                                            getFolderContents(path).then(
                                                                function (files) {
                                                                    var i,
                                                                        file,
                                                                        rPath;
                                                                    for (i = 0; i < files.length; i++) {
                                                                        file = files[i];
                                                                        rPath = getRemotePath(file);
                                                                        if (!pathsFromRemote[rPath]) {
                                                                            if (!fileIsInBasicExcludes(file)) {
                                                                                fileSyncStatus[rPath] = {
                                                                                    path: file,
                                                                                    result: Constants.sync.DELETED_FROM_REMOTE
                                                                                }
                                                                                remove(file).done();
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            ).done();
                                                        }
                                                    }
                                                ).then(
                                                    function () {
                                                        return remove(tempFolder);
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
