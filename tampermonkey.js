// ==UserScript==
// @name         BIM Cheat Assistant
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Enhances learning experience during BIM practice tests
// @author       Your Name
// @match        *://*.learnosity.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // Styles for the assistant interface
    const styles = `
        .bim-assistant {
            position: fixed;
            right: 20px;
            top: 20px;
            background: #fff;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 9999;
            max-width: 300px;
            font-family: Arial, sans-serif;
        }
        .bim-assistant h3 {
            margin: 0 0 10px;
            color: #333;
        }
        .bim-assistant-controls {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        .bim-assistant button {
            padding: 5px 10px;
            border: none;
            border-radius: 4px;
            background: #007bff;
            color: white;
            cursor: pointer;
        }
        .bim-assistant button:hover {
            background: #0056b3;
        }
    `;

    // Add styles to the page
    GM_addStyle(styles);

    // Initialize the assistant
    function initAssistant() {
        const assistant = document.createElement('div');
        assistant.className = 'bim-assistant';
        assistant.innerHTML = `
            <h3>BIM Assistant</h3>
            <div id="bim-current-question">Waiting for question...</div>
            <div class="bim-assistant-controls">
                <button id="bim-analyze">Analyze Question</button>
                <button id="bim-toggle">Hide</button>
            </div>
        `;
        document.body.appendChild(assistant);

        // Add event listeners
        document.getElementById('bim-analyze').addEventListener('click', analyzeCurrentQuestion);
        document.getElementById('bim-toggle').addEventListener('click', toggleAssistant);

        // Add keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcuts);
    }

    // Analyze the current question
    function analyzeCurrentQuestion() {
        const questionElement = document.querySelector('.lrn_question');
        if (!questionElement) {
            console.log('No question found on the page');
            return;
        }

        const questionText = questionElement.textContent.trim();
        document.getElementById('bim-current-question').textContent = `Analyzing: ${questionText.substring(0, 100)}...`;
        
        // TODO: Implement question analysis logic
        // This is where you would add your custom analysis code
    }

    // Toggle assistant visibility
    function toggleAssistant() {
        const assistant = document.querySelector('.bim-assistant');
        const button = document.getElementById('bim-toggle');
        if (assistant.style.transform === 'translateX(280px)') {
            assistant.style.transform = 'translateX(0)';
            button.textContent = 'Hide';
        } else {
            assistant.style.transform = 'translateX(280px)';
            button.textContent = 'Show';
        }
    }

    // Handle keyboard shortcuts
    function handleKeyboardShortcuts(e) {
        // Ctrl + Shift + A to analyze
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            analyzeCurrentQuestion();
        }
        // Ctrl + Shift + H to toggle visibility
        if (e.ctrlKey && e.shiftKey && e.key === 'H') {
            toggleAssistant();
        }
    }

    // Check if we're on a Learnosity page
    function isLearnosityPage() {
        return window.location.hostname.includes('learnosity.com') ||
               document.querySelector('.lrn_question') !== null;
    }

    // Main initialization
    if (isLearnosityPage()) {
        // Wait for the page to be fully loaded
        window.addEventListener('load', () => {
            setTimeout(initAssistant, 1000); // Give extra time for dynamic content to load
        });
    }
})();