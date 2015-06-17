/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/

/* manage extension preferences */
/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, Mustache, PathUtils */

define(function (require, exports, module) {
    'use strict';
    var PreferenceManager             = brackets.getModule('preferences/PreferencesManager'),
        ExtensionUtils                = brackets.getModule('utils/ExtensionUtils'),
        NodeDomain                    = brackets.getModule('utils/NodeDomain'),
        Dialogs                       = brackets.getModule('widgets/Dialogs'),
        StringUtils                   = brackets.getModule('utils/StringUtils'),
        SlyDomain                     = new NodeDomain('sly', ExtensionUtils.getModulePath(module, '../node/SlyDomain')),
        ProjectSettingsDialogTemplate = require('text!./project-settings-dialog.html'),
        Strings                       = require('strings'),
        slyPreferences                = PreferenceManager.getExtensionPrefs('sly'),
        DEFAULT_SERVER_URL            = 'http://localhost:4502',
        DEFAULT_USER                  = 'admin',
        DEFAULT_PASSWORD              = 'admin',
        DEFAULT_AUTO_SYNC             = true,
        validators = {},
        scopes = {};

    validators.serverUrl = function(url) {
        if (url === '') {
            return Strings.PROJECT_SETTING_SERVER_URL_ERROR_MISSING;
        }
        var obj = PathUtils.parseUrl(url);
        if (!obj) {
            return Strings.PROJECT_SETTING_SERVER_URL_ERROR_UNKNOWN;
        }
        if (obj.href.search(/^(http|https):\/\//i) !== 0) {
            return Strings.PROJECT_SETTING_SERVER_URL_ERROR_INVALID_PROTOCOL;
        }
        var index;
        if ((index = url.search(/[ \^\[\]\{\}<>\\"\?]+/)) !== -1) {
            return StringUtils.format(Strings.PROJECT_SETTING_SERVER_URL_ERROR_INVALID_CHAR, url[index]);
        }
        return '';
    };

    validators.remoteUser = function(user) {
        if (user === '') {
            return Strings.PROJECT_SETTING_REMOTE_USER_ERROR_EMPTY;
        }
        return '';
    };

    validators.remoteUserPassword = function(password) {
        if (password === '') {
            return Strings.PROJECT_SETTING_REMOTE_USER_PASSWORD_ERROR_EMPTY;
        }
        return '';
    };

    scopes.serverUrl = 'project';
    scopes.remoteUser = 'project';
    scopes.remoteUserPassword = 'project';
    scopes.acceptSelfSignedCertificates = 'project';
    scopes.autoSync = 'project';
    scopes.syncedLanguages = 'user';


    /* get a preference */
    function get(pref) {
        var scope = scopes[pref] !== undefined ? scopes[pref] : 'default';
        var context = {
            location: {
                scope: scope
            },
            scopeOrder: ['project', 'user']
        };
        return slyPreferences.get(pref, context);
    }

    function getRemote() {
        return get('serverUrl') || DEFAULT_SERVER_URL;
    }

    function acceptSelfSignedCertificates() {
        return get('acceptSelfSignedCertificates');
    }

    function getRemoteUser() {
        return get('remoteUser') || DEFAULT_USER;
    }

    function getRemotePassword() {
        return get('remoteUserPassword') || DEFAULT_PASSWORD;
    }

    function getSyncedLanguages() {
        return get('syncedLanguages');
    }

    function getAutoSync() {
        var autoSync = get('autoSync');
        if (autoSync === undefined) {
            return DEFAULT_AUTO_SYNC;
        }
        return autoSync;
    }

    function load(SLYDictionary) {
        SlyDomain.exec('setRemote', getRemote(), getRemoteUser(), getRemotePassword(), acceptSelfSignedCertificates());
    }

    function openProjectPreferences(errorMessage) {
        var dialog,
            templateVars,
            formData;
        templateVars = {
            Strings : Strings,
            serverUrl : getRemote(),
            remoteUser : getRemoteUser(),
            remoteUserPassword : getRemotePassword(),
            autoSync: getAutoSync(),
            acceptSelfSignedCertificates: acceptSelfSignedCertificates(),
            errorMessage : errorMessage
        };
        dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(ProjectSettingsDialogTemplate, templateVars));
        dialog.getElement().find('input')[0].focus();
        dialog.done(function(id) {
            if (id === Dialogs.DIALOG_BTN_OK) {
                formData = dialog.getElement().find('form').serializeArray();
                ['acceptSelfSignedCertificates', 'autoSync'].forEach(function (box) {
                    var found = false;
                    formData.forEach(function (input) {
                        if (input.name === box && input.value === 'on') {
                            input.value = true;
                            found = true;
                        }
                    });
                    if (!found) {
                        formData.push({name: box, value: false});
                    }
                });
                var validationResult = _validatePreferencesForm(formData);
                if (validationResult === '') {
                    formData.forEach(function(entry) {
                        slyPreferences.set(entry.name, entry.value, {
                            location: {
                                scope: scopes[entry.name] ? scopes[entry.name] : 'default'
                            }
                        });
                    });
                } else {
                    openProjectPreferences(validationResult);
                }
            }
        });
    }

    /**
     * Validates the form data from the Project Preferences dialog.
     * @param {Array.<{name: String, value: String}>} formData the serialised form data array
     * @returns {String} the error message if an error is detected; empty string otherwise
     * @private
     */
    function _validatePreferencesForm(formData) {
        var i,
            field,
            validator;
        for (i = 0; i < formData.length; i++) {
            field = formData[i];
            validator = validators[field.name];
            if (validator) {
                if (validator instanceof Function) {
                    var result = validator.call(undefined, field.value);
                    if (result) {
                        return result;
                    }
                } else {
                    console.error('Invalid validator type detected.');
                }
            }
        }
        return '';
    }

    slyPreferences.on(
        'change', function (err, data) {
            SlyDomain.exec('setRemote', getRemote(), getRemoteUser(), getRemotePassword(), acceptSelfSignedCertificates());
        }
    );

    exports.load = load;
    exports.get = get;
    exports.getRemote = getRemote;
    exports.getSyncedLanguages = getSyncedLanguages;
    exports.getRemoteUser = getRemoteUser;
    exports.getRemotePassword = getRemotePassword;
    exports.getAutoSync = getAutoSync;
    exports.acceptSelfSignedCertificates = acceptSelfSignedCertificates;
    exports.openProjectPreferences = openProjectPreferences;
});
