/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/
(function (){
    'use strict';

    var FilterRule = require('./FilterRule'),
        Constants = require('./Constants'),
        FilterAction = {
            INCLUDE : 'include',
            EXCLUDE : 'exclude'
        };

    /**
     * A <code>Filter</code> represents a single 'filter' entry from an Apache Jackrabbit FileVault filter-vlt.xml / filter.xml file, that
     * describes how the content of a root path should be treated with regards to importing it into a content repository.
     *
     * @param {String} root the filter's root path
     * @param {FilterRule[]} rules the 'include' / 'exclude' rules
     * @constructor
     */
    function Filter(root, rules) {
        this.root = root;
        this.rules = rules;
        this._action = _getDefaultAction(rules);
    }

    /**
     * Checks if a path belonging to a jcr_root can be synced according to this filter or not.
     *
     * @param {String} path the path to check
     * @returns {Number} see {@link Constants}
     */
    Filter.prototype.getSyncStatus = function (path) {
        var shouldSync = Constants.sync.FILTER_IGNORED,
            i;
        if (_startsWith(path, this.root)) {
            var matchedRulePattern = false;
            for (i = 0; i < this.rules.length; i++) {
                var rule = this.rules[i];
                if (rule.pattern.test(path)) {
                    matchedRulePattern = true;
                    if (rule.type === FilterRule.INCLUDE_RULE) {
                        shouldSync = Constants.sync.FILTER_INCLUDED;
                    } else if (rule.type === FilterRule.EXCLUDE_RULE) {
                        shouldSync = Constants.sync.FILTER_EXCLUDED;
                    }
                }
            }
            if (!matchedRulePattern) {
                if (this._action === FilterAction.INCLUDE) {
                    shouldSync = Constants.sync.FILTER_INCLUDED;
                } else if (this._action === FilterAction.EXCLUDE) {
                    shouldSync = Constants.sync.FILTER_EXCLUDED;
                }
            }
        }
        return shouldSync;
    };

    /**
     * Checks if <code>string</code> starts with <code>prefix</code>.
     *
     * @param {String} string the string
     * @param {String} prefix the prefix
     * @returns {boolean} <code>true</code> if the <code>string</code> starts with <code>prefix</code>, <code>false</code> otherwise
     * @private
     */
    function _startsWith(string, prefix) {
        return string.indexOf(prefix) === 0;
    }

    /**
     * Analyses the filter's rules and returns its default action.
     *
     * @param {FilterRule[]} rules the filter's rules
     * @returns {String} the filter's action
     * @private
     */
    function _getDefaultAction(rules) {
        if (rules && rules.length && rules.length > 0) {
            var firstRule = rules[0];
            if (firstRule.type === FilterRule.INCLUDE_RULE) {
                return FilterAction.EXCLUDE;
            } else if (firstRule.type === FilterRule.EXCLUDE_RULE) {
                return FilterAction.INCLUDE;
            }
        }
        return FilterAction.INCLUDE;
    }

    module.exports = Filter;
}());