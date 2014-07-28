/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $ */

define(function (require, exports, module) {
    "use strict";
    // Load dependent modules
    var AppInit             = brackets.getModule("utils/AppInit"),
        CodeHintManager     = brackets.getModule("editor/CodeHintManager"),
        HTMLUtils           = brackets.getModule("language/HTMLUtils"),
        TokenUtils          = brackets.getModule("utils/TokenUtils"),
        sightlyLanguage     = require("sly/SightlyLanguage"),
        beanMgr             = require("sly/BeanManager"),
        editorManager       = brackets.getModule("editor/EditorManager"),
        formerDoc,
        slyConstants,
        processingChange,
        attributes;

    /**
     * @constructor
     */
    function SLYHints() {
        this.cachedHints = null;
        this.exclusion = "";
    }
    
    /**
     * Returns the string before current pos, ignoring "." and other potential sightly cars
     * 'properti'
     * 'properties.'  
     * 'properties.someth'
     * 'data-sly-use.blah'
     * start limit is either space, either expression start
     */

    function _getCurrentToken(editor) {
        var cursor = editor.getCursorPos(),
            ctx = TokenUtils.getInitialContext(editor._codeMirror, cursor),
            char,
            pos,
            token = "";
        for (pos = cursor.ch - ctx.token.start - 1; slyConstants.TOKEN_START.indexOf(ctx.token.string.charAt(pos)) === -1; pos--) {
            token = ctx.token.string.charAt(pos) + token;
        }
        return token;
    }
    
    /**
     * Check whether the exclusion is still the same as text after the cursor. 
     * If not, reset it to null.
     *
     * @param {boolean} attrNameOnly
     * true to indicate that we update the exclusion only if the cursor is inside an attribute name context.
     * Otherwise, we also update exclusion for attribute value context.
     */
    SLYHints.prototype.updateExclusion = function (attrNameOnly) {
        if (this.exclusion && this.tagInfo) {
            var tokenType = this.tagInfo.position.tokenType,
                offset = this.tagInfo.position.offset,
                text = _getCurrentToken(this.editor),
                textAfterCursor;
            
            if (tokenType === HTMLUtils.ATTR_NAME) {
                textAfterCursor = this.tagInfo.attr.name.substr(offset);
            } else if (!attrNameOnly && tokenType === HTMLUtils.ATTR_VALUE) {
                textAfterCursor = this.tagInfo.attr.value.substr(offset);
            }
            if (!CodeHintManager.hasValidExclusion(this.exclusion, textAfterCursor)) {
                this.exclusion = null;
            }
        }
    };
    
     /**
      * evaluates wether current position of cursor is within an sly expression
      */
    function _isInExpression(editor, tagInfo) {
        var cursor = editor.getCursorPos(),
            tokenType = tagInfo.position.tokenType,
            ctx,
            pos,
            start,
            end;
        if (tokenType === HTMLUtils.ATTR_VALUE) {
            return true;
        } else if (tokenType === "") {
            //@TODO: better handling, as some cases won't pass here 
            //(like 2 expressions in the same token, and cursor being in the second)
            ctx = TokenUtils.getInitialContext(editor._codeMirror, cursor);
            start = ctx.token.string.indexOf(slyConstants.EXPR_START);
            if (start > -1) {
                pos = TokenUtils.offsetInToken(ctx);
                end = ctx.token.string.indexOf(slyConstants.EXPR_END);
                return pos > start  && pos <= end;
            }
        }
        return false;
    }
    
    /**
     * insert a variable name corresponding to chosen declaration (passed as completion)
     * data-sly-use="com.blah.Blah" -> data-sly-use.blah="com.blah.Blah"
     * returns updated cursor position
     */
    function _insertVariableDeclaration(editor, completion) {
        var attributeToken = _getCurrentAttributeToken(editor),
            text = _getCurrentToken(editor),
            varName = completion.substring(completion.lastIndexOf(".")).toLowerCase(),
            newAttr = attributeToken.string + varName,
            cursor = editor.getCursorPos(),
            start = {line: cursor.line, ch: attributeToken.start},
            end = {line: cursor.line, ch: attributeToken.end},
            newPosition = cursor.ch + varName.length;
        editor.document.replaceRange(newAttr, start, end);
        cursor.ch = newPosition;
        editor.setCursorPos(cursor.line, newPosition);
        return cursor;
    }
    
    /**
     * this function is to be called once cursor is after the '=' in attribute position
     */
    function _completeAttributeValue(editor, pos) {
        var tagInfo = HTMLUtils.getTagInfo(editor, pos),
            a       = tagInfo.attr;
        if (a && a.name && a.value === "") {
            //true only if we are in the attribute=| case
            var name = sightlyLanguage.extractAttributeNameInfo(a.name).name;
            if (attributes && attributes[name]) {
                var completion = slyConstants.COMPLETION[attributes[name].type];
                if (completion) {
                    var completions = completion.split(slyConstants.COMPLETION_CURSOR_POS),
                        finalText = completions[0] + completions[1],
                        newPos = {line: pos.line, ch: pos.ch + completions[0].length};
                    editor.document.replaceRange(finalText, pos);
                    editor.setCursorPos(newPos);
                }
            }
        }
    }
    

    /* change event for = typing as hint manager doesn't care about them */
    function _onChange(event, doc, changeList) {
        if (!processingChange) {
            processingChange = true;
            $.each(changeList, function (index, change) {
                if ((change.removed.length === 1) && (change.text.length === 1) && (change.text[0] === "=")) {
                    var editor  = editorManager.getActiveEditor(),
                        pos = { line: change.to.line, ch: change.to.ch + 1};
                    _completeAttributeValue(editor, pos);
                }
            });
            processingChange = false;
        }
    }
       
    /** Handles changes to current (sly) document */
    function _refreshSlyDoc(event, doc) {
        if (!formerDoc || formerDoc !== doc) {
            $(doc).on("change", _onChange);
            if (formerDoc) {
                $(formerDoc).off("change", _onChange);
            }
            formerDoc = doc;
        }
    }
        
    /**
     * Determines whether SLY attribute hints are available in the current 
     * editor context.
     * 
     * @param {Editor} editor 
     * A non-null editor object for the active window.
     *
     * @param {string} implicitChar 
     * Either null, if the hinting request was explicit, or a single character
     * that represents the last insertion and that indicates an implicit
     * hinting request.
     *
     * @return {boolean} 
     * Determines whether the current provider is able to provide hints for
     * the given editor context and, in case implicitChar is non-null,
     * whether it is appropriate to do so.
     */
    SLYHints.prototype.hasHints = function (editor, implicitChar) {
        var pos = editor.getCursorPos(),
            tokenType,
            sly = false;
         
        this.editor = editor;
        this.tagInfo = HTMLUtils.getTagInfo(editor, pos);
        tokenType = this.tagInfo.position.tokenType;
        if (tokenType === HTMLUtils.ATTR_NAME) {
            var name = this.tagInfo.attr.name;
            if (name === slyConstants.SHORTCUT) {
                var start = {ch: pos.ch - slyConstants.SHORTCUT.length, line: pos.line};
                this.editor.document.replaceRange(slyConstants.PREFIX, start, pos);
                this.editor.setCursorPos(start.line, pos.ch + slyConstants.PREFIX.length - slyConstants.SHORTCUT.length);
                return true;
            } else {
                return (name.indexOf(slyConstants.PREFIX) === 0);
            }
        } else if (_isInExpression(editor, this.tagInfo)) {
            return true;
        }
        return false;
    };
    
    /**
     * Returns a list of availble HTML attribute hints if possible for the 
     * current editor context. 
     *
     * @return {{hints: Array.<string|jQueryObject>, match: string, 
     *      selectInitial: boolean}}
     * Null if the provider wishes to end the hinting session. Otherwise, a
     * response object that provides 1. a sorted array hints that consists 
     * of strings; 2. a string match that is used by the manager to emphasize
     * matching substrings when rendering the hint list; and 3. a boolean that
     * indicates whether the first result, if one exists, should be selected
     * by default in the hint list window.
     */
    SLYHints.prototype.getHints = function (implicitChar) {
        var cursor = this.editor.getCursorPos(),
            tokenType,
            name,
            ctx,
            unfiltered;
        this.tagInfo = HTMLUtils.getTagInfo(this.editor, cursor);
        tokenType = this.tagInfo.position.tokenType;
        if (tokenType === HTMLUtils.ATTR_NAME) {
            name = _getCurrentToken(this.editor);
            if (name === slyConstants.SHORTCUT) {
                name = slyConstants.PREFIX;
            }
            unfiltered = Object.keys(attributes);
        } else {
            //we are in the other cases in which hints are needed : expressions
            var token = _getCurrentToken(this.editor);
            if (token === "" || token.indexOf(slyConstants.MEMBER_START) === -1) {
                if (this.tagInfo.attr.name.indexOf(slyConstants.BEAN_DECL) === 0) {
                    //we are in the case of bean declaration, we must propose bean "classes" list
                    unfiltered = Object.keys(beanMgr.getBeanClasses());
                    name = token;
                } else {
                    //we can propose beans
                    unfiltered = beanMgr.getBeansAt(cursor);
                    name = token;
                }
            } else if ((token.indexOf(slyConstants.MEMBER_START) > 0) ||
                       (implicitChar === slyConstants.MEMBER_START)) {
                //we'll propose bean's members
                var memberStart = token.indexOf(slyConstants.MEMBER_START),
                    bean = memberStart > 0 ? token.substr(0, memberStart) : token,
                    member = memberStart > 0 ? token.substr(memberStart + 1, token.length - memberStart) : "";
                unfiltered = beanMgr.getBeanMembers(bean);
                name = member;
            }
        }
        if (unfiltered !== undefined && name !== undefined) {
            return {
                hints: $.grep(unfiltered, function (value) {
                    return (value.indexOf(name) === 0) && (name.length < value.length);
                }),
                match: name,
                selectInitial: true
            };
        }
        return null;
    };
    
    /**
     * Inserts a given SLY attribute hint into the current editor context.
     * 
     * @param {string} hint 
     * The hint to be inserted into the editor context.
     * 
     * @return {boolean} 
     * Indicates whether the manager should follow hint insertion with an
     * additional explicit hint request.
     */
    SLYHints.prototype.insertHint = function (completion) {
        var cursor = this.editor.getCursorPos(),
            text = _getCurrentToken(this.editor),
            start = {line: cursor.line, ch: cursor.ch - text.length},
            end = {line: cursor.line, ch: cursor.ch};
        
        if (this.tagInfo.position.tokenType === HTMLUtils.ATTR_NAME) {
            if (attributes && attributes[completion]) {
                var info = attributes[completion];
                this.editor.document.replaceRange(completion, start, end);
                if (info.mandatory) {
                    var newPos = {line: start.line, ch: start.ch + completion.length};
                    this.editor.setCursorPos(newPos);
                    this.editor.document.replaceRange("=", newPos); //onchange will do the rest
                }
                return true;
            }
        } else if (_isInExpression(this.editor, this.tagInfo)) {
            if (text.indexOf(slyConstants.MEMBER_START) > 0) {
                //in that case, completion is a member: we stripe out the typed member & add completion
                completion = text.substr(0, text.indexOf(slyConstants.MEMBER_START) + 1) + completion;
            } else {
                if (this.tagInfo.attr.name === slyConstants.BEAN_DECL) {
                    //in that case data-sly-use is declared but not yet instanciated: 
                    //we want to propose a name & instanciate it
                    cursor = _insertVariableDeclaration(this.editor, completion);
                    //we reset start & end with updated cursor position
                    start.ch = cursor.ch - text.length;
                    end.ch = cursor.ch;
                }
            }
            this.editor.document.replaceRange(completion, start, end);
            return true;
        }
        return false;
    };

    function load(SLYDictionnary) {
        slyConstants = SLYDictionnary.constants;
        attributes = SLYDictionnary.attributes;
        // Register code hint providers
        var slyHints = new SLYHints();
        CodeHintManager.registerHintProvider(slyHints, ["html"], -1);
        $(sightlyLanguage).on("refreshSlyDoc", _refreshSlyDoc);
    }
    
    /**
     *  Returns the attribute token corresponding to the current cursor
     *  e.g. data-sly-use.check="blah | blah" will return data-sly-use
     */
     
    function _getCurrentAttributeToken(editor) {
        var cursor = editor.getCursorPos(),
            ctx = TokenUtils.getInitialContext(editor._codeMirror, cursor);
        while (ctx.token.type !== "attribute" && TokenUtils.movePrevToken(ctx));
        return ctx.token;
    }
    exports.load = load;
    exports.SLYHints = SLYHints;
    exports.__test_only__onChange = _onChange;
});