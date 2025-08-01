const starEffectCSS = `
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
`;

// Inject CSS into the head
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = starEffectCSS;
document.head.appendChild(styleSheet);

// --- Theming System ---
const themes = {
    'default': {
        '--nova-bg-color': '#1c1e2b',
        '--nova-text-color': 'white',
        '--nova-button-bg': '#2c2e3b',
        '--nova-button-hover-bg': '#3a3d4d',
        '--nova-border-color': 'rgba(255, 255, 255, 0.3)',
        '--nova-shadow-color': 'rgba(0,0,0,0.2)',
        '--nova-close-button-color': 'white',
        '--nova-discord-icon-color': 'white'
    },
    'meteor': {
        '--nova-bg-color': '#0a0a2a',
        '--nova-text-color': '#e0e0ff',
        '--nova-button-bg': '#3a2a5a',
        '--nova-button-hover-bg': '#5a3a8a',
        '--nova-border-color': 'rgba(150, 150, 255, 0.4)',
        '--nova-shadow-color': 'rgba(0,0,0,0.4)',
        '--nova-close-button-color': '#e0e0ff',
        '--nova-discord-icon-color': '#e0e0ff'
    },
    'nord': {
        '--nova-bg-color': '#2E3440',
        '--nova-text-color': '#ECEFF4',
        '--nova-button-bg': '#4C566A',
        '--nova-button-hover-bg': '#5E81AC',
        '--nova-border-color': 'rgba(236, 239, 244, 0.3)',
        '--nova-shadow-color': 'rgba(0,0,0,0.2)',
        '--nova-close-button-color': '#ECEFF4',
        '--nova-discord-icon-color': '#ECEFF4'
    },
    'vampire': {
        '--nova-bg-color': '#2B0C11',
        '--nova-text-color': '#F5E6E8',
        '--nova-button-bg': '#5C1A1A',
        '--nova-button-hover-bg': '#8B2C2C',
        '--nova-border-color': 'rgba(245, 230, 232, 0.3)',
        '--nova-shadow-color': 'rgba(0,0,0,0.2)',
        '--nova-close-button-color': '#F5E6E8',
        '--nova-discord-icon-color': '#F5E6E8'
    },
    'galaxy': {
        '--nova-bg-color': '#0D1B2A',
        '--nova-text-color': '#E0FBFC',
        '--nova-button-bg': '#1B263B',
        '--nova-button-hover-bg': '#415A77',
        '--nova-border-color': 'rgba(224, 251, 252, 0.3)',
        '--nova-shadow-color': 'rgba(0,0,0,0.2)',
        '--nova-close-button-color': '#E0FBFC',
        '--nova-discord-icon-color': '#E0FBFC'
    }
};

    function setTheme(themeName) {
        const theme = themes[themeName] || themes['default'];
        for (const key in theme) {
            document.documentElement.style.setProperty(key, theme[key]);
        }
        localStorage.setItem('novaTheme', themeName);

        // Apply theme to the Nova UI elements if they exist
        const novaUI = document.getElementById('nova-edmentum-launcher');
        if (novaUI) {
            for (const key in theme) {
                if (key.startsWith('--nova-')) {
                    novaUI.style.setProperty(key, theme[key]);
                }
            }
        }
    }

// Apply saved theme or default on load
        // Initial theme application
        const savedTheme = localStorage.getItem('novaTheme') || 'default';
        setTheme(savedTheme);

        // Apply theme to the Nova UI elements if they exist after creation
        const novaUI = document.getElementById('nova-edmentum-launcher');
        if (novaUI) {
            const currentTheme = themes[savedTheme] || themes['default'];
            for (const key in currentTheme) {
                if (key.startsWith('--nova-')) {
                    novaUI.style.setProperty(key, currentTheme[key]);
                }
            }
        }


class AssessmentHelper {
    constructor() {
        console.log('[AssessmentHelper] Constructor: Initializing...');

        // Check if an instance already exists and reinitialize if it does
        if (window.novaAssessmentHelperInstance) {
            console.log('[AssessmentHelper] Existing instance found. Reinitializing...');
            window.novaAssessmentHelperInstance.reinitialize();
        }
        window.novaAssessmentHelperInstance = this;

        this.cachedArticle = null;
        this.isFetchingAnswer = false;
        // anime.js removed; using pure CSS/JS for animations

        this.draggabillyScriptUrl = 'https://unpkg.com/draggabilly@3/dist/draggabilly.pkgd.min.js';
        this.autoNextTimeout = null;
        this.isClosed = false;

        // Ensure autoNextTimeout is null initially
        this.autoNextTimeout = null;

        // Initialize only once
        if (document.readyState === 'loading') {
            console.log('AssessmentHelper: Document still loading, waiting for DOMContentLoaded...');
            document.addEventListener('DOMContentLoaded', this.init.bind(this));
        } else {
            this.init();
        }

        this.isInitialized = false; // Track initialization status
    }

    async init() {
        try {
            console.log('[AssessmentHelper] Init: Loading required scripts...');
            // Skipping anime.js loading; not needed anymore
            await this.loadScript(this.draggabillyScriptUrl);
            console.log('AssessmentHelper: Draggabilly loaded successfully');
            if (typeof Draggabilly !== 'undefined') {
                console.log('AssessmentHelper: Draggabilly object is available.');
            } else {
                console.error('AssessmentHelper: Draggabilly object is NOT available after loading.');
            }

            console.log('AssessmentHelper: Creating UI components...');
            this.itemMetadata = {
                    UI: this.createUI(),
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
            console.log('AssessmentHelper: UI components mounted to DOM');
            
            this.setupEventListeners();
            this.playIntroAnimation();
            this.showUI(true);
            this.hideThemePopup(); // Hide theme popup initially
            this.checkForSideButton(); // Start checking for side button

            this.isInitialized = true; // Mark as initialized

        } catch (error) {
            console.error('AssessmentHelper: Initialization failed:', error);
            this.showAlert('Failed to load required scripts for the Assessment Helper. Some features may not work.', 'error');
            this.itemMetadata = {
                UI: this.createUI(),
                messageDisplay: this.createMessageDisplay()
            };
            document.body.appendChild(this.itemMetadata.UI);

            document.body.appendChild(this.itemMetadata.messageDisplay);

            // Assign UI elements to `this` for broader access in error case
            this.getAnswerButton = this.itemMetadata.UI.querySelector('#getAnswerButton');
            this.loadingIndicator = this.itemMetadata.UI.querySelector('#loadingIndicator');
            this.getAnswerButtonText = this.itemMetadata.UI.querySelector('#getAnswerButtonText');
            
            this.setupEventListeners();
            this.showUI(true);

        }
    }

    loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve();
            script.onerror = (error) => {
                script.remove();
                reject(new Error(`Failed to load script: ${url}`));
            };
            document.head.appendChild(script);
        });
    }

    async checkForSideButton() {
        const selector = '#sbsNext';
        const iframe = document.getElementById('content-iframe');
        let btn = null;

        let searchLocation = 'main document';
        if (iframe) {
            if (iframe.contentDocument && iframe.contentWindow && iframe.contentDocument.readyState === 'complete') {
                // Add a small delay to ensure the iframe's body is fully rendered and accessible
                await new Promise(resolve => setTimeout(resolve, 100));
                if (iframe.contentDocument.body) {
                btn = iframe.contentDocument.querySelector(selector);
                     searchLocation = 'iframe.contentDocument';
                 }
            } else {
                console.log(`[checkForSideButton] Iframe content not ready. Details:`);
                console.log(`  - contentDocument: ${!!iframe.contentDocument}`);
                console.log(`  - contentWindow: ${!!iframe.contentWindow}`);
                console.log(`  - readyState: ${iframe.contentDocument ? iframe.contentDocument.readyState : 'N/A'}`);
                console.log(`  - body exists: ${iframe.contentDocument ? !!iframe.contentDocument.body : 'N/A'}`);
                console.log(`Retrying in 2 seconds.`);
                setTimeout(() => this.checkForSideButton(), 2000);
                return; // Exit early if iframe not ready
            }
        } else {
            btn = document.querySelector(selector);
            searchLocation = 'main document (iframe not found)';
        }

        const isPresent = !!btn;

        console.log(`[checkForSideButton] Selector: '${selector}'`);
        console.log(`[checkForSideButton] Searching in: ${searchLocation}`);
        console.log('[checkForSideButton] Button element:', btn);
        console.log('Side button is', isPresent ? 'present ✅' : 'not found ❌');
        console.log(`[checkForSideButton] Document readyState: ${document.readyState}`);
        console.log(`[checkForSideButton] Current URL: ${window.location.href}`);

        if (btn) {
            const computedStyle = window.getComputedStyle(btn);
            console.log(`[checkForSideButton] Button visibility: ${computedStyle.visibility}`);
            console.log(`[checkForSideButton] Button display: ${computedStyle.display}`);
            console.log(`[checkForSideButton] Button opacity: ${computedStyle.opacity}`);
            console.log(`[checkForSideButton] Button pointer-events: ${computedStyle.pointerEvents}`);
            console.log(`[checkForSideButton] Button clientWidth: ${btn.clientWidth}`);
            console.log(`[checkForSideButton] Button clientHeight: ${btn.clientHeight}`);
        }

        if (isPresent) {
            console.log('Clicking side button...');
            btn.click();
            console.log('Side button clicked.');
        } else {
            // Only retry if the button is not found
            setTimeout(() => this.checkForSideButton(), 2000); // Increased retry delay
        }
    }

    autoClickNext() {
        console.log('[autoClickNext] Function entered.');
        const nextBtn = document.querySelector('.tutorial-nav-next');
        console.log('[autoClickNext] Attempting to click next button.');

        if (!nextBtn) {
            console.warn('[autoClickNext] Next button element not found. Auto-click cannot proceed.');
            return false;
        }

        const isDisabledProperty = nextBtn.disabled;
        const isDisabledClass = nextBtn.classList.contains('disabled');
        const isDisabled = isDisabledProperty || isDisabledClass;

        console.log(`[autoClickNext] Next button found. disabled property: ${isDisabledProperty}, disabled class: ${isDisabledClass}. Overall disabled: ${isDisabled}`);

        if (isDisabled) {
            console.log('[autoClickNext] Next button is disabled — stopping auto-click. No further clicks will be attempted.');
            return false;
        }

        console.log('[autoClickNext] Clicking Next button...');
        nextBtn.click();
        console.log('[autoClickNext] Click event dispatched to Next button.');
        console.log('[autoClickNext] Next button clicked.');

        console.log('[autoClickNext] Scheduling next auto-click in 1000ms.');
        setTimeout(() => this.autoClickNext(), 200);
        return true;
    }

    reinitialize() {
        console.log('[AssessmentHelper] Reinitializing...');
        this.isInitialized = false; // Reset initialization status
        // Call destroy to clean up the existing instance
        this.destroy();

        // Re-run initialization logic if not already initialized
        if (!this.isInitialized) {
            this.init();
        }
    }

    destroy() {
        console.log('[AssessmentHelper] Destroying instance...');

        // Remove UI elements from the DOM
        if (this.itemMetadata) {
            if (this.itemMetadata.UI && this.itemMetadata.UI.parentNode) {
                this.itemMetadata.UI.parentNode.removeChild(this.itemMetadata.UI);
            }
            if (this.itemMetadata.themePopup && this.itemMetadata.themePopup.parentNode) {
                this.itemMetadata.themePopup.parentNode.removeChild(this.itemMetadata.themePopup);
            }
            if (this.itemMetadata.messageDisplay && this.itemMetadata.messageDisplay.parentNode) {
                this.itemMetadata.messageDisplay.parentNode.removeChild(this.itemMetadata.messageDisplay);
            }
        }

        // Clear any pending timeouts
        if (this.autoNextTimeout) {
            clearTimeout(this.autoNextTimeout);
            this.autoNextTimeout = null;
        }

        // Remove event listeners (if any were added directly to document/window)
        // For simplicity, assuming event listeners are managed by setupEventListeners and don't need explicit removal here

        // Clear the global instance reference
        if (window.novaAssessmentHelperInstance === this) {
            window.novaAssessmentHelperInstance = null;
        }

        this.isClosed = true; // Mark as closed
        this.isInitialized = false; // Mark as uninitialized
    }

    createUI() {
        const container = document.createElement("div");
        const launcher = document.createElement("div");
        launcher.id = "Launcher";
        launcher.className = "Launcher";
        launcher.style.cssText = "outline: none;min-height: 160px;opacity: 0;visibility: hidden;transition: opacity 0.5s ease;font-family: 'Nunito', sans-serif;width: 180px;height: 240px;background: var(--nova-bg-color);position: fixed;border-radius: 12px;display: flex;flex-direction: column;align-items: center;justify-content: center;color: var(--nova-text-color);font-size: 16px;top: 50%;right: 20px;transform: translateY(-50%);z-index: 99999;padding: 16px;box-shadow: 0 4px 8px var(--nova-shadow-color);overflow: hidden;white-space: nowrap;";


        const dragHandle = document.createElement("div");
        dragHandle.className = "drag-handle";
        dragHandle.style.cssText = "width: 100%;height: 24px;cursor: move;background: transparent;position: absolute;top: 0;";

        const uiImg = document.createElement("img");
        uiImg.src = "https://raw.githubusercontent.com/Cpmjaguar1234/nova/refs/heads/main/nova%20logo%20png.png";
        uiImg.style.cssText = "width: 90px;height: 90px;margin-bottom: 16px;border-radius: 50%;";

        const closeButton = document.createElement("button");
        closeButton.id = "closeButton";
        closeButton.textContent = "\u00D7";
        closeButton.style.cssText = "position: absolute;top: 8px;right: 8px;background: none;border: none;color: var(--nova-close-button-color);font-size: 18px;cursor: pointer;padding: 2px 8px;transition: color 0.2s ease, transform 0.1s ease; opacity: 0.5; display: block; visibility: visible;";

        const getAnswerButton = document.createElement("button");
        getAnswerButton.id = "getAnswerButton";
        getAnswerButton.style.cssText = "background: var(--nova-button-bg);border: none;color: var(--nova-text-color);padding: 12px 20px;border-radius: 8px;cursor: pointer;margin-bottom: 8px;width: 120px;height: 44px;font-size: 16px;transition: background 0.2s ease, transform 0.1s ease;display: flex;justify-content: center;align-items: center;";

        const loadingIndicator = document.createElement("div");
        loadingIndicator.id = "loadingIndicator";
        loadingIndicator.style.cssText = "border: 4px solid var(--nova-border-color); border-radius: 50%; border-top: 4px solid var(--nova-text-color); width: 20px; height: 20px; display: none; animation: spin 1s linear infinite;";
        // Add CSS for @keyframes spin if not present
        if (!document.getElementById('custom-spin-keyframes')) {
            const spinStyle = document.createElement('style');
            spinStyle.id = 'custom-spin-keyframes';
            spinStyle.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
            document.head.appendChild(spinStyle);
        }

        const buttonTextSpan = document.createElement("span");
        buttonTextSpan.textContent = "Skip Course";
        buttonTextSpan.id = "getAnswerButtonText";

        getAnswerButton.appendChild(loadingIndicator);
        getAnswerButton.appendChild(buttonTextSpan);

        const version = document.createElement("div");
        version.style.cssText = "position: absolute;bottom: 8px;right: 8px;font-size: 12px;opacity: 0.5;";
        version.textContent = "1.0";

        const discordLink = document.createElement("a");
        discordLink.href = "https://discord.gg/fmXQN5Pg4E";
        discordLink.target = "_blank";
        discordLink.style.cssText = "position: absolute; bottom: 8px; left: 8px; opacity: 0.5; transition: opacity 0.2s ease; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;";
        discordLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-discord" viewBox="0 0 16 16"><path fill="var(--nova-discord-icon-color)" d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/></svg>`;
        discordLink.onmouseover = () => discordLink.style.opacity = '1';
        discordLink.onmouseout = () => discordLink.style.opacity = '0.5';

        launcher.appendChild(dragHandle);
        launcher.appendChild(uiImg);
        launcher.appendChild(closeButton);
        launcher.appendChild(getAnswerButton);
        
        const openThemePopupButton = document.createElement("button");
        openThemePopupButton.id = "openThemePopupButton";
        openThemePopupButton.textContent = "Themes";
        openThemePopupButton.style.cssText = "background: var(--nova-button-bg);border: none;color: var(--nova-text-color);padding: 12px 20px;border-radius: 8px;cursor: pointer;margin-top: 0;width: 120px;height: 44px;font-size: 16px;transition: background 0.2s ease, transform 0.1s ease;display: flex;justify-content: center;align-items: center;";
        openThemePopupButton.onmouseover = () => openThemePopupButton.style.background = 'var(--nova-button-hover-bg)';
        openThemePopupButton.onmouseout = () => openThemePopupButton.style.background = 'var(--nova-button-bg)';
        launcher.appendChild(openThemePopupButton);

        launcher.appendChild(version);
        launcher.appendChild(discordLink);

        const starEffectContainer = document.createElement("div");
        starEffectContainer.className = "header-bg-effect";
        launcher.appendChild(starEffectContainer);

        container.appendChild(launcher);

        return container;
    }

    createStars(container, launcher) {
        const numStars = 30;
        for (let i = 0; i < numStars; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.width = `${Math.random() * 3 + 1}px`;
            star.style.height = star.style.width;
            star.style.left = `${Math.random() * 100}%`;
            const uiImg = launcher.querySelector('img');
            const getAnswerButton = launcher.querySelector('#getAnswerButton');

            const launcherRect = launcher.getBoundingClientRect();
            const uiImgRect = uiImg.getBoundingClientRect();
            const getAnswerButtonRect = getAnswerButton.getBoundingClientRect();

            const uiImgRelativeTop = uiImgRect.top - launcherRect.top;
            const uiImgRelativeLeft = uiImgRect.left - launcherRect.left;
            const getAnswerButtonRelativeTop = getAnswerButtonRect.top - launcherRect.top;
            const getAnswerButtonRelativeLeft = getAnswerButtonRect.left - launcherRect.left;

            let randomTop, randomLeft;
            let attempts = 0;
            const maxAttempts = 100;

            do {
                randomTop = Math.random() * container.clientHeight;
                randomLeft = Math.random() * container.clientWidth;
                attempts++;

                const overlapsLogo = (
                    randomLeft < uiImgRelativeLeft + uiImgRect.width &&
                    randomLeft + star.offsetWidth > uiImgRelativeLeft &&
                    randomTop < uiImgRelativeTop + uiImgRect.height &&
                    randomTop + star.offsetHeight > uiImgRelativeTop
                );

                const overlapsButton = (
                    randomLeft < getAnswerButtonRelativeLeft + getAnswerButtonRect.width &&
                    randomLeft + star.offsetWidth > getAnswerButtonRelativeLeft &&
                    randomTop < getAnswerButtonRelativeTop + getAnswerButtonRect.height &&
                    randomTop + star.offsetHeight > getAnswerButtonRelativeTop
                );

                if (!overlapsLogo && !overlapsButton) {
                    break;
                }
            } while (attempts < maxAttempts);

            star.style.top = `${randomTop}px`;
            star.style.left = `${randomLeft}px`;
            star.style.animationDelay = `${Math.random() * 5}s`;
            star.style.animationDuration = `${Math.random() * 3 + 2}s`;
            container.appendChild(star);
        }
    }

    createMessageDisplay() {
        const messageDisplay = document.createElement("div");
        messageDisplay.id = "novaMessageDisplay";
        messageDisplay.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--nova-bg-color);
            color: var(--nova-text-color);
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
            z-index: 100000;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.5s ease, visibility 0.5s ease;
            max-width: 80%;
            max-height: 80%;
            overflow: auto;
            font-family: 'Nunito', sans-serif;
            font-size: 16px;
            white-space: pre-wrap; /* Preserve whitespace and allow wrapping */
            word-wrap: break-word; /* Break long words */
        `;
        return messageDisplay;
    }

    createThemePopup() {
        const container = document.createElement("div");
        const themePopup = document.createElement("div");
        themePopup.id = "themePopup";
        themePopup.className = "theme-popup";
        themePopup.style.cssText = "outline: none; opacity: 0; visibility: hidden; transition: opacity 0.3s ease, transform 0.3s ease; font-family: 'Nunito', sans-serif; width: 200px; background: var(--nova-bg-color); position: fixed; border-radius: 12px; display: flex; flex-direction: column; align-items: center; color: var(--nova-text-color); font-size: 16px; top: 20px; left: 20px; z-index: 99999; padding: 16px; box-shadow: 0 4px 8px var(--nova-shadow-color);overflow: hidden;";

        const dragHandle = document.createElement("div");
        dragHandle.className = "drag-handle";
        dragHandle.style.cssText = "width: 100%;height: 24px;cursor: move;background: transparent;position: absolute;top: 0;";

        const closeButton = document.createElement("button");
        closeButton.id = "closeThemePopupButton";
        closeButton.textContent = "\u00D7";
        closeButton.style.cssText = "position: absolute; top: 8px; right: 8px; background: none; border: none; color: var(--nova-close-button-color); font-size: 18px; cursor: pointer; padding: 2px 8px; transition: color 0.2s ease, transform 0.1s ease; opacity: 0.5; display: block; visibility: visible;";

        const title = document.createElement("h3");
        title.textContent = "Select Theme";
        title.style.cssText = "margin-top: 0; margin-bottom: 15px; color: var(--nova-text-color);";

        const defaultThemeButton = document.createElement("button");
        defaultThemeButton.id = "defaultThemeButton";
        defaultThemeButton.textContent = "Default";
        defaultThemeButton.style.cssText = "background: var(--nova-button-bg); border: none; color: var(--nova-text-color); padding: 8px 12px; border-radius: 6px; cursor: pointer; margin-bottom: 10px; width: 100%; font-size: 14px; transition: background 0.2s ease, transform 0.1s ease;";
        defaultThemeButton.onmouseover = () => defaultThemeButton.style.background = 'var(--nova-button-hover-bg)';
        defaultThemeButton.onmouseout = () => defaultThemeButton.style.background = 'var(--nova-button-bg)';

        const meteorThemeButton = document.createElement("button");
        meteorThemeButton.id = "meteorThemeButton";
        meteorThemeButton.textContent = "Meteor";
        meteorThemeButton.style.cssText = "background: var(--nova-button-bg); border: none; color: var(--nova-text-color); padding: 8px 12px; border-radius: 6px; cursor: pointer; margin-bottom: 10px; width: 100%; font-size: 14px; transition: background 0.2s ease, transform 0.1s ease;";
        meteorThemeButton.onmouseover = () => meteorThemeButton.style.background = 'var(--nova-button-hover-bg)';
        meteorThemeButton.onmouseout = () => meteorThemeButton.style.background = 'var(--nova-button-bg)';

        const nordThemeButton = document.createElement("button");
        nordThemeButton.id = "nordThemeButton";
        nordThemeButton.textContent = "Nord";
        nordThemeButton.style.cssText = "background: var(--nova-button-bg); border: none; color: var(--nova-text-color); padding: 8px 12px; border-radius: 6px; cursor: pointer; margin-bottom: 10px; width: 100%; font-size: 14px; transition: background 0.2s ease, transform 0.1s ease;";
        nordThemeButton.onmouseover = () => nordThemeButton.style.background = 'var(--nova-button-hover-bg)';
        nordThemeButton.onmouseout = () => nordThemeButton.style.background = 'var(--nova-button-bg)';

        const vampireThemeButton = document.createElement("button");
        vampireThemeButton.id = "vampireThemeButton";
        vampireThemeButton.textContent = "Vampire";
        vampireThemeButton.style.cssText = "background: var(--nova-button-bg); border: none; color: var(--nova-text-color); padding: 8px 12px; border-radius: 6px; cursor: pointer; margin-bottom: 10px; width: 100%; font-size: 14px; transition: background 0.2s ease, transform 0.1s ease;";
        vampireThemeButton.onmouseover = () => vampireThemeButton.style.background = 'var(--nova-button-hover-bg)';
        vampireThemeButton.onmouseout = () => vampireThemeButton.style.background = 'var(--nova-button-bg)';

        const galaxyThemeButton = document.createElement("button");
        galaxyThemeButton.id = "galaxyThemeButton";
        galaxyThemeButton.textContent = "Galaxy";
        galaxyThemeButton.style.cssText = "background: var(--nova-button-bg); border: none; color: var(--nova-text-color); padding: 8px 12px; border-radius: 6px; cursor: pointer; width: 100%; font-size: 14px; transition: background 0.2s ease, transform 0.1s ease;";
        galaxyThemeButton.onmouseover = () => galaxyThemeButton.style.background = 'var(--nova-button-hover-bg)';
        galaxyThemeButton.onmouseout = () => galaxyThemeButton.style.background = 'var(--nova-button-bg)';

        themePopup.appendChild(dragHandle);
        themePopup.appendChild(closeButton);
        themePopup.appendChild(title);
        themePopup.appendChild(defaultThemeButton);
        themePopup.appendChild(meteorThemeButton);
        themePopup.appendChild(nordThemeButton);
        themePopup.appendChild(vampireThemeButton);
        themePopup.appendChild(galaxyThemeButton);

        container.appendChild(themePopup);

        return container;
    }



    playIntroAnimation() {
    // Pure JS/CSS intro animation (no anime.js)
    const imageUrl = "https://github.com/Cpmjaguar1234/nova/blob/main/nova%20logo%20png.png?raw=true";
    const introImgElement = document.createElement('img');
    introImgElement.src = imageUrl;
    introImgElement.id = 'introLoaderImage';
    introImgElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
        width: 100px;
        height: auto;
        border-radius: 12px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        z-index: 100001;
        opacity: 0;
        transition: opacity 0.5s, transform 1s cubic-bezier(0.23, 1, 0.32, 1);
    `;
    document.body.appendChild(introImgElement);
    setTimeout(() => {
        introImgElement.style.opacity = '1';
        introImgElement.style.transform = 'translate(-50%, -50%) scale(1) rotate(360deg)';
    }, 50);
    setTimeout(() => {
        introImgElement.style.transform = 'translate(-50%, -50%) scale(1) rotate(360deg) translateY(-20px)';
    }, 1100);
    setTimeout(() => {
        introImgElement.style.transform = 'translate(-50%, -50%) scale(1) rotate(360deg) translateY(0)';
    }, 1600);
    setTimeout(() => {
        introImgElement.style.opacity = '0';
    }, 2100);
    setTimeout(() => {
        introImgElement.remove();

    }, 2600);
}

    setupEventListeners() {
        console.log('[AssessmentHelper] Setting up event listeners...');
        const launcher = this.itemMetadata?.UI?.querySelector('#Launcher');
        const getAnswerButton = launcher?.querySelector('#getAnswerButton');
        const buttonTextSpan = getAnswerButton?.querySelector('#getAnswerButtonText');
        const loadingIndicator = getAnswerButton?.querySelector('#loadingIndicator');
        if (!launcher || !getAnswerButton) {
            console.error('AssessmentHelper: Critical UI elements not found during event listener setup');
            return;
        }

        const closeButton = launcher?.querySelector('#closeButton');

        if (closeButton) {
            closeButton.addEventListener('click', () => {
                console.log('AssessmentHelper: Main UI closed, stopping auto-next functionality');
                this.isClosed = true;
                if (this.autoNextTimeout) {
                    clearTimeout(this.autoNextTimeout);
                    this.autoNextTimeout = null;
                }
                if (launcher) {
                    launcher.style.opacity = '0';
                    launcher.style.visibility = 'hidden';
                }

            });
        }

        const openThemePopupButton = launcher?.querySelector('#openThemePopupButton');
        const themePopup = this.itemMetadata?.themePopup?.querySelector('#themePopup');
        const closeThemePopupButton = themePopup?.querySelector('#closeThemePopupButton');
        const defaultThemeButton = themePopup?.querySelector('#defaultThemeButton');
        const meteorThemeButton = themePopup?.querySelector('#meteorThemeButton');

        if (openThemePopupButton && themePopup) {
            openThemePopupButton.addEventListener('click', () => {
                this.showThemePopup();
            });
            if (typeof Draggabilly !== 'undefined') {
                new Draggabilly(themePopup, {
                    handle: '.drag-handle'
                });
            } else {
                console.error('Draggabilly is not defined. Cannot make theme popup draggable.');
            }
        }

        if (closeThemePopupButton && themePopup) {
            closeThemePopupButton.addEventListener('click', () => {
                this.hideThemePopup();
            });
        }

        if (defaultThemeButton) {
            defaultThemeButton.addEventListener('click', () => {
                setTheme('default');
                this.hideThemePopup();
            });
        }

        if (meteorThemeButton) {
            meteorThemeButton.addEventListener('click', () => {
                setTheme('meteor');
                this.hideThemePopup();
            });
        }

        const nordThemeButton = themePopup?.querySelector('#nordThemeButton');
        const vampireThemeButton = themePopup?.querySelector('#vampireThemeButton');
        const galaxyThemeButton = themePopup?.querySelector('#galaxyThemeButton');

        if (nordThemeButton) {
            nordThemeButton.addEventListener('click', () => {
                setTheme('nord');
                this.hideThemePopup();
            });
        }

        if (vampireThemeButton) {
            vampireThemeButton.addEventListener('click', () => {
                setTheme('vampire');
                this.hideThemePopup();
            });
        }

        if (galaxyThemeButton) {
            galaxyThemeButton.addEventListener('click', () => {
                setTheme('galaxy');
                this.hideThemePopup();
            });
        }

        if (getAnswerButton) {
            getAnswerButton.addEventListener('click', async () => {
                console.log('AssessmentHelper: Get answer button clicked');

                if (this.isFetchingAnswer) {
                    console.log('AssessmentHelper: Already fetching answer, ignoring click');
                    return;
                }

                console.log('AssessmentHelper: Starting answer fetch process');
                this.isFetchingAnswer = true;
                getAnswerButton.disabled = true;
                if (buttonTextSpan) buttonTextSpan.style.display = 'none';
                if (loadingIndicator) loadingIndicator.style.display = 'block';

                try {
                    console.log('AssessmentHelper: Fetching article content...');
                    const { prompt, choices, isHottextQuestion, isMultipleChoice, isDragAndDropQuestion, isQuestion } = await this.fetchArticleContent();
                    console.log(`[getAnswerButton] isQuestion: ${isQuestion}`);

                    // Check if it's a question based on the next button's disabled state
                    if (!isQuestion) {
                        console.log('[getAnswerButton] Calling autoClickNext() because no question detected.');
                        console.log('[getAnswerButton] Attempting to call this.autoClickNext().');
                        this.autoClickNext();
                        this.isFetchingAnswer = false;
                        getAnswerButton.disabled = false;
                        if (buttonTextSpan) buttonTextSpan.style.display = 'block';
                        if (loadingIndicator) loadingIndicator.style.display = 'none';
                        console.log('[getAnswerButton] Exiting click handler after calling autoClickNext().');
                        return;
                    }

                    // Check for touchables questions
                    if (document.querySelector('.touchables-question-container')) {
                        this.showAlert('Nova is not able to answer touchables questions at this moment.', 'info');
                        this.isFetchingAnswer = false;
                        getAnswerButton.disabled = false;
                        if (buttonTextSpan) buttonTextSpan.style.display = 'block';
                        if (loadingIndicator) loadingIndicator.style.display = 'none';
                        return; // Skip further processing for touchables
                    }

                    // Check if on courseware delivery page
                    if (window.location.href.includes('https://f2.apps.elf.edmentum.com/courseware-delivery')) {
                        if (buttonTextSpan) {
                            buttonTextSpan.textContent = 'Skip Course'; // Ensure button text is set
                        }
                    }

                    // Check if the button is in "Skip Course" mode
                    if (buttonTextSpan && buttonTextSpan.textContent === 'Skip Course') {
                        console.log('AssessmentHelper: In "Skip Course" mode, initiating auto-click next.');
                        console.log(`[getAnswerButton] isQuestion (Skip Course mode): ${isQuestion}`);
                        this.autoClickNext();
                        this.isFetchingAnswer = false;
                        getAnswerButton.disabled = false;
                        if (buttonTextSpan) buttonTextSpan.style.display = 'block';
                        if (loadingIndicator) loadingIndicator.style.display = 'none';
                        return; // IMPORTANT: Exit here to prevent question answering

                    } else { // Only proceed with question answering if not in "Skip Course" mode and a question is detected
                        // Wait for the .buttonDone to appear, indicating a question is present
                        await this.waitForDoneButton();
                        console.log('AssessmentHelper: Question type:', isHottextQuestion ? 'hottext' : (isMultipleChoice ? 'multiple choice' : (isDragAndDropQuestion ? 'drag and drop' : 'unknown')));

                    let formattedQuery;
                    if (isDragAndDropQuestion) {
                        formattedQuery = prompt + '\n\nPROVIDE ONLY THE DRAGGABLE ID AND THE DROPPABLE ID SEPARATED BY A COMMA (e.g., draggableId,droppableId).';
                    } else if (isHottextQuestion) {
                        const hottextSpans = Array.from(document.querySelectorAll('.interaction-hottext-selectable'));
                        const hottextMapping = hottextSpans.map((span, index) => `${index + 1}. ${span.innerText.trim()}`).join('\n');
                        formattedQuery = prompt + (choices ? '\n\nChoices:\n' + choices.join('\n') : '') + `\n\nHottext Options:\n${hottextMapping}\n\nPROVIDE ONLY THE NUMBER(S) CORRESPONDING TO THE INCORRECT OR MISSPELLED WORD(S) FROM THE HOTTEXT OPTIONS, SEPARATED BY COMMAS IF MULTIPLE. NOTHING ELSE.`;
                    } else {
                        formattedQuery = prompt + (choices ? '\n\nChoices:\n' + choices.join('\n') : '') + "\n\nPROVIDE ONLY A ONE-LETTER ANSWER THAT'S IT NOTHING ELSE (A, B, C, or D).";
                    }

                    console.log('AssessmentHelper: Sending to AI:', formattedQuery);
                    const answer = await this.fetchAnswer(formattedQuery);

                    if (answer.startsWith('Error:')) {
                        console.error('AssessmentHelper: Failed to fetch answer:', answer);
                        this.showAlert(answer, 'error');
                        throw new Error(answer);
                    }


                        console.log('AssessmentHelper: Attempting to select answer:', answer.trim());

                        if (isDragAndDropQuestion) {
                            const [draggableId, droppableId] = answerText.split(',').map(s => s.trim());
                            if (draggableId && droppableId) {
                                this.dragGapMatchItem(draggableId, droppableId);
                            } else {
                                console.error('AssessmentHelper: Invalid drag and drop answer format:', answerText);
                                this.showAlert('Invalid drag and drop answer format. Expected: draggableId,droppableId', 'error');
                            }
                        } else {
                            // Optimization for double choice hottext-multiresponse
                            const hottextSpans = Array.from(document.querySelectorAll('.hottext-mc-span'));
                            if (answerText.includes(',') && hottextSpans.length > 0) {
                            // Likely two answers separated by comma
                            const answers = answerText.split(',').map(a => a.trim().toLowerCase());
                            let foundCount = 0;
                            answers.forEach(ans => {
                                let match = hottextSpans.find(span => span.innerText.toLowerCase() === ans);
                                if (!match) { // If exact match fails, try a more lenient match
                                    match = hottextSpans.find(span => span.innerText.toLowerCase().includes(ans) || ans.includes(span.innerText.toLowerCase()));
                                }
                                if (match) {
                                    console.log('AssessmentHelper: Selecting hottext answer:', ans);
                                    match.click();
                                    foundCount++;
                                } else {
                                    console.warn('AssessmentHelper: Could not find hottext span for:', ans);
                                }
                            });
                            if (foundCount === 0) {
                                console.warn('AssessmentHelper: No hottext answers matched for double choice.');
                            }
                        } else {
                            // Single answer fallback (original logic)
                            let matchingSpan = hottextSpans.find(span => span.innerText.toLowerCase() === answerText.toLowerCase());
                            // Check if the answer is letter-based for hottext questions (e.g., "A,B")
                            const isLetterBasedHottextAnswer = /^[A-D](,[A-D])*$/i.test(answerText.trim());

                            if (isLetterBasedHottextAnswer && hottextSpans.length > 0) {
                                const answerLetters = answerText.toUpperCase().split(',').map(s => s.trim());
                                answerLetters.forEach(answerLetter => {
                                    const index = answerLetter.charCodeAt(0) - 'A'.charCodeAt(0);
                                    if (index >= 0 && index < hottextSpans.length) {
                                        console.log(`AssessmentHelper: Selecting hottext answer for letter ${answerLetter}`);
                                        hottextSpans[index].click();
                                    } else {
                                        console.warn(`AssessmentHelper: Hottext span for letter ${answerLetter} (index ${index}) not found.`);
                                    }
                                });
                            } else if (isHottextQuestion) {
                                // Logic for number-based hottext answers
                                const answerNumbers = answerText.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                                if (answerNumbers.length > 0) {
                                    answerNumbers.forEach(num => {
                                        const hottextSpan = hottextSpans[num - 1]; // Adjust for 0-based index
                                        if (hottextSpan) {
                                            console.log(`AssessmentHelper: Selecting hottext answer for number ${num}`);
                                            hottextSpan.click();
                                        } else {
                                            console.warn(`AssessmentHelper: Hottext span for number ${num} not found.`);
                                        }
                                    });
                                } else {
                                    console.warn('AssessmentHelper: No valid hottext numbers provided in answer:', answerText);
                                }
                            } else {
                                // Original logic for multiple choice answers
                                console.log('AssessmentHelper: Selecting multiple choice answer');
                                const answerLetters = answerText.toUpperCase().split(',').map(s => s.trim()); // Handle A,B,C
                                answerLetters.forEach(answerLetter => {
                                    const radioInput = document.querySelector(`input[id^='answerSelection'][id$='${['A', 'B', 'C', 'D'].indexOf(answerLetter)}']`);
                                    if (radioInput) {
                                        radioInput.click();
                                    } else {
                                        console.warn(`AssessmentHelper: Answer option ${answerLetter} not found in DOM`);
                                    }
                                });
                            }
                        }

                        // Function to check for hottext interaction
                        (function checkIfHottext() {
                            const isHottext =
                                document.querySelector('.interaction-hottext-content-block') !== null ||
                                document.querySelector('.interaction-hottext-selectable') !== null;

                            console.log('Is hottext interaction:', isHottext);
                        })();
                        
                        console.log('AssessmentHelper: Setting up auto-next sequence');
                        const nextButton = document.querySelector('.player-button.worksheets-submit');
                        if (nextButton) {
                            console.log('AssessmentHelper: Clicking next button');
                            nextButton.click();
                        } else {
                            console.warn('AssessmentHelper: Next button not found');
                        }
                    }
                }
                } catch (error) {
                    console.error('AssessmentHelper: Error in answer processing:', error);
                    this.showAlert('Error processing question. Please try again.', 'error');
                } finally {
                    console.log('AssessmentHelper: Resetting UI state');
                    this.isFetchingAnswer = false;
                    getAnswerButton.disabled = false;
                    if (buttonTextSpan) buttonTextSpan.style.display = 'block';
                    if (loadingIndicator) loadingIndicator.style.display = 'none';
                }
            });
        } else {
            console.error('AssessmentHelper: Get Answer button not found on main UI');
        }
    }

    showUI(immediate = false) {
        console.log('AssessmentHelper: Displaying UI...');
        const launcher = this.itemMetadata?.UI?.querySelector('#Launcher');
        const starEffectContainer = launcher?.querySelector('.header-bg-effect');

        if (!launcher) {
            console.error('AssessmentHelper: Launcher UI element not found.');
            return;
        }

        if (immediate) {
            launcher.style.transition = 'none';
            launcher.style.opacity = '1';
            launcher.style.visibility = 'visible';
            console.log('AssessmentHelper: UI displayed immediately.');
        } else {
            setTimeout(() => {
                launcher.style.opacity = '1';
                launcher.style.visibility = 'visible';
                console.log('AssessmentHelper: UI displayed with animation.');
            }, 500);
        }

        if (typeof Draggabilly === 'undefined') {
            console.warn('AssessmentHelper: Draggabilly is not loaded. Drag functionality will be disabled.');
        } else {
            console.log('AssessmentHelper: Initializing Draggabilly for launcher.');
            new Draggabilly(launcher, {
                handle: '.drag-handle'
            });
        }

        if (starEffectContainer && launcher) {
            console.log('AssessmentHelper: Creating stars effect.');
            this.createStars(starEffectContainer, launcher);
        } else {
            console.warn('AssessmentHelper: Star effect container or launcher not found.');
        }
    }



    showMessage(message, duration = 3000) {
        const messageDisplay = document.getElementById('novaMessageDisplay');
        if (messageDisplay) {
            messageDisplay.textContent = message;
            messageDisplay.style.opacity = '1';
            messageDisplay.style.visibility = 'visible';

            if (this.messageTimeout) {
                clearTimeout(this.messageTimeout);
            }
            this.messageTimeout = setTimeout(() => {
                this.hideMessage();
            }, duration);
        }
    }

    hideMessage() {
        const messageDisplay = document.getElementById('novaMessageDisplay');
        if (messageDisplay) {
            messageDisplay.style.opacity = '0';
            messageDisplay.style.visibility = 'hidden';
        }
    }

    hideThemePopup() {
        const themePopup = this.itemMetadata?.themePopup?.querySelector('#themePopup');
        if (themePopup) {
            themePopup.style.opacity = '0';
            themePopup.style.visibility = 'hidden';
            themePopup.style.transform = 'translateY(-20px)';
        }
    }

    showThemePopup() {
        const themePopup = this.itemMetadata?.themePopup?.querySelector('#themePopup');
        if (themePopup) {
            themePopup.style.opacity = '1';
            themePopup.style.visibility = 'visible';
            themePopup.style.transform = 'translateY(0)';
        }
    }

    showAlert(message, type = 'info') {
        const alertBox = document.createElement('div');
        alertBox.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${type === 'error' ? '#f44336' : '#4CAF50'};
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 100000;
            opacity: 0;
            transition: opacity 0.5s, transform 0.5s;
            transform: translateY(-20px);
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        alertBox.textContent = message;
        document.body.appendChild(alertBox);

        setTimeout(() => {
            alertBox.style.opacity = '1';
            alertBox.style.transform = 'translateY(0)';
        }, 100);

        setTimeout(() => {
            alertBox.style.opacity = '0';
            alertBox.style.transform = 'translateY(-20px)';
            alertBox.addEventListener('transitionend', () => alertBox.remove());
        }, 5000);
    }

    async fetchArticleContent() {
        console.log('AssessmentHelper: Entering fetchArticleContent');

        // Check for touchables questions first
        if (document.querySelector('.touchables-question-container')) {
            this.showAlert('Nova is not able to answer touchables questions at this moment.', 'info');
            this.isFetchingAnswer = false;
            if (this.getAnswerButton) this.getAnswerButton.disabled = false;
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
            if (this.getAnswerButtonText) this.getAnswerButtonText.style.display = 'block';
            return { prompt: 'Error: Touchables question detected.', choices: [], isHottextQuestion: false, isMultipleChoice: false };
        }

        let prompt = '';
        const choices = [];
        let isHottextQuestion = false;
        let isMultipleChoice = false;
        let isDragAndDropQuestion = false;

        // Always include all .passage and .questions-container elements in the prompt
        let passageText = '';
        let questionsContainerText = '';
        const passageElements = document.querySelectorAll('.passage');
        passageElements.forEach(el => {
            const text = el.innerText.trim();
            if (text) {
                passageText += (passageText ? '\n\n' : '') + text;
            }
        });
        const questionsContainerElements = document.querySelectorAll('.questions-container');
        questionsContainerElements.forEach(el => {
            const text = el.innerText.trim();
            if (text) {
                questionsContainerText += (questionsContainerText ? '\n\n' : '') + text;
            }
        });
        // Extract content from .stem elements specifically for the prompt
        const stemElements = document.querySelectorAll('.stem');
        if (stemElements.length > 0) {
            stemElements.forEach(el => {
                const text = el.innerText.trim();
                if (text) {
                    prompt += (prompt ? '\n\n' : '') + text;
                }
            });
        } else {
            // Fallback to other prompt elements if no .stem is found
            const promptElements = document.querySelectorAll('.prompt.visible, .question-text, .question-prompt, .question-stem, .content-wrapper, .QuestionNumberHeader');
            for (const el of promptElements) {
                const text = el.innerText.trim();
                if (text) {
                    prompt += (prompt ? '\n\n' : '') + text;
                }
            }
        }
        // Combine all into the prompt, always including passage and questions-container
        prompt = [passageText, questionsContainerText, prompt].filter(Boolean).join('\n\n');

        // Check for hottext questions
        const hottextContainer = document.querySelector('.hottext-multichoice-content, .hottext-multiresponse, .interaction-hottext-content-block, .interaction-hottext-selectable');
        if (hottextContainer) {
            isHottextQuestion = true;
            const hottextSpans = hottextContainer.querySelectorAll('.hottext-mc-span, .hottext-mr-span');
            hottextSpans.forEach(span => {
                choices.push(span.innerText.trim());
            });
        } else {
            // Check for new multiple choice structure
            const newMultipleChoiceList = document.querySelector('.interaction-multiplechoice-choiceslist');
        if (newMultipleChoiceList) {
            const listItems = newMultipleChoiceList.querySelectorAll('li');
            if (listItems.length > 0) {
                isMultipleChoice = true;
                listItems.forEach(li => {
                    const choiceContent = li.querySelector('.interaction-multiplechoice-choice-content');
                    if (choiceContent) {
                        choices.push(choiceContent.innerText.trim());
                    }
                });
            }
        } else if (document.querySelector('input[type="radio"][name^="choice-"]')) {
            // Check for radio button inputs with associated content
            const radioInputs = document.querySelectorAll('input[type="radio"][name^="choice-"]');
            if (radioInputs.length > 0) {
                isMultipleChoice = true;
                radioInputs.forEach(radio => {
                    const label = document.querySelector(`label[for="${radio.id}"]`);
                    if (label) {
                        const choiceContent = label.querySelector('.interaction-multiplechoice-choice-content');
                        if (choiceContent) {
                            choices.push(choiceContent.innerText.trim());
                        }
                    }
                });
            }
        } else {
                // Fallback to old multiple choice detection if new structure not found
                const choiceElements = document.querySelectorAll('.choice-text, .answer-choice-text, .option-label');
                if (choiceElements.length > 0) {
                    isMultipleChoice = true;
                    choiceElements.forEach(el => {
                        const text = el.innerText.trim();
                        if (text) {
                            choices.push(text);
                        }
                    });
                }
            }
        }

        console.log('AssessmentHelper: Extracted prompt:', prompt);
        console.log('AssessmentHelper: Extracted choices:', choices);
        // Check for drag and drop questions
        if (document.querySelector('.dnd-container, .drag-and-drop-question, .ui-draggable, .ui-droppable')) {
            isDragAndDropQuestion = true;
            this.showAlert('Nova is not able to answer drag and drop questions at this moment.', 'info');
            this.isFetchingAnswer = false;
            if (this.getAnswerButton) this.getAnswerButton.disabled = false;
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
            if (this.getAnswerButtonText) this.getAnswerButtonText.style.display = 'block';
            return { prompt: 'Error: Drag and drop question detected.', choices: [], isHottextQuestion: false, isMultipleChoice: false, isDragAndDropQuestion: true };
        }

        (function detectHottextCombined() { 
   // Method 1 – Simple OR using querySelector 
   const method1 = !!( 
     document.querySelector('.interaction-hottext-content-block') || 
     document.querySelector('.interaction-hottext-selectable') || 
     document.querySelector('.interaction-hottext-selectable.text-info') 
   ); 
 
   // Method 2 – Count-based 
   const contentBlockCount = document.querySelectorAll('.interaction-hottext-content-block').length; 
   const selectableCount = document.querySelectorAll('.interaction-hottext-selectable').length; 
   const exactClassCount = document.querySelectorAll('.interaction-hottext-selectable.text-info').length; 
   const method2 = (contentBlockCount + selectableCount + exactClassCount) > 0; 
 
   // Method 3 – Combined selector 
   const combinedSelectorMatches = document.querySelectorAll( 
     '.interaction-hottext-content-block, .interaction-hottext-selectable, .interaction-hottext-selectable.text-info' 
   ); 
   const method3 = combinedSelectorMatches.length > 0; 
 
   // Method 4 – Array + some() 
   const selectors = [ 
     '.interaction-hottext-content-block', 
     '.interaction-hottext-selectable', 
     '.interaction-hottext-selectable.text-info' 
   ]; 
   const method4 = selectors.some(selector => document.querySelector(selector)); 
 
   // Method 5 – Manual class scan 
   let method5 = false; 
   const allElements = document.querySelectorAll('div, span, p, thspan'); 
   allElements.forEach(el => { 
     const cls = el.classList; 
     if ( 
       cls.contains('interaction-hottext-content-block') || 
       cls.contains('interaction-hottext-selectable') || 
       (cls.contains('interaction-hottext-selectable') && cls.contains('text-info')) 
     ) { 
       method5 = true; 
     } 
   }); 
 
   // Final result (if any method detects it, it's hottext) 
   const isHottext = method1 || method2 || method3 || method4 || method5; 
 
   console.log('--- Hottext Detection Summary ---'); 
   console.log('Method 1 (Simple OR):', method1); 
   console.log('Method 2 (Count-based):', method2); 
   console.log('Method 3 (Combined selector):', method3); 
   console.log('Method 4 (Array+some):', method4); 
   console.log('Method 5 (Manual class scan):', method5); 
   console.log('✅ Final result: Is hottext interaction?', isHottext); 
 })();

        const starEffectCSS = ` 
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
        `; 
         
        // Inject CSS into the head 
        const styleSheet = document.createElement("style"); 
        styleSheet.type = "text/css"; 
        styleSheet.innerText = starEffectCSS; 
        document.head.appendChild(styleSheet); 
         
        // --- Theming System --- 
        const themes = { 
            'default': { 
                '--nova-bg-color': '#1c1e2b', 
                '--nova-text-color': 'white', 
                '--nova-button-bg': '#2c2e3b', 
                '--nova-button-hover-bg': '#3a3d4d', 
                '--nova-border-color': 'rgba(255, 255, 255, 0.3)', 
                '--nova-shadow-color': 'rgba(0,0,0,0.2)', 
                '--nova-close-button-color': 'white', 
                '--nova-discord-icon-color': 'white' 
            }, 
            'meteor': { 
                '--nova-bg-color': '#0a0a2a', 
                '--nova-text-color': '#e0e0ff', 
                '--nova-button-bg': '#3a2a5a', 
                '--nova-button-hover-bg': '#5a3a8a', 
                '--nova-border-color': 'rgba(150, 150, 255, 0.4)', 
                '--nova-shadow-color': 'rgba(0,0,0,0.4)', 
                '--nova-close-button-color': '#e0e0ff', 
                '--nova-discord-icon-color': '#e0e0ff' 
            }, 
            'nord': { 
                '--nova-bg-color': '#2E3440', 
                '--nova-text-color': '#ECEFF4', 
                '--nova-button-bg': '#4C566A', 
                '--nova-button-hover-bg': '#5E81AC', 
                '--nova-border-color': 'rgba(236, 239, 244, 0.3)', 
                '--nova-shadow-color': 'rgba(0,0,0,0.2)', 
                '--nova-close-button-color': '#ECEFF4', 
                '--nova-discord-icon-color': '#ECEFF4' 
            }, 
            'vampire': { 
                '--nova-bg-color': '#2B0C11', 
                '--nova-text-color': '#F5E6E8', 
                '--nova-button-bg': '#5C1A1A', 
                '--nova-button-hover-bg': '#8B2C2C', 
                '--nova-border-color': 'rgba(245, 230, 232, 0.3)', 
                '--nova-shadow-color': 'rgba(0,0,0,0.2)', 
                '--nova-close-button-color': '#F5E6E8', 
                '--nova-discord-icon-color': '#F5E6E8' 
            }, 
            'galaxy': { 
                '--nova-bg-color': '#0D1B2A', 
                '--nova-text-color': '#E0FBFC', 
                '--nova-button-bg': '#1B263B', 
                '--nova-button-hover-bg': '#415A77', 
                '--nova-border-color': 'rgba(224, 251, 252, 0.3)', 
                '--nova-shadow-color': 'rgba(0,0,0,0.2)', 
                '--nova-close-button-color': '#E0FBFC', 
                '--nova-discord-icon-color': '#E0FBFC' 
            } 
        }; 
         
            function setTheme(themeName) { 
                const theme = themes[themeName] || themes['default']; 
                for (const key in theme) { 
                    document.documentElement.style.setProperty(key, theme[key]); 
                } 
                localStorage.setItem('novaTheme', themeName); 
         
                // Apply theme to the Nova UI elements if they exist 
                const novaUI = document.getElementById('nova-edmentum-launcher'); 
                if (novaUI) { 
                    for (const key in theme) { 
                        if (key.startsWith('--nova-')) { 
                            novaUI.style.setProperty(key, theme[key]); 
                        } 
                    } 
                } 
            } 
         
        // Apply saved theme or default on load 
                // Initial theme application 
                const savedTheme = localStorage.getItem('novaTheme') || 'default'; 
                setTheme(savedTheme); 
         
                // Apply theme to the Nova UI elements if they exist after creation 
                const novaUI = document.getElementById('nova-edmentum-launcher'); 
                if (novaUI) { 
                    const currentTheme = themes[savedTheme] || themes['default']; 
                    for (const key in currentTheme) { 
                        if (key.startsWith('--nova-')) { 
                            novaUI.style.setProperty(key, currentTheme[key]); 
                        } 
                    } 
                }
        console.log('AssessmentHelper: Is multiple choice:', isMultipleChoice);
        console.log('AssessmentHelper: Is drag and drop question:', isDragAndDropQuestion);

        // Check if the next button is disabled, indicating a question is present
        const nextBtn = document.querySelector('.tutorial-nav-next');
        const isQuestion = (nextBtn && (nextBtn.classList.contains('disabled') || nextBtn.disabled));
        console.log('AssessmentHelper: Is question (based on next button disabled state):', isQuestion);

        return { prompt, choices, isHottextQuestion, isMultipleChoice, isDragAndDropQuestion, isQuestion };
    }

    async waitForDoneButton() {
        return new Promise(resolve => {
            const checkButton = () => {
                const btn = document.querySelector('.buttonDone');
                if (btn) {
                    console.log('Found button:', btn);
                    resolve(true);
                } else {
                    console.log('Not found, rechecking...');
                    setTimeout(checkButton, 200);
                }
            };
            checkButton();
        });
    }

    async fetchAnswer(queryContent) {
        console.log('AssessmentHelper: Starting answer fetch process');
        const maxRetries = 3;
        let retries = 0;

        while (retries < maxRetries) {
            try {
                console.log(`AssessmentHelper: Attempt ${retries + 1} of ${maxRetries}`);
                const response = await fetch('https://diverse-observations-vbulletin-occasional.trycloudflare.com/ask', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ q: queryContent }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`AssessmentHelper: HTTP error (${response.status}):`, errorText);
                    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
                }

                const contentType = response.headers.get('content-type');
                console.log('AssessmentHelper: Response Content-Type:', contentType);

                let data;
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                    if (!data || !data.response) {
                        console.error('AssessmentHelper: Empty or invalid response from AI service:', data);
                        throw new Error('AI service returned an empty or invalid response.');
                    }
                    if (typeof data.response !== 'string') {
                        console.warn('AssessmentHelper: data.response is not a string, converting to string:', data.response);
                        data.response = String(data.response);
                    }
                    if (data.response.trim() === '') {
                        console.error('AssessmentHelper: AI service returned an empty string');
                        throw new Error('AI service returned an empty string.');
                    }
                    return data.response;
                } else {
                    const textResponse = await response.text();
                    console.error('AssessmentHelper: Expected JSON, but received:', textResponse);
                    throw new Error('Received non-JSON response from AI service.');
                }
            } catch (error) {
                console.error(`AssessmentHelper: Fetch attempt ${retries + 1} failed:`, error);
                retries++;
                if (retries < maxRetries) {
                    console.log(`AssessmentHelper: Waiting before retry ${retries + 1}...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        console.error('AssessmentHelper: All retry attempts failed');
        this.showAlert('Failed to fetch answer after multiple retries.', 'error');
        return 'Error: Failed to fetch answer after multiple retries.';
    }

    dragGapMatchItem(draggableId, droppableId) {
        const draggable = document.querySelector(`[data-ed-draggable-id="${draggableId}"]`);
        const droppable = document.querySelector(`[data-ed-droppable-id="${droppableId}"]`);

        if (draggable && droppable) {
            // Simulate drag start
            const dragStartEvent = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: draggable.getBoundingClientRect().left,
                clientY: draggable.getBoundingClientRect().top
            });
            draggable.dispatchEvent(dragStartEvent);

            // Simulate drag over droppable
            const dragOverEvent = new MouseEvent('mousemove', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: droppable.getBoundingClientRect().left + droppable.offsetWidth / 2,
                clientY: droppable.getBoundingClientRect().top + droppable.offsetHeight / 2
            });
            document.dispatchEvent(dragOverEvent);

            // Simulate drop
            const dropEvent = new MouseEvent('mouseup', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: droppable.getBoundingClientRect().left + droppable.offsetWidth / 2,
                clientY: droppable.getBoundingClientRect().top + droppable.offsetHeight / 2
            });
            document.dispatchEvent(dropEvent);

            console.log(`AssessmentHelper: Dragged item ${draggableId} to ${droppableId}`);
        } else {
            console.error(`AssessmentHelper: Draggable ${draggableId} or Droppable ${droppableId} not found.`);
        }
    }

    skipTutorials() {
        const MAX_ATTEMPTS = 8;
        // Step 1: Automatically click the Table of Contents button if present
        const tocButton = document.querySelector('button.content-toolbar-panel-button.open[data-panelid="tutorial-toc"]');
        if (tocButton) {
            tocButton.click();
        }
        // Step 2: Enable all tutorial section buttons
        function enableButtons(sections) {
            for (let child of sections.children) {
                let button = child.children[0];
                if (!button || button.className.includes("toc-current")) {
                    continue;
                }
                button.className = "toc-section toc-visited";
                button.removeAttribute("disabled");
            }
        }
        // Step 3: Find sections and enable buttons
        function findSections(delay, attempt) {
            if (attempt >= MAX_ATTEMPTS) {
                console.log("[Edmentum Skip Tutorials]: Failed to locate the '.tutorial-toc-sections' class after " + attempt + " attempts.");
                return;
            }
            const sections = document.querySelector(".tutorial-toc-sections");
            if (!sections) {
                setTimeout(() => findSections(delay * ++attempt, attempt), delay);
            } else {
                enableButtons(sections);
                // Step 4: Click the Summary button if present
                const summaryButton = Array.from(sections.querySelectorAll('button')).find(btn => btn.innerText.trim() === 'Summary');
                if (summaryButton) {
                    summaryButton.click();
                }
            }
        }
        findSections(500, 1);
    }
}

// Initialize the AssessmentHelper
const assessmentHelper = new AssessmentHelper();

// Add keyboard shortcut for skipping tutorials (Ctrl + Alt + S)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 's') {
        assessmentHelper.skipTutorials();
    }
});
