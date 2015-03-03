# AEM Brackets Extension
![](https://raw.githubusercontent.com/wiki/adobe-marketing-cloud/aem-sightly-brackets-extension/screenshots/brackets.png)

This extension provides a smooth and easy way for front-end web developers to edit the designs of AEM components and client libraries by leveraging the [Extract](http://www.adobe.com/creativecloud/extract.html) features. This gives access from within the code editor to design information of a PSD comp, like assets, colors, fonts and mesurements. This extension provides in particular an automatic synchronisation to the AEM development instance, which makes it particularily easy for developers to get started on AEM projects.

## Main features
* Automatic synchronization ton AEM of changed files.
* Manual synchronization back from AEM of selected file or folder.
* [Sightly](https://docs.adobe.com/docs/en/aem/6-0/develop/sightly.html) syntax-highlighting and auto-completion

## Installation and usage
Please refer to the [documentation page](http://docs.adobe.com/docs/en/dev-tools/sightly-brackets.html).

## Known Issues or Limitations
* Embedded content packages are not supported.
* `filter-vlt.xml` files are not yet taken into consideration.
* When synchronising a full content package, only the `filter.xml` file from the `META-INF/vault` folder is used as the extension builds ad-hoc content packages that get installed and removed from your AEM instance; therefore your content package's definition is not altered but its content is updated.

## Sample Application
A sample application built with Brackets and the AEM Brackets Extension is available at [https://github.com/Adobe-Marketing-Cloud/aem-sightly-sample-todomvc](https://github.com/Adobe-Marketing-Cloud/aem-sightly-sample-todomvc "Sightly TodoMVC Example").

## Reporting Bugs
Please report any issues you encounter using GitHub's issue tracker from [https://github.com/Adobe-Marketing-Cloud/aem-sightly-brackets-extension/issues](https://github.com/Adobe-Marketing-Cloud/aem-sightly-brackets-extension/issues).

In order to help us investigate the reported issues, please include, at minimum, the following information:

1. Brackets version (e.g. sprint 42)
2. AEM Brackets Extension version (e.g. 0.0.4)
3. OS and architecture (e.g. Windows 8.1 x64, Mac OS X 10.9.4, Ubuntu 14.04 32-bit, etc.)
4. a brief list of steps to reproduce the issue; in case there's a complex setup involved, please provide a testing content-package)
5. the expected outcome
6. the actual outcome

You can use the following Markdown template:
```markdown
**Brackets version:** sprint 42  
**AEM Brackets Extension:** 0.0.4  
**OS and architecture:** Windows 8.1 x64  

#### Steps to reproduce:
1. use content package [my-content](http://www.example.com/my-content.zip)
2. step 2
3. step 3

#### Expected outcome
It works!

#### Actual outcome
It actually doesn't...
```

## Development
The AEM Brackets Extension is a Node.js module. The following steps need to be followed if you want to start hacking on new features:

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
