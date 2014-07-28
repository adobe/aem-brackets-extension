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
    var beanManager     = require("sly/BeanManager"),
        SpecRunnerUtils = brackets.getModule("spec/SpecRunnerUtils"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        SLYDefault      = require("text!sly/bootstrap/default.json"),
        SLYCQ           = require("text!sly/bootstrap/extensions/cq.json"),
        SLYSling        = require("text!sly/bootstrap/extensions/sling.json"),
        defaultJSON     = JSON.parse(SLYDefault),
        cqJSON          = JSON.parse(SLYCQ),
        slingJSON       = JSON.parse(SLYSling),
        SLYDictionnary  = $.extend(true, defaultJSON, cqJSON, slingJSON);
    
    
    describe("Sightly Bean Manager", function () {
        beanManager.load(SLYDictionnary);

        it("initializes a new set of beans at every refreshSlyDoc event", function () {
            beanManager.__testonly__refreshBeans();
            expect(beanManager.getBeans()).toBeDefined();
        });
        it("registers a bean at the correct line (registerBean)");
        it("retrieves all bean classes except the private ones (getBeanClasses)");
        it("retrieves all beans available at given line (getAt)");
        it("removes all beans from changed line (and only them) (onChangedLine)", function () {
            
            beanManager.getBeans().remove = {
                name : "remove",
                members : "null",
                start : {"line": 1, "ch": 12},
                end: {"line": 3, "ch": 21}
            };
            beanManager.getBeans().removeAnother = {
                name : "removeAnother",
                members : "null",
                start : {"line": 1, "ch": 43}
            };
            beanManager.getBeans().dontremove = {
                name : "dontremove",
                members : "null",
                start : {"line": 2, "ch": 12}
            };
            var beanCount = Object.keys(beanManager.getBeans()).length;
            beanManager.__testonly__onChangedLine(null, 1);
            expect(Object.keys(beanManager.getBeans()).length).toBe(beanCount - 2);
            expect(beanManager.getBeans().remove).not.toBeDefined();
            expect(beanManager.getBeans().dontremove).toBeDefined();
        });
        it("re registers list beans whith good scope when name is not changed", function () {
            beanManager.__testonly__reRegisterBean("data-sly-list.remove", SLYDictionnary.constants.LIST.CLASS, {"line": 1, "ch": 12});
            expect(beanManager.getBeans().remove).toBeDefined();
            expect(beanManager.getBeans().remove.end).toBeDefined();
        });
    });
});