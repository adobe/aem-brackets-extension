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
/*global define,brackets */
define(function (require, exports, module) {
    'use strict';

    var Menus             = brackets.getModule('command/Menus'),
        Commands          = require('sly/command/Commands'),
        Preferences       = require('sly/preferences/Preferences'),
        RemoteSyncManager = require('sly/RemoteSyncManager'),
        CommandManager    = brackets.getModule('command/CommandManager'),
        KeyBindingManager = brackets.getModule('command/KeyBindingManager');

    function load(SLYDictionary) {
        var appMenu = Menus.addMenu('Sightly', 'adobe.brackets.sly', Menus.BEFORE, Menus.AppMenuBar.HELP_MENU);
        var openProjectPreferencesCommand = CommandManager.register(
            Commands.MENU.projectPreferences.name,
            Commands.MENU.projectPreferences.id,
            Preferences.openProjectPreferences
        );
        KeyBindingManager.addBinding(openProjectPreferencesCommand, Commands.MENU.projectPreferences.keyBindings);
        appMenu.addMenuItem(openProjectPreferencesCommand);

        var exportContentPackageCommand = CommandManager.register(
            Commands.MENU.exportContentPackage.name,
            Commands.MENU.exportContentPackage.id,
            RemoteSyncManager.exportContentPackage
        );
        KeyBindingManager.addBinding(exportContentPackageCommand, Commands.MENU.exportContentPackage.keyBindings);
        appMenu.addMenuItem(exportContentPackageCommand);

        var importContentPackageCommand = CommandManager.register(
            Commands.MENU.importContentPackage.name,
            Commands.MENU.importContentPackage.id,
            RemoteSyncManager.importContentPackage
        );
        KeyBindingManager.addBinding(importContentPackageCommand, Commands.MENU.importContentPackage.keyBindings);
        appMenu.addMenuItem(importContentPackageCommand);
    }

    exports.load = load;
});