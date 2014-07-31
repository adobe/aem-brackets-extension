# AEM Sightly Brackets Extension
![](https://raw.githubusercontent.com/wiki/adobe-marketing-cloud/aem-sightly-brackets-extension/screenshots/brackets_sightly_ext_sightly.png)

[Sightly](http://docs.adobe.com/content/docs/en/aem/6-0/develop/sightly.html "Sightly") is the new HTML templating system introduced with Adobe Experience Manager 6.0. The AEM Sightly Brackets Extension provides a smoother development workflow for writing AEM components, offering several features like:

* Sightly syntax-highlighting;
* code-completion for Sightly expressions, `data-sly-*` block elements and Use-API Java objects;
* bidirectional synchronisation.

## Requirements
AEM Sightly Brackets Extension supports Brackets versions greater or equal than sprint 38. You can download a new Brackets version from [brackets.io](http://brackets.io "Brackets - The Free, Open Source Code Editor for the Web").

## How to Install the AEM Sightly Brackets Extension
1. Open Brackets. In menu **File**, select **Extension Manager…**
2. Enter `sightly` in the **search** bar and look for the `AEM Sightly Brackets Extension`.
  ![](https://raw.githubusercontent.com/wiki/adobe-marketing-cloud/aem-sightly-brackets-extension/screenshots/install_extension.png)
3. Click **Install**.
4. Restart Brackets when asked.

## Working With the AEM Sightly Brackets Extension

#### The content-package project
After the extension has been installed, you can start developing AEM components by either opening a content-package folder from your file system with Brackets or by creating the structure for one from within the editor.

The project has to contain at least:
1. a `jcr_root` folder (e.g. `myproject/jcr_root`)
2. a `filter.xml` file (e.g. `myproject/META-INF/vault/filter.xml`); for more details about the structure of the `filter.xml` file please see the [Workspace Filter definition](http://jackrabbit.apache.org/filevault/filter.html "Apache Jackrabbit FileVault Documentation").

#### Synchronisation Settings
In order to synchronise your content to and from an AEM server you need to define your Synchronisation Settings. This can be done by going to **Sightly** > **Project Settings...** The menu entry can also be accessed through shortcuts: `⌘-Shift-P` on a Mac or `Ctrl-Shift-P` on a PC.

![](https://raw.githubusercontent.com/wiki/adobe-marketing-cloud/aem-sightly-brackets-extension/screenshots/sync_settings.png)

The Synchronisation Settings allow you to define:

1. the server URL (e.g. http://localhost:4502)
2. the username used for synchronising content
3. the user's password

The settings will be saved in your project's root folder, in the .`brackets.json` file, e.g. `myproject/.brackets.json`. We don't recommend saving this file in your SCM system.

#### Synchronising Content

The AEM Sighly Brackets Extension provides two types of content synchronisation.

1. **Automated synchronisation for HTML, JavaScript, CSS and .content.xml files**; provided that the remote path of the files you are editing is allowed to be synchronised by the filtering rules defined in `filter.xml`, these files will be synced to the AEM server on-save; for `.content.xml` files their parent folders will be synchronised.
    
    ----
    **NOTE**
    Brackets has a list of predefined file extensions for the languages defined above:
    * **HTML**: html, htm, shtm, shtml, xhtml, cfm, cfml, cfc, dhtml, xht, tpl, twig, hbs, handlebars, kit, jsp, aspx, ascx, asp, master, cshtml, vbhtml
    * **JavaScript**: js, jsx, js.erb, jsm, _js
    * **CSS**: css, css.erb
    
    Therefore any documents matching Brackets' extension list for the above languages will get synchronised automatically on-save.

    ----
    
2. **On-demand bidirectional synchronisation**
    1. through the Project Explorer contextual menu entries - **Export to Server** or **Import from Server** - if the selected entry belongs to the `jcr_root` folder
    
        ![](https://raw.githubusercontent.com/wiki/adobe-marketing-cloud/aem-sightly-brackets-extension/screenshots/contextual_menu_sync.png)

        ----
        **NOTE**
        If the selected entry is a folder only the folder's content that's marked as included by the filtering rules from `filter.xml` will be synchronised.

        If the selected entry is outside of the `jcr_root` folder the **Export to Server** and **Import from Server** contextual menu entries are disabled.

        ----

    2. full content-package synchronisation through the Sightly top-level menu, by selecting either:
    
        * **Export Content Package** - `⌘-Shift-E` on a Mac, `Ctrl-Shift-E` on a PC
        * **Import Content Package** - `⌘-Shift-I` on a Mac, `Ctrl-Shift-I` on a PC

      ![](https://raw.githubusercontent.com/wiki/adobe-marketing-cloud/aem-sightly-brackets-extension/screenshots/export_content_package.png)

The AEM Sightly Brackets Extension adds a notification icon on the main toolbar, in the bottom right corner of the Brackets window. After a synchronisation operation is performed the notification icon's colour changes to indicate the synchronisation status:

* green - all files have been synchronised successfully
* yellow - some of the files were not synchronised successfully
* red - none of the selected files were synchronised
* blue - a sync operation is in progress

Hovering with your mouse cursor above the notification icon will make a tooltip appear with a summary of the last synchronisation operation.
 
Clicking on the notification icon will open the Synchronisation Status report dialog, offerring more detailed information about each file from the content tree you synchronised.

![](https://raw.githubusercontent.com/wiki/adobe-marketing-cloud/aem-sightly-brackets-extension/screenshots/sync_status_report.png)

The AEM Sightly Brackets extension also supports [.vltignore](http://docs.adobe.com/docs/en/cq/aem-how-tos/development/how-to-build-aem-projects-using-apache-maven.html#Adding Paths to the Package Without Syncing Them) files for excluding content from synchronising to and from the repository.

## Known Issues or Limitations
* Currently the AEM Sightly Brackets Extension does not support working with embedded content packages.
* `filter-vlt.xml` files are not yet taken into consideration.
* When synchronising a full content package only the `filter.xml` file from the `META-INF/vault` folder is used as the extension builds ad-hoc content packages that get installed and removed from your AEM instance; therefore your content package's definition is not altered but its content is updated.

## Sample Application
A sample application built with Brackets and the AEM Sightly Brackets Extension is available at [https://github.com/Adobe-Marketing-Cloud/aem-sightly-sample-todomvc](https://github.com/Adobe-Marketing-Cloud/aem-sightly-sample-todomvc "Sightly TodoMVC Example").

## Development
The AEM Sightly Brackets Extension is a Node.js module. The following steps need to be followed if you want to start hacking on new features:

1. install [Node.js](http://nodejs.org/ "node.js") for your platform
2. install [Apache Maven](http://maven.apache.org/ "Apache Maven") for your platform
3. clone this repository
    
    ```bash
    git clone git@github.com:Adobe-Marketing-Cloud/aem-sightly-brackets-extension.git
    ```
4. clone the `aem-sightly-ide-api` repository
    
    ```bash
    git clone git@github.com:Adobe-Marketing-Cloud/aem-sightly-ide-api.git
    ```
5. use the Maven profile from [repo.adobe.com](http://repo.adobe.com/ "Adobe Public Maven Repository")
5. in the `aem-sightly-ide-api` folder run
    
    ```bash
    mvn clean install
    ```
6. in the `aem-sightly-brackets-extension` folder run
    
    ```bash
    npm install
    ./build.sh # Alternatively just run the commands from this script if you're not on a *nix platform
    ```

## Credits
* [Nicolas Peltier](https://github.com/nicolasATadobe): Initial plug-in with Sightly support (syntax highlighting and auto-completion for expressions and statements), and synchronisation to AEM (automatic and manual import and export).
* [Radu Cotescu](https://github.com/raducotescu): Added project preferences, improved synchronisation to use the Package Manager HTTP Service API, added support for `filter.xml` rules, enhanced UI with sync notifications.
