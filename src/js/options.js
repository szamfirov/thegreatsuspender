/*global chrome */
(function () {
    'use strict';

    var gsStorage = chrome.extension.getBackgroundPage().gsStorage;
    var gsUtils = chrome.extension.getBackgroundPage().gsUtils;
    var tgs = chrome.extension.getBackgroundPage().tgs;
    var elementPrefMap = {
        'preview': gsStorage.SCREEN_CAPTURE,
        'forceScreenCapture': gsStorage.SCREEN_CAPTURE_FORCE,
        'onlineCheck': gsStorage.ONLINE_CHECK,
        'batteryCheck': gsStorage.BATTERY_CHECK,
        'unsuspendOnFocus': gsStorage.UNSUSPEND_ON_FOCUS,
        'dontSuspendPinned': gsStorage.IGNORE_PINNED,
        'dontSuspendForms': gsStorage.IGNORE_FORMS,
        'dontSuspendAudio': gsStorage.IGNORE_AUDIO,
        'ignoreCache': gsStorage.IGNORE_CACHE,
        'addContextMenu': gsStorage.ADD_CONTEXT,
        'syncSettings': gsStorage.SYNC_SETTINGS,
        'timeToSuspend': gsStorage.SUSPEND_TIME,
        'theme': gsStorage.THEME,
        'whitelist': gsStorage.WHITELIST
    };

    function selectComboBox(element, key) {
        var i,
            child;

        for (i = 0; i < element.children.length; i += 1) {
            child = element.children[i];
            if (child.value === key) {
                child.selected = 'true';
                break;
            }
        }
    }

    //populate settings from synced storage
    function initSettings() {

        var optionEls = document.getElementsByClassName('option'),
            pref,
            element,
            i;

        for (i = 0; i < optionEls.length; i++) {
            element = optionEls[i];
            pref = elementPrefMap[element.id];
            gsUtils.log('-> options: ', pref, gsStorage.getOption(pref));
            populateOption(element, gsStorage.getOption(pref));
        }

        setForceScreenCaptureVisibility(gsStorage.getOption(gsStorage.SCREEN_CAPTURE) !== '0');
        setAutoSuspendOptionsVisibility(gsStorage.getOption(gsStorage.SUSPEND_TIME) > 0);
        setSyncNoteVisibility(!gsStorage.getOption(gsStorage.SYNC_SETTINGS));
    }

    function populateOption(element, value) {
        if (element.tagName === 'INPUT' && element.hasAttribute('type') && element.getAttribute('type') === 'checkbox') {
            element.checked = value;

        } else if (element.tagName === 'SELECT') {
            selectComboBox(element, value);

        } else if (element.tagName === 'TEXTAREA') {
            element.value = value;
        }
    }

    function getOptionValue(element) {
        // TODO switch statement?
        if (element.tagName === 'INPUT' && element.hasAttribute('type') && element.getAttribute('type') === 'checkbox') {
            return element.checked;
        }
        if (element.tagName === 'SELECT') {
            return element.children[element.selectedIndex].value;
        }
        if (element.tagName === 'TEXTAREA') {
            return element.value;
        }
    }

    function setForceScreenCaptureVisibility(visible) {
        if (visible) {
            document.getElementById('forceScreenCaptureContainer').style.display = 'block';
        } else {
            document.getElementById('forceScreenCaptureContainer').style.display = 'none';
        }
    }

    function setSyncNoteVisibility(visible) {
        if (visible) {
            document.getElementById('syncNote').style.display = 'block';
        } else {
            document.getElementById('syncNote').style.display = 'none';
        }
    }

    function setAutoSuspendOptionsVisibility(visible) {
        Array.prototype.forEach.call(document.getElementsByClassName('autoSuspendOption'), function (el) {
            if (visible) {
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        });
    }

    function handleChange(element) {
        return function () {
            var pref = elementPrefMap[element.id],
                interval;

            //add specific screen element listeners
            if (pref === gsStorage.SCREEN_CAPTURE) {
                setForceScreenCaptureVisibility(getOptionValue(element) !== '0');

            } else if (pref === gsStorage.SUSPEND_TIME) {
                interval = getOptionValue(element);
                setAutoSuspendOptionsVisibility(interval > 0);

            } else if (pref === gsStorage.SYNC_SETTINGS) {
                // we only really want to show this on load. not on toggle
                if (getOptionValue(element)) {
                    setSyncNoteVisibility(false);
                }
            }

            var valueChanged = saveChange(element);
            if (valueChanged) {
                gsStorage.syncSettings();
                var prefKey = elementPrefMap[element.id];
                gsUtils.performPostSaveUpdates([prefKey]);
            }
        };
    }

    function saveChange(element) {

        var pref = elementPrefMap[element.id],
            oldValue = gsStorage.getOption(pref),
            newValue = getOptionValue(element);

        //clean up whitelist before saving
        if (pref === gsStorage.WHITELIST) {
            newValue = gsUtils.cleanupWhitelist(newValue);
        }

        //save option
        gsStorage.setOption(elementPrefMap[element.id], newValue);

        return (oldValue !== newValue);
    }

    gsUtils.documentReadyAndLocalisedAsPromsied(document).then(function () {

        initSettings();

        var optionEls = document.getElementsByClassName('option'),
            element,
            i;

        //add change listeners for all 'option' elements
        for (i = 0; i < optionEls.length; i++) {
            element = optionEls[i];
            if (element.tagName === 'TEXTAREA') {
                element.addEventListener('input', handleChange(element), false);
            } else {
                element.onchange = handleChange(element);
            }
        }

        //hide incompatible sidebar items if in incognito mode
        if (chrome.extension.inIncognitoContext) {
            Array.prototype.forEach.call(document.getElementsByClassName('noIncognito'), function (el) {
                el.style.display = 'none';
            });
            window.alert(chrome.i18n.getMessage('js_options_incognito_warning'));
        }
    });

    //listen for background events
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        switch (request.action) {

        case 'reloadOptions':
            initSettings();
            return false;
        }
    });
}());
