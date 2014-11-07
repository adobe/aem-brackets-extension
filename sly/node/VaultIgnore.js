/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/
(function () {

    /**
     * Compiles the positive and negative patterns from the contents of a file containing .vltignore rules.
     * @param content the contents of the file
     * @returns {{accepts: accepts, denies: denies}}
     */
    function compile(content) {
        var parsed = exports.parse(content),
            positives = parsed[0],
            negatives = parsed[1];
        return {
            accepts: function (input) {
                if (input[0] === '/') input[0] = input[0].slice(1);
                return negatives.test(input) || !positives.test(input);
            },
            denies: function (input) {
                return !this.accepts(input);
            }
        };
    }

    /**
     * Parses the contents of a file containing .vltignore rules, transforming them into regular expressions.
     * @param content the contents of the file
     * @returns {Array.<RegExp>} an array with two elements: the positives regex at position 0, the negatives regex at position 1
     */
    function parse(content) {
        return content.split('\n')
            .map(
            function (line) {
                line = line.trim();
                return line;
            }
        ).filter(
            function (line) {
                return line && line[0] !== '#';
            }
        ).reduce(
            function (lists, line) {
                var isNegative = line[0] === '!';
                if (isNegative) {
                    line = line.slice(1);
                }
                if (isNegative) {
                    lists[1].push(line);
                } else {
                    lists[0].push(line);
                }
                return lists;
            },
            [
                [],
                []
            ]
        ).map(
            function (list) {
                return list
                    .sort()
                    .map(_prepareRegexPattern);
            }
        ).map(
            function (patternsArray) {
                return new RegExp('^((' + patternsArray.join(')|(') + '))$');
            }
        );
    }

    function _prepareRegexPattern(pattern) {
        var preparedPattern = _escapeRegex(pattern).replace('**', '(.+)').replace('*', '([^\\/]*)');
        if (pattern.indexOf('*.') === 0) {
            preparedPattern = '(.*\/)?(' + preparedPattern + ')';
        } else if (pattern.indexOf('/') === 0) {
            // remove escaped forward slash
            preparedPattern = '(' + preparedPattern.slice(2) + ')(\/.*)?';
        } else if (pattern.indexOf('/') === -1) {
            preparedPattern = '(.*\/)?' + preparedPattern + '(\/.*)?';
        }
        return preparedPattern;
    }

    function _escapeRegex(pattern) {
        return pattern.replace(/[\-\[\]\/\{\}\(\)\+\?\.\\\^\$\|]/g, "\\$&");
    }

    exports.compile = compile;
    exports.parse = parse;

}());
