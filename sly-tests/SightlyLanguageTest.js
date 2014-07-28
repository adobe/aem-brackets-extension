/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/

/**/
/* Sightly Language unit tests*/
/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global brackets,define, $, jasmine, spyOn, describe, beforeFirst, afterLast, afterEach, it, runs, waitsFor, expect, waitsForDone */

define(function (require, exports, module) {
    "use strict";
    var language = require("sly/SightlyLanguage"),
        SpecRunnerUtils = brackets.getModule("spec/SpecRunnerUtils"),
        FileUtils       = brackets.getModule("file/FileUtils"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        SLYDefault      = require("text!sly/bootstrap/default.json"),
        SLYCQ           = require("text!sly/bootstrap/extensions/cq.json"),
        SLYSling        = require("text!sly/bootstrap/extensions/sling.json"),
        defaultJSON     = JSON.parse(SLYDefault),
        cqJSON          = JSON.parse(SLYCQ),
        slingJSON       = JSON.parse(SLYSling),
        SLYDictionnary  = $.extend(true, defaultJSON, cqJSON, slingJSON);
    
    
    describe("Sightly Language", function () {
        language.load(SLYDictionnary);
        var resourcesPath = FileUtils.getNativeModuleDirectoryPath(module) + "/resources/";

        it("registers all specified sightly extension as of html language");
        it("extracts correctly a variable bean name from an attribute declaration, null if not or wrongly defined", function () {
            expect(language.extractBeanVarName("data-sly-use.blah")).toBe("blah");
            expect(language.extractBeanVarName("data-sly-use.")).toBeNull();
            expect(language.extractBeanVarName("data-sly-use")).toBeNull();
        });
        it("sends parsedSlyBlock event with open tag info & end position when parsing a tag block containing sly attributes");
        it("sends parsedSlyOperator event with start and end of the operator when parsing an operator");
        it("sends parsedSlyValue event with start and end of the value when parsing an value");
        it("sends parsedSlyExpression event with start and end of the expression when parsing an expression");
        it("sends correct number of event for a given file (parse)", function () {
            var promise, doc,
                parseTestPath = resourcesPath + "parse-test.sly",
                eventSpy = jasmine.createSpyObj("eventSpy", ['expr', 'operator', 'value', 'block']);
            $(language).on("parsedSlyExpression", eventSpy.expr);
            $(language).on("parsedSlyValue", eventSpy.value);
            $(language).on("parsedSlyOperator", eventSpy.operator);
            $(language).on("parsedSlyBlock", eventSpy.block);
            
            runs(function () {
                waitsForDone(DocumentManager.getDocumentForPath(parseTestPath).done(function (_doc) {
                    doc = _doc;
                }), "get document");
            });

            runs(function () {
                expect(language.__testonly__parse(doc)).toBe(true);
                expect(eventSpy.expr.callCount).toBe(6);
                expect(eventSpy.value.callCount).toBe(4);
                expect(eventSpy.operator.callCount).toBe(3);
                expect(eventSpy.block.callCount).toBe(4);
            });
        });
        it("sends parsedSlyAttributeName with start & end of the attribute when parsing a line");
        it("sends correct number of events when a line only is changed (propagateLineChanges)", function () {
            var promise,
                changedLine = "<ul data-sly-use.myUse='com.my.use' data-sly-test.abc='${expression.check}' data-sly-list.blah='${resource.listChildren}'>",
                spyChange = jasmine.createSpy(),
                spyAttNames = jasmine.createSpy(),
                negateTestChangeList = {
                    "from": {"line": 1, "ch": 57},
                    "to": {"line": 1, "ch": 57},
                    "text": ["!"],
                    "removed": [""],
                    "origin": "paste"
                };
            $(language).on("parsedSlyAttributeName", spyAttNames);
            $(language).on("changedLine", spyChange);
            runs(function () {
                language.__testonly__propagateLineChanges(negateTestChangeList, changedLine);
                expect(spyAttNames.callCount).toBe(3);
                expect(spyChange.callCount).toBe(1);
            });
        });
    });
});