/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/
/*global define,brackets,$*/
define(function (require, exports, module) {
    'use strict';

    var ProjectManager = brackets.getModule('project/ProjectManager'),
        FileSystem = brackets.getModule('filesystem/FileSystem');

    /**
     * Retrieves the absolute path to the <code>jcr_root</code> folder from the opened content-package project.
     *
     * @returns {promise|String} a promise resolved with the absolute path to the <code>jcr_root</code> folder of the project or a blank string if there is no jcr_root
     */
    function getJcrRoot() {
        var deferred = $.Deferred();
        getFolderContents(ProjectManager.getProjectRoot().fullPath).then(
            function (entries) {
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    if (entry.name === 'jcr_root') {
                        deferred.resolve(entry.fullPath);
                        break;
                    }
                }
                deferred.resolve('');
            },
            function (err) {
                deferred.reject(err);
            }
        )
        return deferred;
    }

    /**
     * Retrieves the absolute path to the <code>filter.xml</code> file from the opened content-package project.
     *
     * @returns {promise|String} a promise resolved with the absolute path to the <code>filter.xml</code> file; if the file cannot be found
     * the returned promise is rejected
     */
    function getFilterFile() {
        var deferred = $.Deferred();
        getJcrRoot().then(
            function (jcrRoot) {
                var assumedPath = jcrRoot + '../META-INF/vault/filter.xml';
                FileSystem.resolve(assumedPath, function (err, entry, stat) {
                    if (err) {
                        deferred.reject(new Error('Cannot find filter file. Reason: ' + err));
                        return;
                    }
                    if (entry.isDirectory) {
                        deferred.reject(new Error('Entry ' + entry.fullPath + ' resolved to a folder.'));
                        return;
                    }
                    deferred.resolve(entry.fullPath);
                });
            }
        ).done();
        return deferred;
    }

    /**
     * Generates the remote path of file from the current opened content-package project.
     *
     * @param {String} filePath the path to the local file
     * @returns {promise|String} a promise resolved with the remote path
     */
    function getRemotePathForFile(filePath) {
        var deferred = $.Deferred();
        getJcrRoot().then(
            function (root) {
                if (filePath.indexOf(root) === 0) {
                    var remotePath = filePath.substring(root.length - 1);
                    if (/^.*\.content\.xml$/.test(remotePath)) {
                        remotePath = remotePath.substring(0, remotePath.lastIndexOf('/'));
                    }
                    deferred.resolve(remotePath);
                } else {
                    deferred.reject(new Error('File ' + filePath + ' is outside of jcr_root folder ' + root));
                }
            }
        );
        return deferred;
    }

    /**
     * Gets the content of a <code>folder</code>. If the supplied path is a file the returned array will contain just the FileSystemEntry
     * for that path.
     *
     * @param {String} folder the path to a folder
     * @returns {promise|Array.<FileSystemEntry>} a promise resolved with the contents of the folder as an array of FileSystemEntry elements
     */
    function getFolderContents(folder) {
        var deferred = $.Deferred();
        FileSystem.resolve(folder, function (err, entry, stat) {
            if (err) {
                deferred.reject(new Error('Cannot find file system entry for file ' + folder + '. Reason: ' + err));
                return;
            }  else {
                var contents = [];
                entry.visit(
                    function (entry) {
                        contents.push(entry);
                        return true;
                    },
                    function (err) {
                        if (err) {
                            deferred.reject(new Error('Error visiting descendant of ' + folder + '. Reason: ' + err));
                        } else {
                            deferred.resolve(contents);
                        }
                    }
                );
            }
        });
        return deferred;
    }

    exports.getJcrRoot = getJcrRoot;
    exports.getFilterFile = getFilterFile;
    exports.getRemotePathForFile = getRemotePathForFile;
    exports.getFolderContents = getFolderContents;

});
