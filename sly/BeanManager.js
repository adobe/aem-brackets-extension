/*******************************************************************************
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 ******************************************************************************/

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $ */
define(function (require, exports, module) {
    "use strict";
    //constants
    // Load dependent modules
    var initBeans,
        initBeanClasses,
        beans,
        beanClasses,
        sightlyLanguage = require("sly/SightlyLanguage"),
        editorManager   = brackets.getModule("editor/EditorManager"),
        HTMLUtils       = brackets.getModule("language/HTMLUtils"),
        prefs           = require("sly/preferences/Preferences"),
        highlighter     = require("sly/Highlighter"),
        remoteSyncMgr   = require("sly/RemoteSyncManager"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        slyConstants,
        removedBlocks = {};

    /**
     * @constructor
     */
    function BeanManager() {
    }

    /**
     * Registers a bean declared at a given place
     */
    function registerBeanInstance(name, beanClass, start, end) {
        try {
            beans[name] = {
                name : name,
                clazz : beanClass,
                start : start,
                end : end
            };
            if (!beanClasses[beanClass]) {
                beanClasses[beanClass] = {};//in that case, we register an empty instance
                                            //of the class
            }
        } catch (e) {
            console.error("unable to register bean instance: " + e);
        }
    }

    /**
     * registers a list bean for the block
     */
    function registerListInstance(attName, attValue, startPos, endPos, isRepeat) {
        var list = isRepeat ? slyConstants.REPEAT : slyConstants.LIST,
            name = sightlyLanguage.extractBeanVarName(attName);
        name = name === null ? list.DEFAULT_NAME : name;
        if (!beanClasses[list.DECL]) {
             beanClasses[list.DECL] = list.CLASS;
         }
         registerBeanInstance(name, list.DECL, startPos, endPos);
    }

    /* from a given local js bean class file, extract the bean class object & registers it */
    function _registerLocalJSBeanClass(path) {
        /*TODO DocumentManager.getDocumentForPath(path)
        .done(function(doc){
            var reg = new RegExp(slyConstants.LOCAL_BEAN_JS.RETURN_OBJECT_REGEXP, "gm"),
                match;
            if ((match = reg.exec(doc.getText())) !== null) {
                //we try to extract & build the array of first level methods names
                var beanClass = {
                        members : []
                    };
                    buffer = doc.getText().substring(reg.lastIndex),
                    declare = buffer.indexOf(":"),
                    open, close, next;
                while (declare > 0) {
                    beanClass.members.push(buffer.substring(0, declare).replace(/\s\n\"\'/g,"");
                    buffer = buffer.substring(declare + 1);
                }
                var returnObject = JSON.parse(jsonString),

                $.each(returnObject, function (key, value) {
                    beanClass.members.push({"name": key}); //for now we just register first level
                });
                beanClasses[doc.file.name] = beanClass;
            }
        });*/
    }

    /* from a given local java bean class file, extract the bean class object & registers it */
    function _registerLocalJavaBeanClass(path) {
        /*TODO*/
    }

    /* refreshes the beans for a given doc: defaults beans, and available bean classes */
    function _refreshBeans(event, doc) {
        beanClasses = $.extend(true, {}, initBeanClasses);
        $.ajax({url: prefs.getRemote() + "/etc/clientlibs/granite.sightlyBeans.json", dataType: "json"})
            .done(function (remoteBeans) {
                //at that moment, classes might have been filled already, with empty object
                $.each(remoteBeans, function (className, classObject) {
                    beanClasses[className] = classObject;
                });
            });
        remoteSyncMgr.findNeighbours(doc).done(function (paths) {
            var jsBeanRegexp = new RegExp(slyConstants.LOCAL_BEAN_JS.REGEX, "gm"),
                javaBeanRegexp = new RegExp(slyConstants.LOCAL_BEAN_JAVA.REGEX, "gm");
            $.each(paths, function (index, path) {
                if (jsBeanRegexp.test(path)) {
                    _registerLocalJSBeanClass(path);
                } else if (javaBeanRegexp.test(path)) {
                    _registerLocalJavaBeanClass(path);
                }
            });
        });
        beans = $.extend(true, {}, initBeans);
    }

    /**
     * parsed sly block: we register beans (and specific list ones)
     */
    function _onParsedSlyBlock(event, tag) {
        $.each(Object.keys(tag.attributes), function (index, key) {
            if (key.indexOf(slyConstants.BEAN_DECL) === 0) {
                var name = sightlyLanguage.extractBeanVarName(key);
                if (name !== null) {
                    registerBeanInstance(name, tag.attributes[key].value, tag.start);
                }
            }

            if (key.indexOf(slyConstants.LIST.DECL) === 0 || key.indexOf(slyConstants.REPEAT.DECL) === 0) {
                registerListInstance(key, tag.attributes[key].value, tag.start, tag.blockEndPos, key.indexOf(slyConstants.REPEAT.DECL) === 0);
            }
        });
    }

    /**
     * we remove all the beans registered on that line, further event will re-register them
     */
    function _onChangedLine(event, line) {
        try {
            var removedBeans = [];
            $.each(beans, function (key, bean) {
                if (bean.start && bean.start.line === line) {
                    removedBeans.push(bean);
                }
            });
            $.each(removedBeans, function (index, bean) {
                if (bean.end) {
                    //block bean: we save it in order to keep "end" information
                    removedBlocks[bean.name] = bean;
                }
                delete beans[bean.name];
            });
        } catch (e) {
            console.log("unable to reset the line: " + e);
        }
    }

    function _reRegisterBean(attName, attValue, start) {
        var beanName = sightlyLanguage.extractBeanVarName(attName);
        if (attName.indexOf(slyConstants.LIST.DECL) === 0 || attName.indexOf(slyConstants.REPEAT.DECL) === 0) {
            //list
            var end;
            if (removedBlocks[beanName]) {
                end = removedBlocks[beanName].end;
                removedBlocks[beanName] = null;
            } else {
                console.warn(beanName + " list bean can't be found, the scope won't end at the end of the block");
            }
            registerListInstance(attName, attValue, start, end, attName.indexOf(slyConstants.REPEAT.DECL) === 0);
        } else {
            //normal
            registerBeanInstance(beanName, attValue, start);
        }
    }


    /**
     * event received on a line re-parsing: we re-register the beans
     */
    function _onParsedAttributeName(event, start) {
        try {
            var editor  = editorManager.getActiveEditor(),
                tagInfo = HTMLUtils.getTagInfo(editor, start),
                attName = tagInfo.attr.name,
                attValue = tagInfo.attr.value;
            _reRegisterBean(attName, attValue, start);
        } catch (e) {
            console.log("unable to treat event " + e);
        }
    }

    function getBeans() {
        return beans;
    }

    /**
     * return an array of beans available at the cursor position (beans
     * declared *after* the cursor are not available
     */
    function getBeansAt(cursor) {
        var availableBeans = [];
        $.each(beans, function (key, bean) {
            if (!bean.start) {
                availableBeans.push(key);
            } else {
                if ((bean.start.line < cursor.line) ||
                        ((bean.start.line === cursor.line) &&
                        (bean.start.ch < cursor.ch))) {
                    if (!bean.end) {
                        availableBeans.push(key);
                    } else {
                        if ((bean.end.line > cursor.line) ||
                                ((bean.end.line === cursor.line) &&
                                (bean.end.ch > cursor.ch))) {
                            availableBeans.push(key);
                        }
                    }
                }
            }
        });
        return availableBeans;
    }

    /**
     * Get bean classes available (i.e. not hidden)
     */
    function getBeanClasses() {
        var publicClasses = {};
        $.each(beanClasses, function (name, clazz) {
            if (!clazz.hidden) {
                publicClasses[name] = clazz;
            }
        });
        return publicClasses;
    }

    /**
     * get one beans member names' list
     * use
     */
    function getBeanMembers(beanName) {
        var members = [],
            bean = beans[beanName];
        if (bean && beanClasses[bean.clazz] && beanClasses[bean.clazz].members) {
            $.each(beanClasses[bean.clazz].members, function (index, member) {
                members.push(member.name);
            });
        }
        return members;
    }

    function load(SLYDictionnary) {
        initBeans = SLYDictionnary.beans;
        initBeanClasses = SLYDictionnary.beanClasses;
        slyConstants = SLYDictionnary.constants;
        $(sightlyLanguage).on("refreshSlyDoc", _refreshBeans);
        $(sightlyLanguage).on("parsedSlyBlock", _onParsedSlyBlock);
        $(sightlyLanguage).on("changedLine", _onChangedLine);
        $(sightlyLanguage).on("parsedSlyAttributeName", _onParsedAttributeName);
    }

    //public api
    exports.load = load;
    exports.getBeans = getBeans;
    exports.getBeansAt = getBeansAt;
    exports.getBeanClasses = getBeanClasses;
    exports.getBeanMembers = getBeanMembers;
    exports.registerBeanInstance = registerBeanInstance;
    exports.registerListInstance = registerListInstance;
    exports.__testonly__onChangedLine = _onChangedLine;
    exports.__testonly__refreshBeans = _refreshBeans;
    exports.__testonly__reRegisterBean = _reRegisterBean;
});
