/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/

/*
  this module holds language aspects: extensions & syntax highlighting
  it also open and parses the current sightly document, sending events
  to who wants to listen to it:
    - refreshSlyDoc  : fired each time a sightly doc is refreshed, handler:  function(event, document)
    - parsedSlyAttributeName: fired each time an attribute name is called (not fired when full time parsing)
    - parsedSlyAttributes : fired each time a tag containing attributes has been parsed, 
    handler: function(event, tag)
    - parsedSlyExpression : fired each time an expression is parsed, handler: function(event, start, end)
    - parsedSlyValue : fired each time a literal is parsed: function (even, start, end)
    - parsedSlyOperator : fired each time an operator is parsed
    - parsedSlyBlock,fired each time a block with sly attributes in open tag is parsed, handler: function (event, tag), note
      that tag.blockEndPos contains the position of the end of the block.
    - changedLine : fired each time a line is changed: function (event, line, changedList)
    
*/
/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

define(function (require, exports, module) {
    'use strict';
        
    // Load submodules
    var LanguageManager     = brackets.getModule("language/LanguageManager"),
        htmlLanguage        = LanguageManager.getLanguage("html"),
        DocumentManager     = brackets.getModule("document/DocumentManager"),
        MainViewManager     = brackets.getModule('view/MainViewManager'),
        Tokenizer           = brackets.getModule("language/HTMLTokenizer").Tokenizer,
        PerfUtils           = brackets.getModule("utils/PerfUtils"),
        HTMLUtils           = brackets.getModule("language/HTMLUtils"),
        isParsing           = false,
        formerDoc,
        slyConstants,
        slyAttributesListeners,
        attributes;
    
    function _internParsing(regexString, text, pos, event) {
        var regex = new RegExp(regexString, "gm"),
            matches;
        while ((matches = regex.exec(text)) !== null) {
            var start = {ch: pos.ch + matches.index, line: pos.line},
                end = {ch: pos.ch + regex.lastIndex, line: pos.line};
            $(exports).triggerHandler(event, [start, end]);
        }
    }
    
    /**
     * Parsing sly expressions
     */
    function _parseExpressions(startPos, text) {
        var crtPos = 0,
            exprPos,
            endPos,
            matches,
            buffer = text,
            timerExpr = "Sighly Expr parsing";
        PerfUtils.markStart(timerExpr);
        var exprRegexp = new RegExp(slyConstants.EXPR_REGEX, "gm");
        while ((matches = exprRegexp.exec(buffer)) !== null) {
            var start = {ch: matches.index, line: startPos.line},
                end = {ch: exprRegexp.lastIndex, line: startPos.line},
                lineJump = buffer.substring(0, matches.index).split("\n").length - 1;
            //jump to the correct line & char
            if (lineJump > 0) {
                //no support for multiline expressions for now
                start.line = end.line += lineJump;
            } else {
                start.ch += startPos.ch;
                end.ch += startPos.ch;
            }
            $(exports).triggerHandler("parsedSlyExpression", [start, end]);
            //values
            _internParsing(slyConstants.VALUE_REGEX, matches[0], start, "parsedSlyValue");
            //operators
            _internParsing(slyConstants.OPERATOR_REGEX, matches[0], start, "parsedSlyOperator");
            
            //prepare buffer for next expression                    
            buffer = buffer.substring(matches.index);
        }
        PerfUtils.addMeasurement(timerExpr);
    }
     
    /**
     * this parses a sly document, and fires
     * parse events for whoever is interested
     */
    function _parse(doc) {
        var t,
            tagStack = [],
            currentTag,
            currentExpr = null,
            attributeName = null,
            token,
            timerBuildFull = "Sightly Parsing Full",
            timerBuildPart = "Sightly Parsing Partial";
        PerfUtils.markStart([timerBuildFull, timerBuildPart]);
        t = new Tokenizer(doc.getText());
        try {
            while ((token = t.nextToken()) !== null) {
                if (token.type === "error") {
                    PerfUtils.finalizeMeasurement(timerBuildFull);
                    PerfUtils.addMeasurement(timerBuildPart);
                    return null;
                } else if (token.type === "opentagname") {
                    var newTagName = token.contents.toLowerCase(),
                        tag = { "name":  newTagName, "start": token.startPos};
                    tagStack.push(tag);
                    currentTag = tag;
                } else if (token.type === "opentagend" || token.type === "selfclosingtag") {
                    if (currentTag) {
                        currentTag.end = token.endPos;
                    }
                } else if (token.type === "attribname") {
                    var currentAttName = token.contents;
                    if (currentAttName.indexOf(slyConstants.PREFIX) === 0) {
                        attributeName = currentAttName;
                        if (!currentTag.attributes) {
                            currentTag.attributes = {};
                        }
                        currentTag.attributes[attributeName] = {
                            namePos : token.startPos
                        };
                    }
                } else if (token.type === "attribvalue") {
                    if (attributeName !== null) {
                        currentTag.attributes[attributeName].value = token.contents;
                        currentTag.attributes[attributeName].valuePos = token.startPos;
                        attributeName = null;
                    }
                    _parseExpressions(token.startPos, token.contents);
                } else if (token.type === "text") {
                    _parseExpressions(token.startPos, token.contents);
                } else if (token.type === "closetag") {
                    var closedTagName = token.contents.toLowerCase(),
                        startTag = tagStack.pop();
                    if (startTag.name === closedTagName) {//basic and unsufficient test
                        if (startTag.attributes) {
                            startTag.blockEndPos = token.startPos;
                            $(exports).triggerHandler("parsedSlyBlock", [startTag]);
                        }
                    }
                }
            }
            PerfUtils.finalizeMeasurement(timerBuildPart);
            PerfUtils.addMeasurement(timerBuildFull);
            return true;
        } catch (e) {
            console.error("unable to correctly parse the document: " +  e);
        }
        return null;
    }
    
    function _refresh(doc) {
        $(exports).triggerHandler("refreshSlyDoc", [doc]);
        isParsing = true;
        _parse(doc);
        isParsing = false;
    }
    
    /**
     * this gives old string from current line, current changed text & changelist
     */
    function _computeOldString(line, current, changeList) {
        return null;
    }
    
    function _propagateLineChanges(changeList, lineText) {
        var pos = {"ch": 0, "line": changeList.to.line};
        $(exports).triggerHandler("changedLine", [pos.line, changeList]);
        //we parse all expressions in that line
        _parseExpressions(pos, lineText);
        //we parse all attribute names for highlighting & bean
        _internParsing(slyConstants.ATTRIBUTE_NAME_REGEX, lineText, pos, "parsedSlyAttributeName");
    }
    
    function _onChange(event, doc, changeList) {
        $.each(changeList, function (index, change) {
            if ((change.removed.length === 1) && (change.text.length === 1)) {
                //this is one line change (typing or word paste/remove), we do specific treatment on a line)
                PerfUtils.markStart("sightly line change");
                var text = doc.getLine(change.to.line);
                _propagateLineChanges(change, text);
                PerfUtils.addMeasurement("sightly line change");
            } else {
                //this change is bigger than a line: it modifies scope & potentially changes too many things to be treated
                //in a fine grained way: we reparse the full doc
                _refresh(doc);
                return null;
            }
        });
    }
    
    /** Handles changes to current (sly) document */
    function _onFocusedDocChanged() {
        if (formerDoc) {
            $(formerDoc).off("change", _onChange);
        }
        var doc = DocumentManager.getCurrentDocument();
        if (doc && doc.language && doc.language.getId() === "html") {
            $(doc).on("change", _onChange);
            _refresh(doc);
            formerDoc = doc;
        }
    }
    
    function extractAttributeNameInfo(attributeName) {
        var split = attributeName.split("."),
            info = {"name": split[0], "identifier": null};
        if ((split.length === 2) && (split[1].length > 0)) {
            info.identifier = split[1];
        }
        return info;
    }
        
    /**
     *
     */
    function extractBeanVarName(attributeName) {
        return extractAttributeNameInfo(attributeName).identifier;
    }
    
    function registerSlyAttributeListener(listener) {
        if (!slyAttributesListeners) {
            slyAttributesListeners = [];
        }
        slyAttributesListeners.push(listener);
    }
            
    function load(SLYDictionnary) {
        attributes = SLYDictionnary.attributes;
        slyConstants = SLYDictionnary.constants;
        //adding possible extensions for sightly
        $.each(slyConstants.EXTENSIONS, function (index, extension) {
            htmlLanguage.addFileExtension(extension);
        });
        $(MainViewManager).on('currentFileChange', _onFocusedDocChanged)
        $(DocumentManager).on("documentSaved", _onFocusedDocChanged);
    }
    
    exports.load = load;
    exports.extractAttributeNameInfo = extractAttributeNameInfo;
    exports.extractBeanVarName = extractBeanVarName;
    exports.__testonly__parse = _parse;
    exports.__testonly__propagateLineChanges = _propagateLineChanges;
});
