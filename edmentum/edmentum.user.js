// ==UserScript==
// @name         Edmentum Assessment Helper
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Helper script for Edmentum assessments with UI enhancements.
// @author       You
// @match        *://*.edmentum.com/*
// @grant        unsafeWindow
// @grant        GM_log
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      *
// @require      https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js
// @require      https://unpkg.com/draggabilly@3/dist/draggabilly.pkgd.min.js
// ==/UserScript==

(function() {
    'use strict';

    console.log('Edmentum Assessment Helper script loaded!');

    // --- Injected CSS for effects and theming ---
    const injectedCSS = `
        /* Starfield Background Effect */
        .header-bg-effect {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            margin-top: 0;
            overflow: hidden;
            pointer-events: none;
            z-index: 0;
            opacity: 0.5;
        }
        .star {
            position: absolute;
            background: rgba(255,255,255,1);
            border-radius: 50%;
            opacity: 0;
            animation: twinkle linear infinite;
            box-shadow: 0 0 12px 5px rgba(255, 255, 255, 0.6);
            filter: blur(0.5px);
        }
        @keyframes twinkle {
            0% { opacity: 0; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.1); }
            100% { opacity: 0; transform: scale(0.8); }
        }

        /* Loading Spinner Animation */
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;

    // Inject CSS into the head
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = injectedCSS;
    document.head.appendChild(styleSheet);

    // --- Theming System ---
    const themes = {
        'default': { '--nova-bg-color': '#1c1e2b', '--nova-text-color': 'white', '--nova-button-bg': '#2c2e3b', '--nova-button-hover-bg': '#3a3d4d', '--nova-border-color': 'rgba(255, 255, 255, 0.3)', '--nova-shadow-color': 'rgba(0,0,0,0.2)', '--nova-close-button-color': 'white', '--nova-discord-icon-color': 'white' },
        'meteor': { '--nova-bg-color': '#0a0a2a', '--nova-text-color': '#e0e0ff', '--nova-button-bg': '#3a2a5a', '--nova-button-hover-bg': '#5a3a8a', '--nova-border-color': 'rgba(150, 150, 255, 0.4)', '--nova-shadow-color': 'rgba(0,0,0,0.4)', '--nova-close-button-color': '#e0e0ff', '--nova-discord-icon-color': '#e0e0ff' },
        'nord': { '--nova-bg-color': '#2E3440', '--nova-text-color': '#ECEFF4', '--nova-button-bg': '#4C566A', '--nova-button-hover-bg': '#5E81AC', '--nova-border-color': 'rgba(236, 239, 244, 0.3)', '--nova-shadow-color': 'rgba(0,0,0,0.2)', '--nova-close-button-color': '#ECEFF4', '--nova-discord-icon-color': '#ECEFF4' },
        'vampire': { '--nova-bg-color': '#2B0C11', '--nova-text-color': '#F5E6E8', '--nova-button-bg': '#5C1A1A', '--nova-button-hover-bg': '#8B2C2C', '--nova-border-color': 'rgba(245, 230, 232, 0.3)', '--nova-shadow-color': 'rgba(0,0,0,0.2)', '--nova-close-button-color': '#F5E6E8', '--nova-discord-icon-color': '#F5E6E8' },
        'galaxy': { '--nova-bg-color': '#0D1B2A', '--nova-text-color': '#E0FBFC', '--nova-button-bg': '#1B263B', '--nova-button-hover-bg': '#415A77', '--nova-border-color': 'rgba(224, 251, 252, 0.3)', '--nova-shadow-color': 'rgba(0,0,0,0.2)', '--nova-close-button-color': '#E0FBFC', '--nova-discord-icon-color': '#E0FBFC' }
    };

    function setTheme(themeName) {
        const theme = themes[themeName] || themes['default'];
        for (const key in theme) {
            document.documentElement.style.setProperty(key, theme[key]);
        }
        localStorage.setItem('novaTheme', themeName);
    }

    // Apply saved theme or default on load
    const savedTheme = localStorage.getItem('novaTheme') || 'default';
    setTheme(savedTheme);


    class AssessmentHelper {
        constructor() {
            console.log('[AssessmentHelper] Constructor: Initializing...');
            this.isFetchingAnswer = false;
            this.autoNextTimeout = null;
            this.isClosed = false;
            this.isInitialized = false;

            // Prevent re-initialization
            if (window.novaAssessmentHelperInstance) {
                console.log('[AssessmentHelper] Instance already exists. Destroying old one.');
                window.novaAssessmentHelperInstance.destroy();
            }
            window.novaAssessmentHelperInstance = this;


            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', this.init.bind(this));
            } else {
                this.init();
            }
        }

        async init() {
            if (this.isInitialized) {
                console.warn('[AssessmentHelper] Init called but already initialized.');
                return;
            }
            console.log('[AssessmentHelper] Init: Initializing UI and event listeners...');

            try {
                // Check for required libraries loaded via @require
                if (typeof anime === 'undefined' || typeof Draggabilly === 'undefined') {
                    throw new Error('Required libraries (anime.js or Draggabilly) were not loaded.');
                }
                console.log('[AssessmentHelper] Required libraries loaded successfully.');

                this.itemMetadata = {
                    UI: this.createUI("https://raw.githubusercontent.com/Cpmjaguar1234/nova/refs/heads/main/nova%20logo%20png.png"),
                    themePopup: this.createThemePopup(),
                    messageDisplay: this.createMessageDisplay()
                };

                // Assign UI elements to `this` for broader access
                this.getAnswerButton = this.itemMetadata.UI.querySelector('#getAnswerButton');
                this.loadingIndicator = this.itemMetadata.UI.querySelector('#loadingIndicator');
                this.getAnswerButtonText = this.itemMetadata.UI.querySelector('#getAnswerButtonText');

                document.body.appendChild(this.itemMetadata.UI);
                document.body.appendChild(this.itemMetadata.themePopup);
                document.body.appendChild(this.itemMetadata.messageDisplay);
                console.log('[AssessmentHelper] UI components mounted to DOM.');

                this.setupEventListeners();
                this.playIntroAnimation();
                this.showUI(true);
                this.checkForSideButton();

                this.isInitialized = true;
                console.log('[AssessmentHelper] Initialization complete.');

            } catch (error) {
                console.error('[AssessmentHelper] Initialization failed:', error);
                this.showAlert('Failed to initialize the Assessment Helper. Some features may not work.', 'error');
            }
        }

        playIntroAnimation() {
            console.log('[AssessmentHelper] Playing intro animation...');
            if (this.itemMetadata && this.itemMetadata.UI) {
                anime({
                    targets: this.itemMetadata.UI,
                    opacity: [0, 1],
                    translateY: [-20, 0],
                    duration: 800,
                    easing: 'easeOutQuad',
                    begin: () => {
                        this.itemMetadata.UI.style.visibility = 'visible';
                    }
                });
            }
        }

        createUI(imageUrl) {
            const launcher = document.createElement("div");
            launcher.id = "nova-edmentum-launcher";
            launcher.style.cssText = "outline: none; min-height: 200px; opacity: 0; visibility: hidden; transition: opacity 0.5s ease; font-family: 'Nunito', sans-serif; width: 220px; height: 280px; background: var(--nova-bg-color); position: fixed; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--nova-text-color); font-size: 16px; top: 50%; right: 20px; transform: translateY(-50%); z-index: 99999; padding: 20px; box-shadow: 0 4px 8px var(--nova-shadow-color); overflow: hidden; white-space: nowrap;";

            const dragHandle = document.createElement("div");
            dragHandle.className = "drag-handle";
            dragHandle.style.cssText = "width: 100%; height: 24px; cursor: move; background: transparent; position: absolute; top: 0; left: 0;";

            const uiImg = document.createElement("img");
            uiImg.src = imageUrl;
            uiImg.style.cssText = "width: 100px; height: 100px; margin-bottom: 5px; border-radius: 50%;";

            const closeButton = document.createElement("button");
            closeButton.id = "closeButton";
            closeButton.textContent = "\u00D7";
            closeButton.style.cssText = "position: absolute; top: 10px; right: 10px; background: none; border: none; color: var(--nova-close-button-color); font-size: 20px; cursor: pointer; padding: 4px 10px; transition: color 0.2s ease, transform 0.1s ease; opacity: 0.5;";

            const getAnswerButton = document.createElement("button");
            getAnswerButton.id = "getAnswerButton";
            getAnswerButton.style.cssText = "background: var(--nova-button-bg); border: none; color: var(--nova-text-color); padding: 12px 20px; border-radius: 8px; cursor: pointer; margin-bottom: 12px; width: 160px; height: 48px; font-size: 16px; transition: background 0.2s ease, transform 0.1s ease; display: flex; justify-content: center; align-items: center;";

            const loadingIndicator = document.createElement("div");
            loadingIndicator.id = "loadingIndicator";
            loadingIndicator.style.cssText = "border: 4px solid var(--nova-border-color); border-radius: 50%; border-top: 4px solid var(--nova-text-color); width: 20px; height: 20px; display: none; animation: spin 1s linear infinite;";

            const buttonTextSpan = document.createElement("span");
            buttonTextSpan.textContent = "Skip Course";
            buttonTextSpan.id = "getAnswerButtonText";
            getAnswerButton.append(loadingIndicator, buttonTextSpan);

            const themeButton = document.createElement("button");
            themeButton.id = "themeButton";
            themeButton.textContent = "Themes";
            themeButton.style.cssText = "background: var(--nova-button-bg); border: none; color: var(--nova-text-color); padding: 12px 20px; border-radius: 8px; cursor: pointer; width: 160px; font-size: 16px; transition: background 0.2s ease; margin-bottom: 12px;";

            const debugNavigatorButton = document.createElement("button");
            debugNavigatorButton.id = "debugNavigatorButton";
            debugNavigatorButton.textContent = "Debug Navigator";
            debugNavigatorButton.style.cssText = "background: var(--nova-button-bg); border: none; color: var(--nova-text-color); padding: 12px 20px; border-radius: 8px; cursor: pointer; width: 160px; font-size: 16px; transition: background 0.2s ease;";

            const version = document.createElement("div");
            version.style.cssText = "position: absolute; bottom: 15px; right: 15px; font-size: 14px; opacity: 0.5;";
            version.textContent = "v1.1";

            const discordLink = document.createElement("a");
            discordLink.href = "https://discord.gg/fmXQN5Pg4E";
            discordLink.target = "_blank";
            discordLink.style.cssText = "position: absolute; bottom: 15px; left: 15px; opacity: 0.5; transition: opacity 0.2s ease; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;";
            discordLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="var(--nova-discord-icon-color)" class="bi bi-discord" viewBox="0 0 16 16"><path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613c.888.637 1.612-1.438 1.612Z"/></svg>`;

            launcher.append(dragHandle, uiImg, closeButton, getAnswerButton, themeButton, debugNavigatorButton, version, discordLink);
            return launcher;
        }

        createThemePopup() {
            const popup = document.createElement('div');
            popup.id = 'nova-theme-popup';
            popup.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--nova-bg-color); color: var(--nova-text-color); padding: 20px; border-radius: 10px; box-shadow: 0 5px 15px var(--nova-shadow-color); z-index: 100001; display: none; flex-direction: column; gap: 10px;';

            const title = document.createElement('h3');
            title.textContent = 'Select a Theme';
            title.style.textAlign = 'center';
            title.style.margin = '0 0 15px 0';
            popup.appendChild(title);

            Object.keys(themes).forEach(themeName => {
                const button = document.createElement('button');
                button.textContent = themeName.charAt(0).toUpperCase() + themeName.slice(1);
                button.style.cssText = 'background: var(--nova-button-bg); border: 1px solid var(--nova-border-color); color: var(--nova-text-color); padding: 10px; border-radius: 5px; cursor: pointer; transition: background 0.2s;';
                button.onclick = () => {
                    setTheme(themeName);
                    this.hideThemePopup();
                };
                button.onmouseover = () => button.style.background = 'var(--nova-button-hover-bg)';
                button.onmouseout = () => button.style.background = 'var(--nova-button-bg)';
                popup.appendChild(button);
            });

            return popup;
        }

        createMessageDisplay() {
            // This is a container for alerts, we'll manage alerts via the showAlert method.
            const display = document.createElement('div');
            display.id = 'nova-message-display';
            return display;
        }

        setupEventListeners() {
            console.log('[AssessmentHelper] Setting up event listeners...');
            // Draggability
            const draggie = new Draggabilly(this.itemMetadata.UI, {
                handle: '.drag-handle'
            });

            // Button Clicks
            this.itemMetadata.UI.querySelector('#closeButton').addEventListener('click', () => this.destroy());
            this.itemMetadata.UI.querySelector('#getAnswerButton').addEventListener('click', () => this.autoClickNext());
            this.itemMetadata.UI.querySelector('#themeButton').addEventListener('click', () => this.showThemePopup());
            this.itemMetadata.UI.querySelector('#debugNavigatorButton').addEventListener('click', () => {
                console.log('Debug Navigator button clicked. Loading edmentum-nav.js...');
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: 'https://raw.githubusercontent.com/Cpmjaguar1234/nova/refs/heads/main/edmentum/edmentum-nav.js',
                    onload: function(response) {
                        try {
                            eval(response.responseText);
                            console.log('edmentum-nav.js loaded and executed successfully.');
                        } catch (e) {
                            console.error('Error executing edmentum-nav.js:', e);
                        }
                    },
                    onerror: function(error) {
                        console.error('Error loading edmentum-nav.js:', error);
                    }
                });
            });

            // Button hover effects
            this.itemMetadata.UI.querySelectorAll('button').forEach(button => {
                button.addEventListener('mouseenter', (e) => e.currentTarget.style.background = 'var(--nova-button-hover-bg)');
                button.addEventListener('mouseleave', (e) => e.currentTarget.style.background = 'var(--nova-button-bg)');
            });
        }

        showUI(shouldShow) {
            if (this.itemMetadata && this.itemMetadata.UI) {
                this.itemMetadata.UI.style.display = shouldShow ? 'flex' : 'none';
            }
        }

        showThemePopup() {
            if (this.itemMetadata && this.itemMetadata.themePopup) {
                this.itemMetadata.themePopup.style.display = 'flex';
            }
        }

        hideThemePopup() {
            if (this.itemMetadata && this.itemMetadata.themePopup) {
                this.itemMetadata.themePopup.style.display = 'none';
            }
        }

        async checkForSideButton() {
            if (this.isClosed) return; // Stop checking if UI is closed
            const selector = '#sbsNext';
            const iframe = document.getElementById('content-iframe');
            let btn = null;

            if (iframe && iframe.contentDocument) {
                btn = iframe.contentDocument.querySelector(selector);
            } else {
                btn = document.querySelector(selector);
            }

            if (btn) {
                console.log('[checkForSideButton] Side button found. Clicking...');
                btn.click();
            } else {
                // Retry if not found
                setTimeout(() => this.checkForSideButton(), 2000);
            }
        }

        autoClickNext() {
            console.log('[autoClickNext] Starting auto-click sequence.');
            const clickLoop = () => {
                if (this.isClosed) {
                    console.log('[autoClickNext] UI closed, stopping auto-click.');
                    return;
                }

                const nextBtn = document.querySelector('.tutorial-nav-next:not(.disabled)');
                if (nextBtn) {
                    console.log('[autoClickNext] Clicking next button.');
                    nextBtn.click();
                    this.autoNextTimeout = setTimeout(clickLoop, 200); // Continue clicking
                } else {
                    console.log('[autoClickNext] Next button not found or is disabled. Stopping sequence.');
                    this.showAlert('Auto-skip finished or no more "Next" buttons found.', 'success');
                }
            };
            this.showAlert('Auto-skip started!', 'info');
            clickLoop();
        }

        showAlert(message, type = 'info', duration = 5000) {
            const alertBox = document.createElement('div');
            alertBox.textContent = message;
            Object.assign(alertBox.style, {
                position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                padding: '10px 20px', borderRadius: '5px', color: 'white',
                zIndex: '100000', opacity: '0', transition: 'opacity 0.5s ease-in-out',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
            });

            const colors = { error: '#dc3545', success: '#28a745', info: '#007bff' };
            alertBox.style.backgroundColor = colors[type] || colors.info;

            document.body.appendChild(alertBox);
            setTimeout(() => { alertBox.style.opacity = '1'; }, 10);
            setTimeout(() => {
                alertBox.style.opacity = '0';
                alertBox.addEventListener('transitionend', () => alertBox.remove());
            }, duration);
        }

        destroy() {
            console.log('[AssessmentHelper] Destroying instance...');
            this.isClosed = true;

            if (this.autoNextTimeout) {
                clearTimeout(this.autoNextTimeout);
            }

            if (this.itemMetadata) {
                Object.values(this.itemMetadata).forEach(el => el && el.parentNode && el.parentNode.removeChild(el));
            }

            if (window.novaAssessmentHelperInstance === this) {
                window.novaAssessmentHelperInstance = null;
            }
            this.isInitialized = false;
            console.log('[AssessmentHelper] Instance destroyed.');
        }
    }

    // --- Entry Point ---
    // Create a single instance of the helper.
    new AssessmentHelper();

function createEdmentumNavigatorAutoRefresh() {
  const container = document.getElementById('main-content');
  if (!container) {
    console.warn('❌ Could not find #main-content');
    return;
  }
  console.log('✅ Found #main-content container:', container);

  // Create or reuse the floating UI container
  let uiBox = document.getElementById('edmentum-navigator-ui');
  if (!uiBox) {
    uiBox = document.createElement('div');
    uiBox.id = 'edmentum-navigator-ui';
    Object.assign(uiBox.style, {
      position: 'fixed',
      top: '50px',
      right: '50px',
      width: '320px',
      maxHeight: '80vh',
      overflowY: 'auto',
      background: '#1a1a2e',
      border: '2px solid #4cc9f0',
      padding: '12px',
      zIndex: '9999',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      fontSize: '14px',
      boxShadow: '0 0 12px rgba(76, 201, 240, 0.25)',
      borderRadius: '8px',
      color: '#ffffff'
    });
    document.body.appendChild(uiBox);

    // Title
    const title = document.createElement('div');
    title.id = 'edmentum-navigator-title';
    title.innerHTML = '📚 <strong style="color:#4cc9f0">Edmentum Navigator</strong>';
    title.style.marginBottom = '8px';
    uiBox.appendChild(title);

    // Legend
    const legend = document.createElement('div');
    legend.id = 'edmentum-navigator-legend';
    legend.style.fontSize = '13px';
    legend.style.marginBottom = '12px';
    legend.innerHTML = `
      <div style="color:#4cc9f0">Legend:</div>
      <div style="color:#a8e6cf; background:#1a2e3a; padding:2px 6px; border-radius:4px; display:inline-block; margin:3px 5px 3px 0;">Tutorial</div>
      <div style="color:#ffaaa5; background:#3a1a2e; padding:2px 6px; border-radius:4px; display:inline-block; margin:3px 5px 3px 0;">Assessment</div>
      <div style="color:#a8c6e6; background:#1a3a2e; padding:2px 6px; border-radius:4px; display:inline-block; margin:3px 5px 3px 0;">Document</div>
      <div style="color:#d3d3d3; background:#2e2e2e; padding:2px 6px; border-radius:4px; display:inline-block; margin:3px 5px 3px 0;">Other</div>
      <div style="color:#ffffff; background:#2e1a3a; padding:2px 6px; border-radius:4px; display:inline-block; margin:3px 5px 3px 0;">Unit</div>
    `;
    uiBox.appendChild(legend);

    // Removed Debug Button creation from here
  }

  function clearItems() {
    // Remove all children except title and legend
    Array.from(uiBox.children).forEach(child => {
      if (
        child.id !== 'edmentum-navigator-title' &&
        child.id !== 'edmentum-navigator-legend'
      ) {
        uiBox.removeChild(child);
      }
    });
  }

  function addItem(label, element, type = 'activity', subtype = '') {
    const btn = document.createElement('div');
    btn.textContent = `${type === 'unit' ? '📘' : '🔹'} ${label} ${
      subtype ? `(${subtype})` : ''
    }`;
    btn.style.cursor = 'pointer';
    btn.style.margin = '5px 0';
    btn.style.padding = '6px 10px';
    btn.style.borderRadius = '6px';
    btn.style.userSelect = 'none';
    btn.style.transition = 'background-color 0.25s ease';

    if (type === 'unit') {
      btn.style.background = '#2e1a3a';
      btn.style.color = '#ffffff';
      btn.style.fontWeight = '600';
    } else {
      switch (subtype.toLowerCase()) {
        case 'tutorial':
          btn.style.background = '#1a2e3a';
          btn.style.color = '#a8e6cf';
          break;
        case 'assessment':
          btn.style.background = '#3a1a2e';
          btn.style.color = '#ffaaa5';
          break;
        case 'document':
          btn.style.background = '#1a3a2e';
          btn.style.color = '#a8c6e6';
          break;
        default:
          btn.style.background = '#2e2e2e';
          btn.style.color = '#d3d3d3';
      }
    }

    btn.addEventListener('mouseenter', () => (btn.style.filter = 'brightness(90%)'));
    btn.addEventListener('mouseleave', () => (btn.style.filter = 'none'));

    btn.addEventListener('click', () => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.click?.();
    });

    uiBox.appendChild(btn);
  }

  refreshList();
}

function refreshList() {
    clearItems();

    // Units
    const headerSpans = container.querySelectorAll('h3.unit-name span, span.ng-star-inserted');
    console.log('🔍 Found unit header spans:', headerSpans.length, headerSpans);
    headerSpans.forEach(span => console.log('Unit span text:', span.textContent.trim()));
    const seenUnits = new Set();
    headerSpans.forEach(span => {
      const text = span.textContent.trim();
      if (text.toLowerCase().startsWith('unit') && !seenUnits.has(text)) {
        addItem(text, span.closest('h3'), 'unit');
        seenUnits.add(text);
      }
    });

    // Activities
    const activityEls = container.querySelectorAll('h4.activity-name');
    console.log('🔍 Found activity elements:', activityEls.length, activityEls);
    activityEls.forEach(activity => console.log('Activity name text:', activity.textContent.trim()));
    console.log('Container innerHTML (first 1000 chars):', container.innerHTML.substring(0, 1000));
    activityEls.forEach(activity => {
      const name = activity.textContent.trim();
      if (!name) return;

      const wrapper = activity.closest('div.main-wrapper');
      let subtype = '';

      if (wrapper) {
        const iconUse = wrapper.querySelector('.activity-type lrn-svg-icon use');
        if (iconUse) {
          const href = iconUse.getAttribute('xlink:href') || '';
          const match = href.match(/#activity-type-(\w+)/);
          if (match) {
            subtype = match[1].charAt(0).toUpperCase() + match[1].slice(1);
          }
        }
      }

      addItem(name, activity, 'activity', subtype);
    });
  }

  // Initial load is now triggered by the debug button
  // Auto-refresh is removed
})();

// Expose the function globally if needed for external calls, otherwise remove.
// window.createEdmentumNavigatorAutoRefresh = createEdmentumNavigatorAutoRefresh;
