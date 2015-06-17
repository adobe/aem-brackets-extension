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
    BUTTON_CANCEL                                    : 'Revocare',

    // Menus
    // -- top level
    MENU_PROJECT_SETTINGS                            : 'Setările Proiectului...',
    MENU_EXPORT_CONTENT_PACKAGE                      : 'Exportați Content Package-ul pe Server',
    MENU_IMPORT_CONTENT_PACKAGE                      : 'Importați Content Package-ul de pe Server',

    // -- contextual menus
    CONTEXTUAL_PULL_REMOTE                           : 'Importați de pe Server',
    CONTEXTUAL_PUSH_REMOTE                           : 'Exportați pe Server',
    CONTEXTUAL_OPEN_REMOTE                           : 'Deschideți pe Server',

    // Project Settings dialogue
    PROJECT_SETTINGS                                 : 'Setările Proiectului',
    PROJECT_SETTING_SERVER_URL                       : 'URL Server',
    PROJECT_SETTING_REMOTE_USER                      : 'Utilizator',
    PROJECT_SETTING_REMOTE_USER_PASSWORD             : 'Parolă',
    PROJECT_SETTING_AUTO_SYNC                        : 'Sincronizare automată a schimbărilor de pe disc către server',
    PROJECT_SETTING_SERVER_URL_HINT                  : 'http://localhost:4502',
    PROJECT_SETTING_REMOTE_USER_HINT                 : 'admin',
    PROJECT_SYNCHRONISATION_SETTINGS                 : 'Setări de Sincronizare',
    PROJECT_SETTING_SERVER_URL_ERROR_MISSING         : 'Vă rugăm să introduceți URL-ul serverului.',
    PROJECT_SETTING_SERVER_URL_ERROR_INVALID_PROTOCOL: 'URL-ul serverului are un protocol invalid.',
    PROJECT_SETTING_SERVER_URL_ERROR_UNKNOWN         : 'Eroare necunoscută: URL Server.',
    PROJECT_SETTING_SERVER_URL_ERROR_INVALID_CHAR    : 'Caracterele speciale precum \'{0}\' trebuie să fie %-codificate.',
    PROJECT_SETTING_REMOTE_USER_ERROR_EMPTY          : 'Vă rugăm să introduceți utilizatorul.',
    PROJECT_SETTING_REMOTE_USER_PASSWORD_ERROR_EMPTY : 'Vă rugăm să introduceți parola.',
    PROJECT_SETTING_ACCEPT_SELF_SIGNED_CERTIFICATES  : 'Acceptați certificate care nu sunt semnate de CA',

    // Synchronisation indicator tooltip
    SYNC_FULL                                        : 'Toate fișierele selectate au fost sincronizate cu succes.',
    SYNC_PARTIAL                                     : 'Unele dintre fișierele selectate nu au fost sincronizate cu succes.',
    SYNC_NONE                                        : 'Niciunul dintre fișierele selectate nu a fost sincronizat.',
    SYNC_IN_PROGRESS                                 : 'Fișierele selectate de dumneavoastră se sincronizează.',

    // Synchronisation report dialogue
    SYNC_STATUS                                      : 'Stare Sincronizare',
    SYNC_STATUS_TH_FILE                              : 'Fișier',
    SYNC_STATUS_TH_STATUS                            : 'Stare Sincronizare',
    SYNC_STATUS_TH_TIME                              : 'Timp',
    SYNC_STATUS_IMPORTED                             : 'importat',
    SYNC_STATUS_EXPORTED                             : 'exportat',
    SYNC_STATUS_IGNORED                              : 'ignorat de către configurarea filtrului',
    SYNC_STATUS_EXCLUDED                             : 'exclus de către configurarea filtrului',
    SYNC_STATUS_EXCLUDED_VLT                         : 'fișier vlt sau fișier exclus de către .vltignore',
    SYNC_STATUS_DELETED_FROM_REMOTE                  : 'șters - fișierul a fost șters pe server',

    // Synchronization panel
    SYNC_PANEL_CLEAR                                 : 'Șterge rezultate'

});
