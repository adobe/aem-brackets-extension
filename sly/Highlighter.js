/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/

/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, _mark */

define(function (require, exports, module) {
    'use strict';
    
    var sightlyLanguage = require("sly/SightlyLanguage"),
        editorManager = brackets.getModule("editor/EditorManager"),
        attributes,
        slyConstants,
        markers = {},
        STYLE = {
            ERROR : {
                clazz: "sly-error",
                style: "{background-color: pink;}",
                selector: ".sly-error"
            },
            VARIABLE : {
                clazz: "sly-variable",
                style: "{font-weight: bold;}",
                selector: ".sly-variable"
            },
            ATT_NAME : {
                clazz: "sly-att-name",
                style: "{text-decoration: underline;}",
                selector: ".cm-s-default span.cm-attribute.sly-att-name"
            },
            EXPR : {
                clazz: "sly-expr",
                style: "{color:#8757ad !important;}",
                selector: ".sly-expr"
            },
            VALUE : {
                clazz: "sly-value",
                style: "{color: #f18900 !important}",
                selector: ".sly-value"
            },
            OPERATOR : {
                clazz: "sly-operator",
                style: "{color: #535353 !important}",
                selector: ".sly-operator"
            }
        };
    
    function _markOnALine(style, from, len, text) {
        _mark(style, from, {"line": from.line, "ch": from.ch + len}, text);
    }

    /**
     * mark a bit of code with given class (and text)
     */
    function _mark(style, from, to, text) {
        var cm = editorManager.getActiveEditor()._codeMirror,
            marker = cm.markText(from, to, {"className": style.clazz, "title": text});
        if (!markers[from.line]) {
            markers[from.line] = [];
        }
        markers[from.line].push(marker);
    }
    
    function clearLineMarkers(line) {
        if (markers[line]) {
            $.each(markers[line], function (index, marker) {
                marker.clear();
            });
        }
    }
    

    /**
     *
     */
    function highlightError(from, to, text) {
        _mark(STYLE.ERROR, from, to, text);
    }

    /**
     *
     */
    function highlightVariable(from, to) {
        _mark(STYLE.VARIABLE, from, to);
    }
    
    function _refreshHighlights(event, doc) {
        var editor = editorManager.getActiveEditor(),
            text = "<style class='sly-style'>",
            root = $(editor.getRootElement());
        root.children(".sly-style").remove();
        $.each(Object.keys(STYLE), function (index, key) {
            var style = STYLE[key];
            text += style.selector + " " + style.style + " ";
        });
        text += "</style>";
        root.append($(text));
        
        //clearing existing marks
        $.each(markers, function (index, line) {
            clearLineMarkers(line);
        });
        markers = {};
    }
    
    function _onChangedLine(event, line) {
        clearLineMarkers(line);
    }
    
    /**
     *
     */
    function _onParsedSlyBlock(event, tag) {
        $.each(Object.keys(tag.attributes), function (index, key) {
            var root = key.indexOf(slyConstants.DECL_START) > 0 ? key.substring(0, key.indexOf(slyConstants.DECL_START)) : key;
            if (attributes[root] !== undefined) {
                var attribute = tag.attributes[key];
                _markOnALine(STYLE.ATT_NAME, attribute.namePos, key.length);
            }
        });
    }

    function _onParsedSlyExpression(event, start, end) {
        _mark(STYLE.EXPR, start, end);
    }
    
    function _onParsedSlyValue(event, start, end) {
        _mark(STYLE.VALUE, start, end);
    }
    
    function _onParsedSlyOperator(event, start, end) {
        _mark(STYLE.OPERATOR, start, end);
    }
    
    function _onParsedSlyAttributeName(event, start, end) {
        _mark(STYLE.ATT_NAME, start, end);
    }
    
    function load(dictionnary) {
        attributes = dictionnary.attributes;
        slyConstants = dictionnary.constants;
        $(sightlyLanguage).on("refreshSlyDoc", _refreshHighlights);
        $(sightlyLanguage).on("parsedSlyBlock", _onParsedSlyBlock);
        $(sightlyLanguage).on("parsedSlyAttributeName", _onParsedSlyAttributeName);
        $(sightlyLanguage).on("parsedSlyExpression", _onParsedSlyExpression);
        $(sightlyLanguage).on("parsedSlyValue", _onParsedSlyValue);
        $(sightlyLanguage).on("parsedSlyOperator", _onParsedSlyOperator);
        $(sightlyLanguage).on("changedLine", _onChangedLine);
    }
        
    exports.highLightError = highlightError;
    exports.highLightVariable = highlightVariable;
    exports.load = load;
});
