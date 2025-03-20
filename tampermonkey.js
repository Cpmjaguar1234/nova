// ==UserScript==
// @name         Load Script on Button Click
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Load external script when print button is clicked
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function loadScript(url) {
        fetch(url).then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.text();
        }).then(scriptContent => {
            const scriptElement = document.createElement('script');
            scriptElement.textContent = scriptContent;
            document.head.appendChild(scriptElement);
            console.log('Script loaded and executed successfully');
        }).catch(error => {
            console.error('Error loading script:', error);
        });
    }

    function setupButtonListener() {
        const buttonXPath = '/html/body/div/div[2]/div/div/nav/div/div/div[2]/button/svg/path'; // Updated XPath
        const checkButtonInterval = setInterval(() => {
            const buttonElement = document.evaluate(buttonXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

            if (buttonElement) {
                clearInterval(checkButtonInterval);
                buttonElement.addEventListener('click', () => {
                    const currentDomain = window.location.hostname;
                    if (currentDomain.includes('bigideasmath.com')) {
                        loadScript('https://raw.githubusercontent.com/Cpmjaguar1234/nova/refs/heads/main/bigideas.js');
                    } else if (currentDomain.includes('achieve3000.com')) {
                        loadScript('https://raw.githubusercontent.com/Cpmjaguar1234/nova/refs/heads/main/achieve.js');
                    }
                });
            } else {
                console.error('Button element not found, retrying...');
            }
        }, 1000); // Check every second
    }

    function createExecuteButton() {
        const executeButton = document.createElement('button');
        executeButton.textContent = 'Execute Script';
        executeButton.style.position = 'fixed';
        executeButton.style.bottom = '10px';
        executeButton.style.right = '10px';
        executeButton.style.zIndex = '10000';
        executeButton.style.padding = '10px';
        executeButton.style.backgroundColor = '#4CAF50';
        executeButton.style.color = 'white';
        executeButton.style.border = 'none';
        executeButton.style.borderRadius = '5px';
        executeButton.style.cursor = 'pointer';

        executeButton.addEventListener('click', () => {
            const currentDomain = window.location.hostname;
            if (currentDomain.includes('bigideasmath.com')) {
                loadScript('https://raw.githubusercontent.com/Cpmjaguar1234/nova/refs/heads/main/bigideas.js');
            } else if (currentDomain.includes('achieve3000.com')) {
                loadScript('https://raw.githubusercontent.com/Cpmjaguar1234/nova/refs/heads/main/achieve.js');
            }
        });

        document.body.appendChild(executeButton);
    }

    // Run the setup function after the page is fully loaded
    window.addEventListener('load', () => {
        setupButtonListener();
        createExecuteButton();
    });
})();