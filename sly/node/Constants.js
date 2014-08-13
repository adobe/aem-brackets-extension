/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/
(function () {
    'use strict';

    var sync = {};

    /**
     * Allowed by filters.
     *
     * @type {number}
     */
    sync.FILTER_INCLUDED = 1;

    /**
     * Not included in filters.
     *
     * @type {number}
     */
    sync.FILTER_IGNORED = 0;

    /**
     * Excluded by filters.
     *
     * @type {number}
     */
    sync.FILTER_EXCLUDED = -1;

    /**
     * Excluded by .vltignore files or excluded by default.
     *
     * @type {number}
     */
    sync.EXCLUDED = -2;

    /**
     * Deleted from the receiving end.
     *
     * @type {number}
     */
    sync.DELETED_FROM_REMOTE = -3;

    module.exports.sync = sync;
}());
