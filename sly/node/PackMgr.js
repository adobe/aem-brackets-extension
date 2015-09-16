/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/
/*
jshint nonew:true, curly:true, latedef:true, unused:vars, noarg:true, indent:4, trailing:true, forin:true, noempty:true, quotmark:single,
node:true, eqeqeq:true, strict:true, undef:true, bitwise:true, immed:true, maxlen:140, freeze:true
*/
(function() {
    'use strict';

    var Q       = require('q'),
        Fs      = require('fs-extra'),
        Path    = require('path'),
        Request = require('request');

    Q.longStackSupport = true;

    var URL = '/crx/packmgr/service/.json';

    /**
     * Uploads the ZIP content package from <code>packageFilePath</code> to the AEM instance from <code>serverURL</code>.
     * @param {String} serverURL the server's URL (e.g. http://localhost:4502)
     * @param {boolean} acceptSelfSigned boolean flag to indicate if self-signed certificates should be acceppted for HTTPs connections
     * @param {String} user a user allowed to manage content packages
     * @param {String} password the user's password
     * @param {String} packageFilePath the path to the content package on the file system
     * @returns {promise|Q.promise} a promise
     */
    function uploadPackage(serverURL, acceptSelfSigned, user, password, packageFilePath) {
        var deferred = Q.defer(),
            packageStream = Fs.createReadStream(packageFilePath),
            uri = serverURL + URL + '?cmd=upload';
        var r = Request.post(
            uri,
            _createRequestOptions(user, password, acceptSelfSigned),
            function(err, httpResponse, body) {
                if (!_errorDetected(err, httpResponse, serverURL, 200, deferred)) {
                    try {
                        var response = JSON.parse(body);
                        if (response.success === true) {
                            deferred.resolve();
                        } else {
                            deferred.reject(new Error(response.msg));
                        }
                    } catch (e) {
                        deferred.reject(new Error('Error uploading package ' + packageFilePath + ': ' + e));
                    }
                }
            }

        );
        var form = r.form();
        form.append('force', 'true');
        form.append('package', packageStream);
        return deferred.promise;
    }

    /**
     * Installs a previously uploaded content package on the AEM instance from <code>serverURL</code>.
     * @param {String} serverURL the server's URL (e.g. http://localhost:4502)
     * @oaram {boolean} acceptSelfSigned boolean flag to indicate if self-signed certificates should be acceppted for HTTPs connections
     * @param {String} user a user allowed to manage content packages
     * @param {String} password the user's password
     * @param {String} packageName the full content package name (e.g. 'group/name-version.zip')
     * @returns {promise|Q.promise} a promise
     */
    function installPackage(serverURL, acceptSelfSigned, user, password, packageName) {
        var deferred = Q.defer(),
            uri = serverURL + URL + '/etc/packages/' + packageName + '?cmd=install';
        Request.post(
            uri,
            _createRequestOptions(user, password, acceptSelfSigned),
            function (err, httpResponse, body) {
                if (!_errorDetected(err, httpResponse, serverURL, 200, deferred)) {
                    try {
                        var response = JSON.parse(body);
                        if (response.success === true) {
                            deferred.resolve();
                        } else {
                            deferred.reject(new Error(response.msg));
                        }
                    } catch (e) {
                        deferred.reject(new Error('Error installing package ' + packageName + ': ' + e));
                    }
                }
            }
        );
        return deferred.promise;
    }

    /**
     * Builds a previously uploaded content package on the AEM instance from <code>serverURL</code>.
     * @param {String} serverURL the server's URL (e.g. http://localhost:4502)
     * @oaram {boolean} acceptSelfSigned boolean flag to indicate if self-signed certificates should be acceppted for HTTPs connections
     * @param {String} user a user allowed to manage content packages
     * @param {String} password the user's password
     * @param {String} packageName the full content package name (e.g. 'group/name-version.zip
     * @returns {promise|Q.promise} a promise
     */
    function buildPackage(serverURL, acceptSelfSigned, user, password, packageName) {
        var deferred = Q.defer(),
            uri = serverURL + URL + '/etc/packages/' + packageName + '?cmd=build';
        Request.post(
            uri,
            _createRequestOptions(user, password, acceptSelfSigned),
            function(err, httpResponse, body) {
                if (!_errorDetected(err, httpResponse, serverURL, 200, deferred)) {
                    try {
                        var response = JSON.parse(body);
                        if (response.success === true) {
                            deferred.resolve();
                        } else {
                            deferred.reject(new Error(response.msg));
                        }
                    } catch (e) {
                        deferred.reject(new Error('Error building package' + packageName + ': ' + e));
                    }
                }
            }
        );
        return deferred.promise;
    }

    /**
     * Deletes a previously uploaded content package on the AEM instance from <code>serverURL</code>.
     * @param {String} serverURL the server's URL (e.g. http://localhost:4502)
     * @oaram {boolean} acceptSelfSigned boolean flag to indicate if self-signed certificates should be acceppted for HTTPs connections
     * @param {String} user a user allowed to manage content packages
     * @param {String} password the user's password
     * @param {String} packageName the full content package name (e.g. 'group/name-version.zip)
     * @returns {promise|Q.promise} a promise
     */
    function deletePackage(serverURL, acceptSelfSigned, user, password, packageName) {
        var deferred = Q.defer(),
            uri = serverURL + URL + '/etc/packages/' + packageName + '?cmd=delete';
        Request.post(
            uri,
            _createRequestOptions(user, password, acceptSelfSigned),
            function(err, httpResponse, body) {
                if (!_errorDetected(err, httpResponse, serverURL, 200, deferred)) {
                    try {
                        var response = JSON.parse(body);
                        if (response.success === true) {
                            deferred.resolve();
                        } else {
                            deferred.reject(new Error(response.msg));
                        }
                    } catch (e) {
                        deferred.reject(new Error('Error deleting package ' + packageName + ': ' + e));
                    }
                }
            }
        );
        return deferred.promise;
    }

    /**
     * Downloads package <code>packageName</code> from the AEM instance available at <code>serverURL</code> to the <code>outputFolder</code>
     * folder.
     * @param {String} serverURL the server's URL (e.g. http://localhost:4502)
     * @oaram {boolean} acceptSelfSigned boolean flag to indicate if self-signed certificates should be acceppted for HTTPs connections
     * @param {String} user a user allowed to manage content packages
     * @param {String} password the user's password
     * @param {String} packageName the full content package name (e.g. 'group/name-version.zip)
     * @param {String} outputFolder the folder where the content package will be downloaded
     * @param {String} [outputFileName] the file name under which to save the downloaded package
     * @returns {promise|Q.promise} a promise
     */
    function downloadPackage(serverURL, acceptSelfSigned, user, password, packageName, outputFolder, outputFileName) {
        var deferred = Q.defer(),
            uri = serverURL + '/etc/packages/' + packageName,
            mkdirp = Q.denodeify(Fs.mkdirp);
        var fileName = outputFileName;
        if (!outputFileName) {
            fileName = packageName.substring(packageName.lastIndexOf('!'), packageName.length);
        }
        mkdirp(outputFolder).then(
            function() {
                var r = Request.get(
                    uri,
                    _createRequestOptions(user, password, acceptSelfSigned),
                    function(err, httpResponse) {
                        _errorDetected(err, httpResponse, serverURL, 200, deferred);
                    }
                ).pipe(Fs.createWriteStream(outputFolder + Path.sep + fileName));
                r.on('finish', function() {
                    deferred.resolve(outputFolder + Path.sep + fileName);
                });
                r.on('error', function() {
                    deferred.reject(new Error('Unable to write remote file ' + uri + ' to ' + outputFolder + Path.sep + fileName));
                });
            }
        );
        return deferred.promise;
    }

    function _errorDetected(err, httpResponse, serverURL, expectedStatusCode, deferred) {
        if (err) {
            deferred.reject(new Error('Cannot establish a connection to server ' + serverURL + (err.code ? ': ' + err.code + '.' : '.')));
            return true;
        } else {
            if (httpResponse) {
                var statusCode = httpResponse.statusCode;
                if (statusCode !== expectedStatusCode) {
                    switch (statusCode) {
                        case 401:
                            deferred.reject(new Error('Invalid user name or password for server ' + serverURL + '.'));
                            return true;
                        default:
                            deferred.reject(new Error('Received status code ' + statusCode + '. Expected ' + expectedStatusCode + '.'));
                            return true;
                    }
                }
            }
        }
        return false;
    }

    function _createRequestOptions(user, password, acceptSelfSigned) {
        return {
            auth: {
                user: user,
                pass: password
            },
            agentOptions: {
                rejectUnauthorized: !acceptSelfSigned
            }
        }
    }

    exports.uploadPackage = uploadPackage;
    exports.installPackage = installPackage;
    exports.buildPackage = buildPackage;
    exports.deletePackage = deletePackage;
    exports.downloadPackage = downloadPackage;
}());
