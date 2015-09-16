/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/
(function () {
    'use strict';
    var Fs = require('fs'),
        Path = require('path'),
        Request = require('request'),
        VaultSyncManager = require('./VaultSyncManager'),
        _remote,
        _acceptSelfSignedCertificates = false,
        _remoteUser,
        _remotePassword,
        JCR_ROOT = 'jcr_root',
        VAULT_ROOT = Path.sep + JCR_ROOT + Path.sep;

    function _extractRemotePath(path) {
        var index = path.indexOf(VAULT_ROOT);
        if (index > 0) {
            return path.substring(index + VAULT_ROOT.length - 1);
        }
        return null;
    }

    function setRemote(remote, remoteUser, remotePassword, acceptSelfSignedCertificates) {
        _remote = remote.replace(new RegExp('/*$'), '');
        _remoteUser = remoteUser;
        _remotePassword = remotePassword;
        _acceptSelfSignedCertificates = acceptSelfSignedCertificates || false;
    }

    function _internPost(path, formData, callback) {
        var r = Request.post(
            _remote + path,
            {
                auth: {
                    user: _remoteUser,
                    pass: _remotePassword
                }
            },
            function (err, httpResponse) {
                if (err) {
                    if (err.code === 'ECONNREFUSED') {
                        callback('Connection to server ' + _remote + ' was refused.');
                    } else {
                        callback('Error posting to ' + _remote + path + '. Code:' + err.code);
                    }
                }
                if (httpResponse) {
                    var statusCode = httpResponse.statusCode;
                    if (statusCode !== 200) {
                        switch (statusCode) {
                            case 401:
                                callback('Invalid user name or password for server ' + _remote + '.');
                                break;
                            default:
                                callback('Received status code ' + statusCode + '. Expected 200.');
                        }
                    }
                }
            }
        );
        var form = r.form(),
            key;
        r.on('complete', function (result) {
            console.log(result.request.method + ' ' + formData + ' @ ' + result.request.href + ' : ' + result.request.response.statusCode);
        });
        for (key in formData) {
            if (formData.hasOwnProperty(key)) {
                form.append(key, formData[key]);
            }
        }
    }

    function postFile(parentPath, filePath, callback) {
        var formData = {
            '_charset_': 'utf-8',
            '*': Fs.createReadStream(filePath)
        };
        if (parentPath.indexOf('/install', parentPath.length - '/install'.length) !== -1) {
            // in that case we ensure node type is fulfilled in case the folder needs to be created
            formData['jcr:primaryType'] = 'nt:folder';
        }
        _internPost(parentPath, formData, callback);
    }

    function syncChildProcess(command, path, callback) {
        if (_extractRemotePath(path) !== null) {
            var execCommand = command + ' ' + path;
            require('child_process').exec(execCommand, {}, function (error, stdout, stderr) {
                console.log('stdout: ' + stdout);
                console.log('stderr: ' + stderr);
                if (error !== null) {
                    console.log('exec error: ' + error);
                    callback(error);
                }
            });
        }
    }

    function pushVault(path, filterFile, callback) {
        return VaultSyncManager.sync(_remote, _acceptSelfSignedCertificates, _remoteUser, _remotePassword, path, filterFile, VaultSyncManager.PUSH).then(
            function (fileSyncStatus) {
                callback(null, fileSyncStatus);
            },
            function (err) {
                callback(err.message);
            }
        );
    }

    function pullVault(path, filterFile, callback) {
        return VaultSyncManager.sync(_remote, _acceptSelfSignedCertificates, _remoteUser, _remotePassword, path, filterFile, VaultSyncManager.PULL).then(
            function (fileSyncStatus) {
                callback(null, fileSyncStatus);
            },
            function (err) {
                callback(err.message);
            }
        );
    }

    /**
     * Initializes the domain.
     * @param {DomainManager} domainManager The DomainManager for the server
     */
    function init(domainManager) {
        if (!domainManager.hasDomain('sly')) {
            domainManager.registerDomain('sly', {major: 0, minor: 1});
        }

        domainManager.registerCommand('sly', 'setRemote', setRemote, true, 'set remote server configuration',
            [
                {name: 'remote', type: 'string', description: 'scheme, host & port string, e.g. http://localhost:4502'},
                {name: 'remoteUser', type: 'string', description: 'remote username'},
                {name: 'remotePassword', type: 'string', description: 'remote user password'},
                {
                    name: 'acceptSelfSignedCertificates',
                    type: 'boolean',
                    description: 'indicate whether to accept self-signed certificates for HTTPS connections'
                }
            ],
            []);

        domainManager.registerCommand('sly', 'postFile', postFile, true, 'post a file to the remote',
            [{name: 'parentPath', type: 'string', description: 'path of the remote parent'},
                {name: 'filePath', type: 'string', description: 'path of the file'}],
            []);
        domainManager.registerCommand('sly', 'syncChildProcess', syncChildProcess, true, 'execute a child process',
            [{name: 'command', type: 'string', description: 'execute an alternative command for synchronizing files'},
                {name: 'path', type: 'string', description: 'path of the document/folder'}
            ],
            []);
        domainManager.registerCommand(
            'sly',
            'pushVault',
            pushVault,
            true,
            'pushes a content package with the selected files to an AEM instance',
            [
                {name: 'localPath', type: 'string', description: 'the local path of the file / folder to push'},
                {name: 'filterFile', type: 'string', description: 'the path to the project\'s filter.xml file'}
            ],
            []
        );
        domainManager.registerCommand(
            'sly',
            'pullVault',
            pullVault,
            true,
            'pulls a content tree from an AEM instance',
            [
                {name: 'remotePath', type: 'string', description: 'the remote path of the content tree to pull'},
                {name: 'filterFile', type: 'string', description: 'the path to the project\'s filter.xml file'}
            ],
            []
        );
    }

    exports.init = init;

}());
