/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/
module.exports = function (grunt) {
    'use strict';
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        compress: {
            main: {
                options: {
                    archive: 'target/aem-sightly-brackets-extension-<%= pkg.version %>.zip'
                },
                files: [
                    {
                        src: [
                            'main.js',
                            'strings.js',
                            'package.json',
                            'LICENSE',
                            'NOTICE',
                            'sly/**',
                            'node_modules/adm-zip/**',
                            'node_modules/ansi-regex/**',
                            'node_modules/ansi-styles/**',
                            'node_modules/archiver/**',
                            'node_modules/aws4/**',
                            'node_modules/balanced-match/**',
                            'node_modules/bcrypt-pbkdf/**',
                            'node_modules/binary/**',
                            'node_modules/bl/**',
                            'node_modules/brace-expansion/**',
                            'node_modules/buffer-crc32/**',
                            'node_modules/buffers/**',
                            'node_modules/caseless/**',
                            'node_modules/chainsaw/**',
                            'node_modules/chalk/**',
                            'node_modules/commander/**',
                            'node_modules/concat-map/**',
                            'node_modules/core-util-is/**',
                            'node_modules/crc32-stream/**',
                            'node_modules/dashdash/**',
                            'node_modules/debug/**',
                            'node_modules/deflate-crc32-stream/**',
                            'node_modules/ecc-jsbn/**',
                            'node_modules/end-of-stream/**',
                            'node_modules/escape-string-regexp/**',
                            'node_modules/extend/**',
                            'node_modules/extsprintf/**',
                            'node_modules/file-utils/**',
                            'node_modules/findup-sync/**',
                            'node_modules/fs-extra/**',
                            'node_modules/fs.realpath/**',
                            'node_modules/fstream/**',
                            'node_modules/generate-function/**',
                            'node_modules/generate-object-property/**',
                            'node_modules/getpass/**',
                            'node_modules/glob/**',
                            'node_modules/graceful-fs/**',
                            'node_modules/har-validator/**',
                            'node_modules/has-ansi/**',
                            'node_modules/iconv-lite/**',
                            'node_modules/inflight/**',
                            'node_modules/inherits/**',
                            'node_modules/is-my-ip-valid/**',
                            'node_modules/is-my-json-valid/**',
                            'node_modules/is-property/**',
                            'node_modules/is-typedarray/**',
                            'node_modules/isarray/**',
                            'node_modules/isbinaryfile/**',
                            'node_modules/isstream/**',
                            'node_modules/jsbn/**',
                            'node_modules/json-schema/**',
                            'node_modules/json-stringify-safe/**',
                            'node_modules/jsonfile/**',
                            'node_modules/jsonpointer/**',
                            'node_modules/jsprim/**',
                            'node_modules/lazystream/**',
                            'node_modules/lodash/**',
                            'node_modules/lru-cache/**',
                            'node_modules/match-stream/**',
                            'node_modules/mime-db/**',
                            'node_modules/mime-types/**',
                            'node_modules/minimatch/**',
                            'node_modules/minimist/**',
                            'node_modules/mkdirp/**',
                            'node_modules/ms/**',
                            'node_modules/natives/**',
                            'node_modules/ncp/**',
                            'node_modules/node-uuid/**',
                            'node_modules/once/**',
                            'node_modules/over/**',
                            'node_modules/path-is-absolute/**',
                            'node_modules/pinkie/**',
                            'node_modules/pinkie-promise/**',
                            'node_modules/process-nextick-args/**',
                            'node_modules/pullstream/**',
                            'node_modules/punycode/**',
                            'node_modules/q/**',
                            'node_modules/readable-stream/**',
                            'node_modules/request/**',
                            'node_modules/rimraf/**',
                            'node_modules/setimmediate/**',
                            'node_modules/sigmund/**',
                            'node_modules/slice-stream/**',
                            'node_modules/sshpk/**',
                            'node_modules/string_decoder/**',
                            'node_modules/stringstream/**',
                            'node_modules/strip-ansi/**',
                            'node_modules/supports-color/**',
                            'node_modules/tar-stream/**',
                            'node_modules/tough-cookie/**',
                            'node_modules/traverse/**',
                            'node_modules/tweetnacl/**',
                            'node_modules/unzip/**',
                            'node_modules/util-deprecate/**',
                            'node_modules/verror/**',
                            'node_modules/wrappy/**',
                            'node_modules/xmldom/**',
                            'node_modules/xpath/**',
                            'node_modules/xtend/**',
                            'node_modules/zip-stream/**'
                        ]
                    }
                ]
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-compress');

    // Default task(s).
    grunt.registerTask('default', ['compress']);
};
