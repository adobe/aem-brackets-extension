/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/
/*global define, $, brackets, require */
require.config({
    paths: {
        'text' : 'lib/text',
        'i18n' : 'lib/i18n'
    },
    locale: brackets.getLocale()
});

define(function (require, exports, module) {
    'use strict';
    
    // Load submodules
    var Menu                = require('sly/menu/Menu'),
        SightlyLanguage     = require('sly/SightlyLanguage'),
        BeanManager         = require('sly/BeanManager'),
        SlyCodeHints        = require('sly/SightlyCodeHint'),
        Highlighter         = require('sly/Highlighter'),
        RemoteSyncMgr       = require('sly/RemoteSyncManager'),
        ToolBar             = require('sly/toolbar/ToolBar'),
        Preferences         = require('sly/preferences/Preferences'),
        SLYDefault          = require('text!sly/bootstrap/default.json'),
        SLYCQ               = require('text!sly/bootstrap/extensions/cq.json'),
        SLYSling            = require('text!sly/bootstrap/extensions/sling.json'),
        defaultJSON         = JSON.parse(SLYDefault),
        cqJSON              = JSON.parse(SLYCQ),
        slingJSON           = JSON.parse(SLYSling),
        SLYDictionary       = $.extend(true, defaultJSON, cqJSON, slingJSON),
        AppInit             = brackets.getModule('utils/AppInit'),
        ExtensionUtils      = brackets.getModule('utils/ExtensionUtils');

    AppInit.appReady(function () {
        try {
            Menu.load(SLYDictionary);
            Preferences.load(SLYDictionary);
            RemoteSyncMgr.load(SLYDictionary);
            SightlyLanguage.load(SLYDictionary);
            Highlighter.load(SLYDictionary);
            BeanManager.load(SLYDictionary);
            SlyCodeHints.load(SLYDictionary);
            ToolBar.load(SLYDictionary);
            brackets.getModule(
                ['file/FilePathProcessor'],
                function (fpp) {
                    var CRXDEFilePathProcessor = require('sly/CRXDEFilePathProcessor').CRXDEFilePathProcessor;
                    brackets.app.registerFilePathProcessor(new CRXDEFilePathProcessor());
                },
                function (err) {
                    var failed = err.requireModules && err.requireModules[0];
                    console.log('Cannot load module ' + failed);
                }
            );
            ExtensionUtils.loadStyleSheet(module, 'sly/styles/sly.css').done();
        } catch (e) {
            console.error('unable to correctly load sightly extension : ' + e);
        }
    });

});
