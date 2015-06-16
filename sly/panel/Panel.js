/*******************************************************************************
 * Copyright (c) 2015 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/
/*global define, brackets, Mustache, $, sessionStorage */
define(function (require, exports, module) {
    'use strict';

    var WorkspaceManager  = brackets.getModule('view/WorkspaceManager'),
        Strings           = require('strings'),
        statusPanel       = null,
        MAX_SIZE          = 1000,
        panelTemplate     = require('text!./aem-sync-panel.html'),
        entryTemplate     = require('text!./aem-sync-entry.html');

    function _init() {
        if (statusPanel === null) {
            var templateVars = {
                Strings: Strings,
                syncStatus: null
            }
            statusPanel = WorkspaceManager.createBottomPanel("sly.status", $(Mustache.render(panelTemplate, templateVars)));
        }
        statusPanel.$panel.on("click", ".close", toggle);
        statusPanel.$panel.on("click", ".clear", clear);
    }

    function toggle(show) {
        if (statusPanel === null) {
            _init();
        }
        if (typeof show === "boolean") {
            statusPanel.setVisible(show);
        } else {
            statusPanel.setVisible(!statusPanel.isVisible());
        }
    }

    function clear() {
        if (statusPanel === null) {
            return;
        }
        statusPanel.$panel.find(".sly-sync-results table tbody").empty();
    }

    function append(entry) {
        if (statusPanel === null) {
            _init();
        }
        var tbody = statusPanel.$panel.find(".sly-sync-results table tbody");
        tbody.prepend(Mustache.render(entryTemplate, entry));
        tbody.find("tr").slice(MAX_SIZE).remove();
    }

    exports.toggle = toggle;
    exports.clear = clear;
    exports.append = append
});