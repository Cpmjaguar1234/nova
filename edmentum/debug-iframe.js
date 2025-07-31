// debug-iframe.js

// ==UserScript==
// @name         Debug Iframe
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Logs detailed information about the iframe with id="content-iframe"
// @author       You
// @match        *://*.edmentum.com/*
// @grant        unsafeWindow
// @grant        GM_log
// @connect      *
// ==/UserScript==

(function() {
    const iframe = document.getElementById('content-iframe');

    if (!iframe) {
        GM_log('Iframe with ID "content-iframe" not found.');
        return;
    }

    GM_log('--- Iframe Details ---');
    GM_log('Iframe Element:', iframe);
    GM_log('Iframe Source (src):', iframe.src);
    GM_log('Iframe Loaded (readyState):', iframe.readyState);
    GM_log('Iframe Content Document:', iframe.contentDocument);
    GM_log('Iframe Content Window:', iframe.contentWindow);

    if (iframe.contentDocument) {
        GM_log('  - contentDocument.readyState:', iframe.contentDocument.readyState);
        GM_log('  - contentDocument.URL:', iframe.contentDocument.URL);
        GM_log('  - contentDocument.body:', iframe.contentDocument.body);
        if (iframe.contentDocument.body) {
            GM_log('  - contentDocument.body.innerHTML (first 500 chars):', iframe.contentDocument.body.innerHTML.substring(0, 500) + '...');
            GM_log('  - contentDocument.body.outerHTML (first 500 chars):', iframe.contentDocument.body.outerHTML.substring(0, 500) + '...');
        }
        GM_log('  - contentDocument.head:', iframe.contentDocument.head);
        GM_log('  - contentDocument.title:', iframe.contentDocument.title);
        GM_log('  - contentDocument.characterSet:', iframe.contentDocument.characterSet);
        GM_log('  - contentDocument.contentType:', iframe.contentDocument.contentType);
        GM_log('  - contentDocument.domain:', iframe.contentDocument.domain);
        GM_log('  - contentDocument.lastModified:', iframe.contentDocument.lastModified);
    } else {
        GM_log('Iframe contentWindow is null or not accessible.');
        GM_log('Iframe contentDocument is null or not accessible.');
    }

    if (iframe.contentWindow) {
        GM_log('  - contentWindow.location.href:', iframe.contentWindow.location.href);
        GM_log('  - contentWindow.innerWidth:', iframe.contentWindow.innerWidth);
        GM_log('  - contentWindow.innerHeight:', iframe.contentWindow.innerHeight);
    } else {
        GM_log('Iframe contentWindow is null or not accessible.');
    }

    // Check for specific elements within the iframe if it's ready
    if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete' && iframe.contentDocument.body) {
        const sbsNextButton = iframe.contentDocument.querySelector('#sbsNext');
        GM_log('  - #sbsNext button in iframe:', sbsNextButton);
        if (sbsNextButton) {
            GM_log('    - #sbsNext button computed style:', window.getComputedStyle(sbsNextButton));
        }
    }

    GM_log('--- End Iframe Details ---');
})();