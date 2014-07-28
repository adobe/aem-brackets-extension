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
        maven: {
            options: {
                goal: 'install'
            }
        },
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
                            'sling/*',
                            'node_modules/adm-zip/**',
                            'node_modules/fs-extra/**',
                            'node_modules/glob/**',
                            'node_modules/q/**',
                            'node_modules/request/**',
                            'node_modules/xmldom/**',
                            'node_modules/xpath/**'
                        ]
                    }
                ]
            }
        }
    });

    grunt.loadNpmTasks('grunt-maven-tasks');
    grunt.loadNpmTasks('grunt-contrib-compress');

    // Default task(s).
    grunt.registerTask('default', ['maven', 'compress']);
};
