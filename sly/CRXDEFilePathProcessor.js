/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/
/*global define, brackets */
define(function (require, exports, module) {
    'use strict';

    brackets.getModule(
        ['file/FilePathProcessor'],
        function(fpp) {

            var FilePathProcessor = fpp.FilePathProcessor,
                ProjectUtils      = require('sly/ProjectUtils'),
                URL_PREFIX = 'crx-brackets://',
                jcrRoot;

            function CRXDEFilePathProcessor() {
                FilePathProcessor.call(this);
                ProjectUtils.getJcrRoot().then(
                    function (root) {
                        jcrRoot = root;
                    },
                    function (err) {
                        jcrRoot = undefined;
                    }
                ).done();
            }

            CRXDEFilePathProcessor.prototype = Object.create(FilePathProcessor.prototype);
            CRXDEFilePathProcessor.prototype.constructor = CRXDEFilePathProcessor;

            CRXDEFilePathProcessor.prototype.process = function(file) {
                var currentFile = file.substring(URL_PREFIX.length);
                currentFile = jcrRoot ? jcrRoot + currentFile : currentFile;
                if (currentFile.charAt(0) !== '/') {
                    currentFile = '/' + currentFile;
                }
                return currentFile;
            };

            CRXDEFilePathProcessor.prototype.getURLPrefix = function() {
                return URL_PREFIX;
            };

            exports.CRXDEFilePathProcessor = CRXDEFilePathProcessor;
        },
        function (err) {
            var failed = err.requireModules && err.requireModules[0];
            console.log('Cannot load module ' + failed);
        }
    );
});