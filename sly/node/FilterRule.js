/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/
(function (){
    'use strict';

    /**
     * A <code>FilterRule</code> represents an 'include' / 'exclude' single entry for a 'filter' tag from an Apache Jackrabbit FileVault
     * filter.xml file.
     *
     * @param {String} type the rule's type (see {@link FilterRule#INCLUDE_RULE}, {@link FilterRule#EXCLUDE_RULE})
     * @param {RegExp} pattern the rule's pattern
     * @constructor
     */
    function FilterRule(type, pattern) {
        this.type = type;
        this.pattern = pattern;
    }

    /**
     * Constant for 'include' rule type.
     * @type {string}
     */
    FilterRule.INCLUDE_RULE = 'include';

    /**
     * Constant for 'exclude' rule type.
     * @type {String}
     */
    FilterRule.EXCLUDE_RULE = 'exclude';

    module.exports = FilterRule;
}());