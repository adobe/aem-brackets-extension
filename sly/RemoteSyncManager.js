/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/
/*global define, brackets, $*/
define(function (require, exports, module) {
    'use strict';
    var DocumentManager         = brackets.getModule('document/DocumentManager'),
        FileSystem              = brackets.getModule('filesystem/FileSystem'),
        ExtensionUtils          = brackets.getModule('utils/ExtensionUtils'),
        FileUtils               = brackets.getModule('file/FileUtils'),
        NodeDomain              = brackets.getModule('utils/NodeDomain'),
        CommandManager          = brackets.getModule('command/CommandManager'),
        ProjectManager          = brackets.getModule('project/ProjectManager'),
        Menus                   = brackets.getModule('command/Menus'),
        NativeApp               = brackets.getModule('utils/NativeApp'),
        SlyDomain               = new NodeDomain('sly', ExtensionUtils.getModulePath(module, 'node/SlyDomain')),
        Preferences             = require('sly/preferences/Preferences'),
        ProjectUtils            = require('sly/ProjectUtils'),
        ToolBar                 = require('sly/toolbar/ToolBar'),
        Panel                   = require('sly/panel/Panel'),
        fileMTimeCache          = require('sly/FileMTimeCache'),
        Strings                 = require('strings'),
        CMD_PUSH_REMOTE = 'sly-push-remote',
        CMD_PULL_REMOTE = 'sly-pull-remote',
        CMD_OPEN_REMOTE = 'sly-open-remote',
        contextMenuDivider,
        neighbours;

    function _uploadSlingDependencies() {
        var slingPath = FileUtils.getNativeModuleDirectoryPath(module) + '/../sling/',
            slingDir  = FileSystem.getDirectoryForPath(slingPath);
        if (slingDir) {
            slingDir.getContents(function (err, contents) {
                console.log('updating sling remote with ' + contents);
                if (contents && contents.length > 0) {
                    contents.forEach(function (file) {
                        SlyDomain.exec('postFile', '/apps/system/install', file.fullPath).fail(
                            function(err) {
                                ToolBar.updateStatusIndicator(true, ToolBar.states.SYNC_NONE, 'Error', 'Error uploading Sling dependencies. ' + err);
                            }
                        );
                    });
                }
            });
        }
    }

    function _handleSyncToRemote(path) {
        var cmd      = Preferences.get('pushCommand'),
            selected = ProjectManager.getSelectedItem(),
            pathToSync;
        if (selected === null && path === undefined) {
            return;
        } else {
            pathToSync = path || selected.fullPath;
        }
        if (!cmd) {
            ProjectUtils.getJcrRoot().then(
                function (root) {
                    if (root && pathToSync.indexOf(root) === 0) {
                        ProjectUtils.getFilterFile().then(
                            function (filterFile) {
                                ToolBar.updateStatusIndicator(true, ToolBar.states.SYNC_IN_PROGRESS);
                                return SlyDomain.exec('pushVault', pathToSync, filterFile).then(
                                    function (fileSyncStatus) {
                                        _calculateSyncStatus(fileSyncStatus, false);
                                    },
                                    function (err) {
                                        ToolBar.updateStatusIndicator(true, ToolBar.states.SYNC_NONE, 'Error', err);
                                    }
                                );
                            },
                            function (err) {
                                ToolBar.updateStatusIndicator(true, ToolBar.states.SYNC_NONE, 'Error', err.message);
                            }
                        ).done();
                    }
                },
                function (err) {
                    ToolBar.updateStatusIndicator(true, ToolBar.states.SYNC_NONE, 'Error', err.message);
                }
            ).done();
        } else {
            SlyDomain.exec('syncChildProcess', cmd, selected.fullPath).done();
        }
    }

    function _handleSyncFromRemote(path) {
        var cmd      = Preferences.get('pullCommand'),
            selected = ProjectManager.getSelectedItem(),
            pathToSync;
        if (selected === null && path === undefined) {
            return;
        } else {
            pathToSync = path || selected.fullPath;
        }
        if (!cmd) {
            ProjectUtils.getJcrRoot().then(
                function (root) {
                    if (root && pathToSync.indexOf(root) === 0) {
                        ProjectUtils.getFilterFile().then(
                            function (filterFile) {
                                ToolBar.updateStatusIndicator(true, ToolBar.states.SYNC_IN_PROGRESS);
                                return SlyDomain.exec('pullVault', pathToSync, filterFile).then(
                                    function (fileSyncStatus) {
                                        _calculateSyncStatus(fileSyncStatus, true);
                                    },
                                    function (err) {
                                        ToolBar.updateStatusIndicator(true, ToolBar.states.SYNC_NONE, 'Error', err);
                                    }
                                );
                            },
                            function (err) {
                                ToolBar.updateStatusIndicator(true, ToolBar.states.SYNC_NONE, 'Error', err.message);
                            }
                        ).done();
                    }

                },
                function (err) {
                    ToolBar.updateStatusIndicator(true, ToolBar.states.SYNC_NONE, 'Error', err.message);
                }
            ).done();
        } else {
            SlyDomain.exec('syncChildProcess', cmd, selected.fullPath).done();
        }
    }

    function _handleOpenRemote(path) {
        var selected = ProjectManager.getSelectedItem(),
            pathToOpen;
        if (selected === null && path === undefined) {
            return;
        } else {
            pathToOpen = path || selected.fullPath;
        }
        ProjectUtils.getJcrRoot().then(
            function (root) {
                pathToOpen = pathToOpen.replace(root, '');              // remove path up to JCR root, keep starting slash
                pathToOpen = pathToOpen.replace(/\.content\.xml$/, ''); // get parent instead of .content.xml
                pathToOpen = pathToOpen.replace(/\/*$/, '.html');       // replace trailing slashes with .html
                var url = Preferences.getRemote().replace(/\/*$/,'') + '/' + pathToOpen.replace(/\\/, '');
                NativeApp.openURLInDefaultBrowser(url);
            });
    }

    function _calculateSyncStatus(fileSyncStatus, imported) {
        if (fileSyncStatus instanceof Array) {
            var syncedFiles = 0;
            for (var i = 0; i < fileSyncStatus.length; i++) {
                var result = fileSyncStatus[i].result;
                var status = '';
                switch (result) {
                    case 1:
                        syncedFiles++;
                        if (imported) {
                            status = Strings.SYNC_STATUS_IMPORTED;
                        } else {
                            status = Strings.SYNC_STATUS_EXPORTED;
                        }
                        fileMTimeCache.put(fileSyncStatus[i].path, new Date());
                        break;
                    case 0:
                        status = Strings.SYNC_STATUS_IGNORED;
                        break;
                    case -1:
                        status = Strings.SYNC_STATUS_EXCLUDED;
                        break;
                    case -2:
                        status = Strings.SYNC_STATUS_EXCLUDED_VLT;
                        break;
                    case -3:
                        syncedFiles++;
                        status = Strings.SYNC_STATUS_DELETED_FROM_REMOTE;
                        break;
                }
                console.log('Path ' + fileSyncStatus[i].path + ' was ' + status);
                Panel.append({path: fileSyncStatus[i].path, status: status, time: new Date().toLocaleString()});
            }
            if (syncedFiles === 0) {
                ToolBar.updateStatusIndicator(true, ToolBar.states.SYNC_NONE);
            } else if (syncedFiles === fileSyncStatus.length) {
                ToolBar.updateStatusIndicator(true, ToolBar.states.SYNC_FULL);
            } else {
                ToolBar.updateStatusIndicator(true, ToolBar.states.SYNC_PARTIAL);
            }
        }
    }

    /* return neighbours of a given doc in the hierarchy */
    function findNeighbours(doc) {
        var dfd = $.Deferred();
        if (!neighbours || neighbours.currentDoc !== doc) {
            neighbours = {
                currentDoc: doc,
                paths: []
            };
            var path = doc.file.fullPath,
                parentPath = path.substring(0, path.lastIndexOf('/')),
                parentDir = FileSystem.getDirectoryForPath(parentPath);
            parentDir.getContents(function (err, contents) {
                if (contents && contents.length > 0) {
                    contents.forEach(function (file) {
                        if (file.fullPath !== path) {
                            neighbours.paths.push(file.fullPath);
                        }
                    });
                    dfd.resolve(neighbours.paths);
                } else {
                    dfd.reject('not able to find ' + path + ' neighbours');
                }
            });
        } else {
            dfd.done(neighbours.paths);
        }
        return dfd;
    }

    function exportContentPackage() {
        ProjectUtils.getJcrRoot().then(
            function (root) {
                CommandManager.get(CMD_PUSH_REMOTE).execute(root);
            },
            function (err) {
                ToolBar.updateStatusIndicator(true, ToolBar.states.SYNC_NONE, 'Error', err.message);
            }
        ).done();
    }

    function importContentPackage() {
        ProjectUtils.getJcrRoot().then(
            function (root) {
                CommandManager.get(CMD_PULL_REMOTE).execute(root);
            },
            function (err) {
                ToolBar.updateStatusIndicator(true, ToolBar.states.SYNC_NONE, 'Error', err.message);
            }
        ).done();
    }

    function _toggleSyncContextMenu(toggle) {
        CommandManager.get(CMD_PULL_REMOTE).setEnabled(toggle);
        CommandManager.get(CMD_PUSH_REMOTE).setEnabled(toggle);
        CommandManager.get(CMD_OPEN_REMOTE).setEnabled(toggle);
    }

    function _enableOrDisableContextMenu(toggle) {
        var project_cmenu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU);
        if (toggle) {
            contextMenuDivider = project_cmenu.addMenuDivider();
            project_cmenu.addMenuItem(CMD_PUSH_REMOTE);
            project_cmenu.addMenuItem(CMD_PULL_REMOTE);
            project_cmenu.addMenuItem(CMD_OPEN_REMOTE);
        } else {
            if (contextMenuDivider) {
                project_cmenu.removeMenuDivider(contextMenuDivider.id);
                project_cmenu.removeMenuItem(CMD_PUSH_REMOTE);
                project_cmenu.removeMenuItem(CMD_PULL_REMOTE);
                project_cmenu.removeMenuItem(CMD_OPEN_REMOTE);
                contextMenuDivider = undefined;
            }
        }

    }

    function load(SLYDictionary) {
        _uploadSlingDependencies();
        CommandManager.register(Strings.CONTEXTUAL_PULL_REMOTE, CMD_PULL_REMOTE, _handleSyncFromRemote);
        CommandManager.register(Strings.CONTEXTUAL_PUSH_REMOTE, CMD_PUSH_REMOTE, _handleSyncToRemote);
        CommandManager.register(Strings.CONTEXTUAL_OPEN_REMOTE, CMD_OPEN_REMOTE, _handleOpenRemote);
        var project_cmenu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU);
        $(project_cmenu).on('beforeContextMenuOpen', function () {
            ProjectUtils.getJcrRoot().then(
                function (root) {
                    var selected = ProjectManager.getSelectedItem();
                    if (!contextMenuDivider) {
                        _enableOrDisableContextMenu(true);
                    }
                    if (!selected) {
                        _toggleSyncContextMenu(false);
                    }
                    if (selected.fullPath.indexOf(root) === 0) {
                        _toggleSyncContextMenu(true);
                    } else {
                        _toggleSyncContextMenu(false);
                    }
                },
                function (err) {
                    _enableOrDisableContextMenu(false);
                }
            ).done();
        });

        FileSystem.on('change', _handleFileSystemChange);

    }

    function _handleFileSystemChange(event, mainEntry, addedEntries, removedEntries) {
        if (!Preferences.getAutoSync()) {
            return;
        }
        ProjectUtils.getJcrRoot().then(
            function (jcrRoot) {
                if (mainEntry !== null && mainEntry.fullPath.indexOf(jcrRoot) === 0) {
                    console.log("Detected change in JCR root", mainEntry.fullPath);
                    var filesModified = false;
                    filesModified = _checkAddedEntries(addedEntries, jcrRoot) ||
                            _checkRemovedEntries(removedEntries, jcrRoot);
                    mainEntry.visit(function (subEntry) {
                        if (filesModified) {
                            return false; // already have one change, stop stat-ing files
                        }
                        if (subEntry.isDirectory) {
                            return true; // visit subfiles
                        }
                        var relPath = subEntry.fullPath.replace(jcrRoot, '/');
                        subEntry.stat(function (error, stats) {
                            var lastImported = fileMTimeCache.get(relPath);
                            if (!lastImported || lastImported < stats.mtime) {
                                console.log(relPath + " is changed since last import/export");
                                filesModified = true;
                            }
                        });
                        return true; // continue visiting
                    }, {}, function (error) {
                        if (error === null) {
                            if (!filesModified) {
                                console.log("No files changed since last import. Nothing to do here!");
                                return;
                            }
                            if (mainEntry.isFile && mainEntry.name === '.content.xml') {
                                _handleSyncToRemote(mainEntry.parentPath);
                            } else {
                                _handleSyncToRemote(mainEntry.fullPath);
                            }
                        } else {
                            console.error(error);
                        }
                    });
                }
            }
        ).done();
    }

    function _checkAddedEntries(addedEntries, jcrRoot) {
        if (addedEntries && addedEntries.length > 0) {
            for (var i = 0; i < addedEntries.length; i++) {
                var relPath = addedEntries[i].fullPath.replace(jcrRoot, '/');
                if (!fileMTimeCache.get(relPath)) {
                    console.log("File added since last import/export", relPath);
                    return true;
                }
            }
        }
        return false;
    }

    function _checkRemovedEntries(removedEntries, jcrRoot) {
        if (removedEntries && removedEntries.length > 0) {
            for (var i = 0; i < removedEntries.length; i++) {
                var relPath = removedEntries[i].fullPath.replace(jcrRoot, '/');
                if (fileMTimeCache.get(relPath)) {
                    console.log("File removed since last import/export", relPath);
                    return true;
                }
            }
        }
        return false;
    }

    exports.load = load;
    exports.findNeighbours = findNeighbours;
    exports.importContentPackage = importContentPackage;
    exports.exportContentPackage = exportContentPackage;
});
