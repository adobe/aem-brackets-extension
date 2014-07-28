/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/
/*global define, sessionStorage */
define(function (require, exports, module) {
    'use strict';

    var NS = 'brackets.sly';

    function put(key, object) {
        sessionStorage.setItem(NS + '.' + key, JSON.stringify(object));
    }

    function get(key) {
        return JSON.parse(sessionStorage.getItem(NS + '.' + key));
    }

    function remove(key) {
        var result = JSON.parse(sessionStorage.getItem(NS + '.' + key));
        sessionStorage.removeItem(NS + '.' + key);
        return result;
    }

    exports.put = put;
    exports.get = get;
    exports.remove = remove;

});