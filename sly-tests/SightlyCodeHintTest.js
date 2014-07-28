/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/

/**/
/* Sightly Code Hint unit tests*/
/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global beanManager, brackets, define, describe, beforeEach, afterEach, it, runs, waits, waitsForDone, expect, $, beforeFirst, afterLast */

define(function (require, exports, module) {
    "use strict";
    var codehint        = require("sly/SightlyCodeHint"),
        beanManager     = require("sly/BeanManager"),
        HTMLUtils       = brackets.getModule("language/HTMLUtils"),
        SpecRunnerUtils = brackets.getModule("spec/SpecRunnerUtils"),
        Editor          = brackets.getModule("editor/Editor").Editor,
        CodeHintManager = brackets.getModule("editor/CodeHintManager"),
        TokenUtils      = brackets.getModule("utils/TokenUtils"),
        SLYDefault      = require("text!sly/bootstrap/default.json"),
        SLYCQ           = require("text!sly/bootstrap/extensions/cq.json"),
        SLYSling        = require("text!sly/bootstrap/extensions/sling.json"),
        defaultJSON     = JSON.parse(SLYDefault),
        cqJSON          = JSON.parse(SLYCQ),
        slingJSON       = JSON.parse(SLYSling),
        SLYDictionnary  = $.extend(true, defaultJSON, cqJSON, slingJSON),
        defaultContent  = require("text!sly-tests/resources/codehint-test.sly");
            
    
    describe("Sightly Code Hint", function () {
        
        codehint.load(SLYDictionnary);
        beanManager.load(SLYDictionnary);
        var testEditorAndDoc,
            hintProvider = new codehint.SLYHints();
                
        beforeEach(function () {
            testEditorAndDoc = SpecRunnerUtils.createMockEditor(defaultContent, "html");
            $(testEditorAndDoc.doc).on("change", hintProvider.__test_only__onChange);
            beanManager.__testonly__refreshBeans();
        });

        afterEach(function () {
            SpecRunnerUtils.destroyMockEditor(testEditorAndDoc.doc);
        });
        
        // Ask provider for hints at current cursor position; expect it to return some
        function expectHints() {
            expect(hintProvider.hasHints(testEditorAndDoc.editor, null)).toBe(true);
            var hintsObj = hintProvider.getHints(null);
            expect(hintsObj).toBeTruthy();
            return hintsObj.hints; // return just the array of hints
        }
        
        // Ask provider for hints at current cursor position
        function expectNoHints() {
            expect(hintProvider.hasHints(testEditorAndDoc.editor, null)).toBe(false);
        }
        
        //after given choice, expect given completion, with char | as the new cursor position
        function expectCompletion(initialText, choice, completion, atTypeTime) {
            var ctx,
                pos = testEditorAndDoc.editor.getCursorPos(),
                completions = completion.split('|'),
                expectedPos = {
                    line: pos.line,
                    ch: pos.ch + completions[0].length - initialText.length
                };
            hintProvider.editor = testEditorAndDoc.editor;
            hintProvider.insertHint(choice);
            expect(testEditorAndDoc.editor.getCursorPos().ch).toBe(expectedPos.ch);
            expect(testEditorAndDoc.editor.getCursorPos().line).toBe(expectedPos.line);
            ctx = TokenUtils.getInitialContext(testEditorAndDoc.editor._codeMirror, expectedPos);
            expect(ctx.token.string).toBe(completions[0]);
            if (completions.length > 1 && completions[1].length > 0) {
                expect(TokenUtils.moveNextToken(ctx)).toBe(true);
                expect(ctx.token.string).toBe(completions[1]);
            }
        }
                 
        it("proposes data-sly-* attributes when entering sly", function () {
            testEditorAndDoc.editor.setCursorPos({line: 4, ch: 14});
            expectHints();
        });
        it("proposes data-sly-* attributes when entering data-sly", function () {
            testEditorAndDoc.editor.setCursorPos({line: 9, ch: 22});
            expectHints();
        });
        it("completes with attribute only when attribute is of type none, " +
            "while typing the attribute", function () {
                testEditorAndDoc.editor.setCursorPos({line: 9, ch: 22});
                expectCompletion("data-sly-", "data-sly-unwrap", "data-sly-unwrap|");
            });
        it("completes with attribute only when attribute is of type optional, " +
            "while typing the attribute", function () {
                testEditorAndDoc.editor.setCursorPos({line: 9, ch: 22});
                expectCompletion("data-sly-", "data-sly-list", "data-sly-list|");
            });
        
        it("completes with attribute appended with '=${|}' when attribute is " +
            "of type expression and mandatory", function () {
                testEditorAndDoc.editor.setCursorPos({line: 9, ch: 22});
                expectCompletion("data-sly-", "data-sly-resource", "data-sly-resource=\"${|}\"");
            });
        it("completes with '${}' when typing = and attribute is " +
            "of type expression or optional", function () {
                var pos = {line: 14, ch: 26};
                testEditorAndDoc.editor.setCursorPos(pos);
                testEditorAndDoc.doc.replaceRange("=", pos);
                var line = testEditorAndDoc.doc.getLine(14);
                expect(line.indexOf("data-sly-list=\"{}\"") > 0).toBe(true);
                expect(testEditorAndDoc.editor.getCursorPos().line).toBe(14);
                expect(testEditorAndDoc.editor.getCursorPos().ch).toBe(29);
            });
        it("proposes some beans within an empty expression", function () {
            testEditorAndDoc.editor.setCursorPos({line: 20, ch: 14});
            expectHints();
        });
        it("proposes some members within after resources.", function () {
            testEditorAndDoc.editor.setCursorPos({line: 25, ch: 23});
            expectHints();
        });
        it("doesn't propose anything when a full expression is entered", function () {
            testEditorAndDoc.editor.setCursorPos({line: 30, ch: 27});
            expectNoHints();
        });
    });
});