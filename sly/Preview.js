/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/

/*
    Preview does add a button for previewing sly code (it generates html source in sly-preview directory, and uses Brackets HTML Preview on it)
*/


/*  These are jslint options. Using linters is recommended, but optional */
/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

define(function (require, exports, module) {    
    'use strict';

    // Configuration
    var shortcut            = "Ctrl-Shift-T";
    var commandId           = "npeltier.SLYPreview";
    var commandName         = "SLY Preview";
    var buttonColors       = {"off":"#cccccc", "on":"#4084CE"};
    
    // Load submodules

    // Load dependent modules
    var Commands            = brackets.getModule("command/Commands"),
        CommandManager      = brackets.getModule("command/CommandManager"),
        DocumentManager     = brackets.getModule("document/DocumentManager"),
        Inspector           = brackets.getModule("LiveDevelopment/Inspector/Inspector"),
        LiveDevelopment     = brackets.getModule("LiveDevelopment/LiveDevelopment"),
        KeyBindingManager   = brackets.getModule("command/KeyBindingManager"),
        ProjectManager      = brackets.getModule("project/ProjectManager"),
        NativeFileSystem    = brackets.getModule("file/NativeFileSystem").NativeFileSystem,
        FileUtils           = brackets.getModule("file/FileUtils");

    // State
    var $slyButton;
    
    function generate(src, destination) {
        var deferred = new $.Deferred(); 
        FileUtils.readAsText(src)
            .done(function(text){
                FileUtils.writeText(destination, text)
                    .done(function(){
                        deferred.resolve();
                    })
                    .fail(function(error){
                        console.error(error);
                    });  
            })
            .fail(function(error){
                console.error(error);
            });
        return deferred.promise();
    }
    
    /**
      * Create preview directory, returns its path
      */
    function createPreviewDirectory(){
        var root = ProjectManager.getProjectRoot(),
            folderName = "sly-preview",
            deferred = new $.Deferred();
        root.getDirectory(folderName, {"create":true,"exclusive":false},
            function(folderEntry){
                deferred.resolve(folderEntry);
            },
            function(errorEntry){
                deferred.reject(errorEntry);
            });  
        return deferred.promise();
    }
    
    /**
      * Indicates wether preview is on
      */    
    function isSLYPreviewOn() {
        return $slyButton.status === "on";
    }
    
    /**
      * Enable / Disable the preview (and refresh button state) 
      */
    function toggleSLYPreviewStatus() {
        $slyButton.status = isSLYPreviewOn() ? "off" : "on";
        $(".sly-preview-button").css({color: buttonColors[$slyButton.status]});
    }

    /**
     * starts the sly preview
     */
    function SLYPreview() {
        if (isSLYPreviewOn()){
            LiveDevelopment.close();
            toggleSLYPreviewStatus();
        } else {
            var document = DocumentManager.getCurrentDocument();
            if (document){
                createPreviewDirectory()
                .done(function(directory){
                    var fileName =  document.file.name,
                        newFilePath =  directory.fullPath + fileName;                 
                    directory.getFile(fileName, {"create":true, "exclusive":false},
                        function(fileEntry){
                            generate(document.file, fileEntry);
                            DocumentManager.getDocumentForPath(fileEntry.fullPath).done(function(doc){
                                DocumentManager.setCurrentDocument(doc);                            
                                LiveDevelopment.open();   
                                toggleSLYPreviewStatus();
                            });
                        }, function(error) {
                                console.error(error);    
                            });
    
                })
                .fail(function(error){
                    console.error(error);        
                });
            }
        }
    }
        
    
    /* 
        adds the SLY button
    */
    function addSLYButton() {
        // Insert the sly button in the toolbar to the left of the first a element (life preview button)
        $slyButton = $("<a>")
            .text("sly")
            .attr("title", "SLY Preview")
            .addClass("sly-preview-button")
            .click(SLYPreview)
            .css({
                "margin-right":     "10px",
                "font-weight":      "bold",
                "color":            buttonColors.off
            })
            .insertAfter("#main-toolbar .buttons a:last");
    }

    /*
        removes the SLY Button
    */
    function removeSLYButton() {
        $slyButton.remove();
    }

    function load() {
        // Register the command. This allows us to create a key binding to it
        if (!CommandManager.get(commandId)) {
            CommandManager.register(commandName, commandId, SLYPreview);
        }
        KeyBindingManager.addBinding(commandId, shortcut);

        addSLYButton();
    }
    
    function unload() {
        KeyBindingManager.removeBinding(shortcut);
        // Not possible
        //CommandManager.unregister(commandId);

        removeSLYButton();
    }

    exports.load = load;
    exports.unload = unload;
});