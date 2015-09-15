/*******************************************************************************
 * Copyright (c) 2015 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/
/*global define, brackets, $*/
define(function (require, exports, module) {
    'use strict';
    var _cache = {};

    /* Put last modified time for given file entry */
    function put(file, mtime) {
        _cache[file] = mtime;
    }

    /* Get last modified time for given file entry */
    function get(file) {
        try {
            return _cache[file];
        } catch (e) {
            return null;
        }
    }

    /* Remove everything from cache */
    function clean() {
        _cache = {};
    }

    exports.get = get;
    exports.put = put;
    exports.clean = clean;
});