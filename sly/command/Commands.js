/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/
/*
 jshint nonew:true, curly:true, latedef:true, unused:vars, noarg:true, indent:4, trailing:true, forin:true, noempty:true, quotmark:single,
 node:true, eqeqeq:true, strict:true, undef:true, bitwise:true, immed:true, maxlen:140, freeze:true, multistr:true
 */
/*global define*/
define(function (require, exports, module) {
    'use strict';

    var Strings = require('strings');

    // SIGHTLY menu
    var MENU = {
        projectPreferences  : {
            id         : 'sly.openProjectPreferences', // Preferences.js    openProjectPreferences()
            name       : Strings.MENU_PROJECT_SETTINGS,
            keyBindings: { key: 'Cmd-Shift-P'}
        },
        exportContentPackage: {
            id         : 'sly.exportContentPackage',
            name       : Strings.MENU_EXPORT_CONTENT_PACKAGE,
            keyBindings: {key: 'Cmd-Shift-E'}
        },
        importContentPackage: {
            id         : 'sly.importContentPackage',
            name       : Strings.MENU_IMPORT_CONTENT_PACKAGE,
            keyBindings: {key: 'Cmd-Shift-I'}
        }
    };

    exports.MENU = MENU;

});