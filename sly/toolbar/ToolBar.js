/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/
/*global define, brackets, Mustache, $, sessionStorage */
define(function (require, exports, module) {
    'use strict';

    var Dialogs                       = brackets.getModule('widgets/Dialogs'),
        WorkspaceManager              = brackets.getModule('view/WorkspaceManager'),
        Strings                       = require('strings'),
        Panel                         = require('sly/panel/Panel'),
        ToolBarIndicatorTemplate      = require('text!./toolbar-aem-indicator.html'),
        AEM_INDICATOR                 = 'sly-status-aem',
        DISABLED_TOOLBAR_BUTTON_CLASS = 'disabled-toolbar-button',
        states = {},
        $slySyncStatus;

    states.INACTIVE = {title: Strings.AEM_SLY_EXTENSION, style: 'sly-status-inactive'};
    states.SYNC_FULL = {title: Strings.SYNC_FULL, style: 'sly-status-ok'};
    states.SYNC_PARTIAL = {title: Strings.SYNC_PARTIAL, style: 'sly-status-warning'};
    states.SYNC_NONE = {title: Strings.SYNC_NONE, style: 'sly-status-error'};
    states.SYNC_IN_PROGRESS = {title: Strings.SYNC_IN_PROGRESS, style: 'sly-status-active'};

    function load() {
        var templateVars = {
            title: Strings.AEM_SLY_EXTENSION
        };
        $slySyncStatus = $(Mustache.render(ToolBarIndicatorTemplate, templateVars));
        $slySyncStatus.addClass(DISABLED_TOOLBAR_BUTTON_CLASS).addClass(states.INACTIVE.style);
        $slySyncStatus.appendTo('#main-toolbar div.buttons');
    }

    function updateStatusIndicator(show, state, title, errorMessage) {
        if (errorMessage !== undefined) {
            Panel.append({error: errorMessage, time: new Date().toLocaleString()});
        }
        if (show === true) {
            if (state) {
                var templateVars = {
                    title: title || state.title
                };
                var template = Mustache.render(ToolBarIndicatorTemplate, templateVars);
                $slySyncStatus.replaceWith(template);
                $slySyncStatus = $('#' + AEM_INDICATOR);
                $slySyncStatus.addClass(state.style || '');
                $slySyncStatus.removeClass(DISABLED_TOOLBAR_BUTTON_CLASS);
                $slySyncStatus.click(function () {
                    Panel.toggle();
                });
            }
        } else {
            $slySyncStatus.addClass(DISABLED_TOOLBAR_BUTTON_CLASS);
        }
    }

    exports.load = load;
    exports.updateStatusIndicator = updateStatusIndicator;
    exports.states = states;

});
