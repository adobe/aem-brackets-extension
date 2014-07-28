/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/

/**/
/* Sightly Extension unit tests*/
/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global brackets,define, $, jasmine, describe, beforeFirst, afterLast, afterEach, it, runs, waitsFor, expect, waitsForDone */
define(function (require, exports, module) {
    "use strict";
    describe("All Sightly Tests", function () {
        require("sly-tests/SightlyLanguageTest");
        require("sly-tests/BeanManagerTest");
        require("sly-tests/SightlyCodeHintTest");
    });
});