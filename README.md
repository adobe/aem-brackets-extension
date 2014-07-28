#Adobe Experience Manager - Sightly Brackets Extension

[Sightly](Sightly|http://docs.adobe.com/content/docs/en/aem/6-0/develop/sightly.html "Sightly") is the new HTML templating system introduced
with Adobe Experience Manager 6.0. The AEM Sightly Brackets Extension provides a smoother development workflow for writing AEM components,
adding support for syntax-highlighting, code-completion, bi-directional synchronisation and
more.

## Installation
1. Install [Brackets](http://brackets.io)
2. Open Brackets and go to `File` > `Extension Manager…`
3. Enter 'sightly' in the search bar and look for 'AEM Sightly Brackets Extension'.
4. Click `Install`.
5. Restart Brackets when asked.
6. Open a [content-package](http://docs.adobe.com/docs/en/aem/6-0/administer/content/package-manager.html "How to Work With Packages")
  project and start hacking.

## Features
1. Sightly syntax
  * Sightly syntax highlighting
  * Auto-completion for Sightly statements - `data-sly-*`
  * Basic code completion for Sightly expressions - `${}`
2. Auto-sync to AEM
  * `*.html` and `*.js` files are synced automatically to AEM upon saving them
  * editing and saving a `.content.xml` file will trigger an automated sync of the file's parent folder
3. Project Preferences
  * AEM server settings are available in the `Project Settings` dialog, accessible from the top-level `Sightly` menu (`⌘-Shift-P` on a Mac,
  `Ctrl-Shift-P` on a PC)
  * the project preferences are saved in the project's root in a `.brackets.json` file (you should commit this to your SCM system)
4. Support for `filter.xml`
  * all content projects should have a `filter.xml` file in order to support bi-directional synchronisation; the filter file is relative to
  the `jcr_root`folder of the project (`../META-INF/vault/filter.xml`)
5. Main toolbar notification icon in the right bottom corner
  * after a sync operation the notification icon's colour changes to indicate the synchronisation status:
    * green - all files have been synchronised successfully
    * yellow sync - some of the files were not synchronised successfully
    * red - none of the selected files were synchronised
    * blue - a sync operation is in progress
  * when hovering on the notification icon a tooltip will summarise the status of the last sync operation
  * clicking on the notification icon will open the `Synchronisation Status` dialog with the status of the last sync operation
6. Synchronisation
  * content can be synchronised from the project explorer through a contextual menu (`Export to Server` / `Import from Server`); the
  contextual menu is disabled for files not belonging to a `jcr_root`
  * in the top-level `Sightly` menu two entries allow synchronising the full content package (`Export Content Package` - `⌘-Shift-E` on a
  Mac, `Ctrl-Shift-E` on a PC; `Import Content Package` - `⌘-Shift-I` on a Mac, `Ctrl-Shit-I` on a PC)

