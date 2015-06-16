/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/
/*global define*/
define({
    AEM_SLY_EXTENSION                                : 'AEM Sightly Extension',

    // Button labels
    BUTTON_OK                                        : 'OK',
    BUTTON_CANCEL                                    : 'Cancel',

    // Menus
    // -- top level
    MENU_PROJECT_SETTINGS                            : 'Project Settings...',
    MENU_EXPORT_CONTENT_PACKAGE                      : 'Export Content Package to Server',
    MENU_IMPORT_CONTENT_PACKAGE                      : 'Import Content Package from Server',

    // -- contextual menus
    CONTEXTUAL_PULL_REMOTE                           : 'Import from Server',
    CONTEXTUAL_PUSH_REMOTE                           : 'Export to Server',
    CONTEXTUAL_OPEN_REMOTE                           : 'Open on Server',

    // Project Settings dialogue
    PROJECT_SETTINGS                                 : 'Project Settings',
    PROJECT_SETTING_SERVER_URL                       : 'Server URL',
    PROJECT_SETTING_REMOTE_USER                      : 'Username',
    PROJECT_SETTING_REMOTE_USER_PASSWORD             : 'Password',
    PROJECT_SETTING_SERVER_URL_HINT                  : 'http://localhost:4502',
    PROJECT_SETTING_REMOTE_USER_HINT                 : 'admin',
    PROJECT_SYNCHRONISATION_SETTINGS                 : 'Synchronization Settings',
    PROJECT_SETTING_SERVER_URL_ERROR_MISSING         : 'Please provide a server URL.',
    PROJECT_SETTING_SERVER_URL_ERROR_INVALID_PROTOCOL: 'Invalid protocol used for the server URL.',
    PROJECT_SETTING_SERVER_URL_ERROR_UNKNOWN         : 'Unknown error: server URL.',
    PROJECT_SETTING_SERVER_URL_ERROR_INVALID_CHAR    : 'Special characters like \'{0}\' must be %-encoded.',
    PROJECT_SETTING_REMOTE_USER_ERROR_EMPTY          : 'Please provide a username.',
    PROJECT_SETTING_REMOTE_USER_PASSWORD_ERROR_EMPTY : 'Please provide a password.',
    PROJECT_SETTING_ACCEPT_SELF_SIGNED_CERTIFICATES  : 'Accept self-signed certificates for HTTPS',

    // Synchronisation indicator tooltip
    SYNC_FULL                                        : 'All selected files were synced successfully.',
    SYNC_PARTIAL                                     : 'Some of the selected files were not synced successfully.',
    SYNC_NONE                                        : 'None of the selected files were synced.',
    SYNC_IN_PROGRESS                                 : 'Your selected files are synchronizing.',

    // Synchronisation report dialogue
    SYNC_STATUS                                      : 'Synchronization Status',
    SYNC_STATUS_TH_FILE                              : 'Entry',
    SYNC_STATUS_TH_STATUS                            : 'Synchronization Status',
    SYNC_STATUS_SYNCED                               : 'synchronized',
    SYNC_STATUS_IGNORED                              : 'ignored by the filter configuration',
    SYNC_STATUS_EXCLUDED                             : 'excluded by the filter configuration',
    SYNC_STATUS_EXCLUDED_VLT                         : 'vlt file or file excluded by .vltignore pattern',
    SYNC_STATUS_DELETED_FROM_REMOTE                  : 'removed - the file was deleted on the server'

});
