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

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = starEffectCSS;
document.head.appendChild(styleSheet);

class AssessmentHelper {
    constructor() {
        this.answerIsDragging = false;
        this.answerCurrentX = 0;
        this.answerCurrentY = 0;
        this.answerInitialX = 0;
        this.answerInitialY = 0;
        this.cachedArticle = null;
        this.isFetchingAnswer = false;
        this.novaButtonClickCount = 0;
        this.animeScriptUrl = 'https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js';
        this.draggabillyScriptUrl = 'https://unpkg.com/draggabilly@3/dist/draggabilly.pkgd.min.js';

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        try {
            await this.loadScript(this.animeScriptUrl);
            await this.loadScript(this.draggabillyScriptUrl);
            this.itemMetadata = {
                UI: this.createUI(),
                answerUI: this.createAnswerUI()
            };
            this.playIntroAnimation();
        } catch (error) {
            this.showAlert('Failed to load required scripts for the Assessment Helper. Some features may not work.', 'error');
            this.itemMetadata = {
                UI: this.createUI(),
                answerUI: this.createAnswerUI()
            };
            this.showUI(true);
        }
    }

    debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve();
            script.onerror = () => {
                script.remove();
                reject(new Error(`Failed to load script: ${url}`));
            };
            document.head.appendChild(script);
        });
    }

    createUI() {
        const container = document.createElement("div");
        const launcher = document.createElement("div");
        launcher.id = "Launcher";
        launcher.className = "Launcher";
        launcher.style.cssText = "outline: none;min-height: 160px;opacity: 0;visibility: hidden;transition: opacity 0.5s ease;font-family: 'Nunito', sans-serif;width: 180px;height: 240px;background: #1c1e2b;position: fixed;border-radius: 12px;display: flex;flex-direction: column;align-items: center;color: white;font-size: 16px;top: 50%;right: 20px;transform: translateY(-50%);z-index: 99999;padding: 16px;box-shadow: 0 4px 8px rgba(0,0,0,0.2);overflow: hidden;white-space: nowrap;";

        const dragHandle = document.createElement("div");
        dragHandle.className = "drag-handle";
        dragHandle.style.cssText = "width: 100%;height: 24px;cursor: move;background: transparent;position: absolute;top: 0;";

        const uiImg = document.createElement("img");
        uiImg.src = "https://raw.githubusercontent.com/Cpmjaguar1234/nova/refs/heads/main/nova%20logo%20png.png";
        uiImg.style.cssText = "width: 90px;height: 90px;margin-top: 32px;border-radius: 50%;";

        const closeButton = document.createElement("button");
        closeButton.id = "closeButton";
        closeButton.textContent = "\u00D7";
        closeButton.style.cssText = "position: absolute;top: 8px;right: 8px;background: none;border: none;color: white;font-size: 18px;cursor: pointer;padding: 2px 8px;transition: color 0.2s ease, transform 0.1s ease; opacity: 0.5; display: block; visibility: visible;";

        const getAnswerButton = document.createElement("button");
        getAnswerButton.id = "getAnswerButton";
        getAnswerButton.style.cssText = "background: #2c2e3b;border: none;color: white;padding: 12px 20px;border-radius: 8px;cursor: pointer;margin-top: 24px;width: 120px;height: 44px;font-size: 16px;transition: background 0.2s ease, transform 0.1s ease; display: flex; justify-content: center; align-items: center;";

        const loadingIndicator = document.createElement("div");
        loadingIndicator.id = "loadingIndicator";
        loadingIndicator.style.cssText = "border: 4px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top: 4px solid #fff; width: 20px; height: 20px; animation: spin 1s linear infinite; display: none;";

        const buttonTextSpan = document.createElement("span");
        buttonTextSpan.textContent = "Skip Article";
        buttonTextSpan.id = "getAnswerButtonText";

        getAnswerButton.appendChild(loadingIndicator);
        getAnswerButton.appendChild(buttonTextSpan);

        const version = document.createElement("div");
        version.style.cssText = "position: absolute;bottom: 8px;right: 8px;font-size: 12px;opacity: 0.5;";
        version.textContent = "1.2";

        const discordLink = document.createElement("a");
        discordLink.href = "https://discord.gg/Gt2eZXSSS5";
        discordLink.target = "_blank";
        discordLink.style.cssText = "position: absolute; bottom: 8px; left: 8px; opacity: 0.5; transition: opacity 0.2s ease; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;";
        discordLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-discord" viewBox="0 0 16 16"> <path fill="white" d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/> </svg>`;
        discordLink.onmouseover = () => discordLink.style.opacity = '1';
        discordLink.onmouseout = () => discordLink.style.opacity = '0.5';

        launcher.appendChild(dragHandle);
        launcher.appendChild(uiImg);
        launcher.appendChild(closeButton);
        launcher.appendChild(getAnswerButton);
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
        return container;
    }

    createAnswerUI() {
        const container = document.createElement("div");
        const answerContainer = document.createElement("div");
        answerContainer.id = "answerContainer";
        answerContainer.className = "answerLauncher";
        answerContainer.style.cssText = "outline: none;min-height: 60px;transform: translateX(0px) translateY(-50%);opacity: 0;visibility: hidden;transition: opacity 0.3s ease, transform 0.3s ease;font-family: 'Nunito', sans-serif;width: 60px;height: 60px;background: #1c1e2b;position: fixed;border-radius: 8px;display: flex;justify-content: center;align-items: center;color: white;font-size: 24px;top: 50%;right: 220px;z-index: 99998;padding: 8px;box-shadow: 0 4px 8px rgba(0,0,0,0.2);overflow: hidden;white-space: normal;";

        const dragHandle = document.createElement("div");
        dragHandle.className = "answer-drag-handle";
        dragHandle.style.cssText = "width: 100%;height: 24px;cursor: move;background: transparent;position: absolute;top: 0;";

        const closeButton = document.createElement("button");
        closeButton.id = "closeAnswerButton";
        closeButton.style.cssText = "position: absolute;top: 8px;right: 8px;background: none;border: none;color: white;font-size: 18px;cursor: pointer;padding: 2px 8px;transition: color 0.2s ease, transform 0.1s ease;";

        const answerContent = document.createElement("div");
        answerContent.id = "answerContent";
        answerContent.style.cssText = "padding: 0;margin: 0;word-wrap: break-word;font-size: 24px;font-weight: bold;display: flex;justify-content: center;align-items: center;width: 100%;height: 100%;";

        answerContainer.appendChild(dragHandle);
        answerContainer.appendChild(closeButton);
        answerContainer.appendChild(answerContent);
        container.appendChild(answerContainer);
        return container;
    }

    playIntroAnimation() {
        if (typeof anime === 'undefined') {
            this.showUI();
            return;
        }

        const imageUrl = "https://github.com/Cpmjaguar1234/nova/blob/main/nova%20logo%20png.png?raw=true";
        const introImgElement = document.createElement('img');
        introImgElement.src = imageUrl;
        introImgElement.id = 'introLoaderImage';
        introImgElement.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.5); width: 100px; height: auto; border-radius: 12px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); z-index: 100001; opacity: 0;`;
        document.body.appendChild(introImgElement);

        anime.timeline({
                easing: 'easeInOutQuad',
                duration: 800,
                complete: () => {
                    introImgElement.remove();
                    this.showUI();
                }
            })
            .add({
                targets: introImgElement,
                opacity: [0, 1],
                scale: [0.5, 1],
                rotate: '1turn',
                duration: 1000,
                easing: 'easeOutExpo'
            })
            .add({
                targets: introImgElement,
                translateY: '-=20',
                duration: 500,
                easing: 'easeInOutSine'
            })
            .add({
                targets: introImgElement,
                translateY: '+=20',
                duration: 500,
                easing: 'easeInOutSine'
            })
            .add({
                targets: introImgElement,
                opacity: 0,
                duration: 500,
                easing: 'linear'
            }, '+=500');
    }

    showUI(skipAnimation = false) {
        document.body.appendChild(this.itemMetadata.UI);
        document.body.appendChild(this.itemMetadata.answerUI);
        const launcher = document.getElementById('Launcher');

        const showAndSetup = () => {
            launcher.style.visibility = 'visible';
            launcher.style.opacity = 1;
            const starEffectContainer = launcher.querySelector('.header-bg-effect');
            if (starEffectContainer) {
                this.createStars(starEffectContainer, launcher);
            }
            if (localStorage.getItem('discordPopupDismissed') !== 'true') {
                this.displayDiscordPopup();
            }
            this.setupEventListeners();
        };

        if (launcher) {
            if (skipAnimation) {
                showAndSetup();
            } else {
                launcher.style.visibility = 'visible';
                setTimeout(() => {
                    launcher.style.opacity = 1;
                }, 10);
                setTimeout(showAndSetup, 500);
            }
        }
    }

    showAlert(message, type = 'info') {
        const alertContainer = document.createElement('div');
        alertContainer.style.cssText = `position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background-color: ${type === 'error' ? '#dc3545' : '#007bff'}; color: white; padding: 15px 25px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 100000; opacity: 0; transition: opacity 0.5s ease-in-out; font-family: 'Nunito', sans-serif; font-size: 16px; max-width: 80%; text-align: center;`;
        alertContainer.textContent = message;
        document.body.appendChild(alertContainer);
        setTimeout(() => alertContainer.style.opacity = 1, 10);
        setTimeout(() => {
            alertContainer.style.opacity = 0;
            alertContainer.addEventListener('transitionend', () => alertContainer.remove());
        }, 5000);
    }

    getUserNameFromDOM() {
        const element = document.evaluate('//*[@id="profile-menu"]/div', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        const elementText = element ? element.innerText.trim() : "";
        const nameMatch = elementText.match(/^([^(]+)/);
        return nameMatch ? nameMatch[1].trim() : "Friend";
    }

    displayDiscordPopup() {
        const discordLink = "https://discord.gg/Gt2eZXSSS5";
        const popup = document.createElement('div');
        popup.id = 'discordPopup';
        popup.style.cssText = "position: fixed; top: 20px; right: 20px; background: linear-gradient(135deg, #1c1e2b 0%, #2c2e3b 100%); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 100002; opacity: 0; transform: translateX(20px); transition: opacity 0.5s ease-out, transform 0.5s ease-out; font-family: 'Nunito', sans-serif; font-size: 16px; max-width: 300px; text-align: center; display: flex; flex-direction: column; align-items: center;";

        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.cssText = "position: absolute; top: 8px; right: 8px; background: none; border: none; color: white; font-size: 18px; cursor: pointer; opacity: 0.5; transition: color 0.2s ease, transform 0.1s ease, opacity 0.2s ease;";
        closeButton.onmouseover = () => { closeButton.style.color = '#ff6b6b'; closeButton.style.opacity = 1; };
        closeButton.onmouseout = () => { closeButton.style.color = 'white'; closeButton.style.opacity = 0.5; };
        closeButton.onmousedown = () => closeButton.style.transform = 'scale(0.95)';
        closeButton.onmouseup = () => closeButton.style.transform = 'scale(1)';

        const message = document.createElement('p');
        message.innerHTML = `Would you like to join the Nova Discord?`;
        message.style.cssText = 'margin-bottom: 15px; line-height: 1.4;';

        const discordBtn = document.createElement('a');
        discordBtn.href = discordLink;
        discordBtn.target = '_blank';
        discordBtn.textContent = 'Join Discord';
        discordBtn.style.cssText = "background-color: #5865f2; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; transition: background-color 0.2s ease, transform 0.1s ease; display: inline-block; box-shadow: 0 2px 5px rgba(0,0,0,0.2);";
        discordBtn.onmouseover = () => discordBtn.style.backgroundColor = '#4e5d94';
        discordBtn.onmouseout = () => discordBtn.style.backgroundColor = '#5865f2';
        discordBtn.onmousedown = () => discordBtn.style.transform = 'scale(0.98)';
        discordBtn.onmouseup = () => discordBtn.style.transform = 'scale(1)';

        const dismissOptionDiv = document.createElement('div');
        dismissOptionDiv.style.cssText = "margin-top: 15px; font-size: 12px; display: flex; align-items: center; justify-content: center; opacity: 0.8; font-weight: 500;";

        const dismissCheckbox = document.createElement('input');
        dismissCheckbox.type = 'checkbox';
        dismissCheckbox.id = 'dismissDiscordPopupCheckbox';
        dismissCheckbox.style.cssText = "margin-right: 5px; cursor: pointer; appearance: none; width: 14px; height: 14px; border: 1px solid white; border-radius: 3px; background-color: transparent; position: relative; vertical-align: middle;";
        dismissCheckbox.onchange = function() {
            this.style.backgroundColor = this.checked ? '#5865f2' : 'transparent';
            this.style.borderColor = this.checked ? '#5865f2' : 'white';
        };

        const dismissLabel = document.createElement('label');
        dismissLabel.htmlFor = 'dismissDiscordPopupCheckbox';
        dismissLabel.textContent = "Don't show this again";
        dismissLabel.style.cursor = "pointer";

        dismissOptionDiv.appendChild(dismissCheckbox);
        dismissOptionDiv.appendChild(dismissLabel);

        popup.appendChild(closeButton);
        popup.appendChild(message);
        popup.appendChild(discordBtn);
        popup.appendChild(dismissOptionDiv);
        document.body.appendChild(popup);

        const dismissPopupAnimation = (isPermanent = false) => {
            if (isPermanent) {
                localStorage.setItem('discordPopupDismissed', 'true');
            }
            popup.style.opacity = 0;
            popup.style.transform = 'translateX(20px)';
            popup.addEventListener('transitionend', () => popup.remove(), { once: true });
        };

        setTimeout(() => {
            popup.style.opacity = 1;
            popup.style.transform = 'translateX(0)';
        }, 100);

        const autoDismissTimeout = setTimeout(() => {
            if (document.getElementById('discordPopup')) {
                dismissPopupAnimation(false);
            }
        }, 10000);

        closeButton.addEventListener('click', () => {
            clearTimeout(autoDismissTimeout);
            dismissPopupAnimation(dismissCheckbox.checked);
        });
    }

    async logToDataEndpoint() {
        try {
            const element = document.evaluate('//*[@id="profile-menu"]/div', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            const elementText = element ? element.innerText.trim() : "Element not found";
            const spanElement = document.querySelector('.activeClassNameNew');
            const spanText = spanElement ? spanElement.innerText.trim() : "Span element not found";
            const timestamp = new Date();
            const os = this.getOS();
            const browser = this.getBrowser();
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            const isMobile = /android|ipad|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
            
            const payload = {
                text: `Name: ${elementText} | Class: ${spanText} | OS: ${os} | Browser: ${browser} | Time: ${timestamp.toLocaleString()} | Nova Clicks: ${this.novaButtonClickCount}`,
                timestamp: timestamp.toISOString(),
                os: os,
                browser: browser,
                isMobile: isMobile,
                novaClicks: this.novaButtonClickCount
            };

            await fetch('https://diverse-observations-vbulletin-occasional.trycloudflare.com/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            
        }
    }

    getOS() {
        const userAgent = window.navigator.userAgent;
        if (userAgent.indexOf('Win') !== -1) return 'Windows';
        if (userAgent.indexOf('Mac') !== -1) return 'macOS';
        if (userAgent.indexOf('Linux') !== -1) return 'Linux';
        if (userAgent.indexOf('Android') !== -1) return 'Android';
        if (userAgent.indexOf('like Mac') !== -1) return 'iOS';
        return 'Unknown OS';
    }

    getBrowser() {
        const userAgent = window.navigator.userAgent;
        if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf("Edg/") < 0) return 'Google Chrome';
        if (userAgent.indexOf('Firefox') > -1) return 'Mozilla Firefox';
        if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') < 0) return 'Apple Safari';
        if (userAgent.indexOf("Edg/") > -1) return 'Microsoft Edge';
        if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) return 'Opera';
        return 'Unknown Browser';
    }

    async fetchAnswer(queryContent, retryCount = 0) {
        const MAX_RETRIES = 3;
        const RETRY_DELAY_MS = 1000;
        try {
            const response = await fetch('https://diverse-observations-vbulletin-occasional.trycloudflare.com/ask', {
                method: 'POST',
                cache: 'no-cache',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ q: queryContent, article: this.cachedArticle || null })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                if (response.status === 500 && errorBody.includes("429 You exceeded your current quota")) {
                    if (retryCount < MAX_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                        return this.fetchAnswer(queryContent, retryCount + 1);
                    } else {
                        throw new Error(`API quota exceeded after ${MAX_RETRIES} retries.`);
                    }
                } else {
                    throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
                }
            }
            const data = await response.json();
            return data.response ? String(data.response).trim() : 'No answer available';
        } catch (error) {
            return `Error: ${error.message}`;
        }
    }

    async fetchArticleContent() {
        const articleContainer = document.querySelector('#start-reading');
        let articleContent = '';
        if (articleContainer) {
            const paragraphs = articleContainer.querySelectorAll('p');
            articleContent = Array.from(paragraphs).map(p => p.textContent.trim()).join(' ');
        }
        const questionContainer = document.querySelector('#activity-component-react');
        let questionContent = '';
        if (questionContainer) {
            questionContent = questionContainer.textContent.trim();
        }
        const combinedContent = `${articleContent}\n\n${questionContent}`;
        this.cachedArticle = combinedContent;
        return combinedContent;
    }

    setupEventListeners() {
        const launcher = document.getElementById('Launcher');
        const answerContainer = document.getElementById('answerContainer');
        if (!launcher || !answerContainer) return;

        const getAnswerButton = launcher.querySelector('#getAnswerButton');
        const loadingIndicator = launcher.querySelector('#loadingIndicator');
        const buttonTextSpan = launcher.querySelector('#getAnswerButtonText');
        const closeButton = launcher.querySelector('#closeButton');
        const closeAnswerButton = answerContainer.querySelector('#closeAnswerButton');
        const answerDragHandle = answerContainer.querySelector('.answer-drag-handle');
        const answerContent = answerContainer.querySelector('#answerContent');

        if (!document.getElementById('assessment-helper-styles')) {
            const style = document.createElement('style');
            style.id = 'assessment-helper-styles';
            style.textContent = `
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                #closeButton:hover, #closeAnswerButton:hover { color: #ff6b6b; opacity: 1 !important; }
                #closeButton:active, #closeAnswerButton:active { color: #e05252; transform: scale(0.95); }
                #getAnswerButton:hover { background: #3c3e4b; }
                #getAnswerButton:active { background: #4c4e5b; transform: scale(0.98); }
                #getAnswerButton:disabled { opacity: 0.6; cursor: not-allowed; }
                .answerLauncher.show { opacity: 1; visibility: visible; transform: translateY(-50%) scale(1); }
                #dismissDiscordPopupCheckbox:checked::before { content: '\\2713'; display: block; width: 100%; height: 100%; color: white; text-align: center; line-height: 14px; font-size: 10px; position: absolute; top: 0; left: 0; }
            `;
            document.head.appendChild(style);
        }

        if (typeof Draggabilly !== 'undefined') {
            try {
                new Draggabilly(launcher, { handle: '.drag-handle', delay: 50 });
            } catch (error) {
                
            }
        }

        if (answerDragHandle) {
            answerDragHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.answerIsDragging = true;
                const rect = answerContainer.getBoundingClientRect();
                this.answerInitialX = e.clientX - rect.left;
                this.answerInitialY = e.clientY - rect.top;
                answerContainer.style.position = 'fixed';
            });
        }
        
        document.addEventListener('mousemove', (e) => {
            if (this.answerIsDragging && answerContainer) {
                e.preventDefault();
                let newX = e.clientX - this.answerInitialX;
                let newY = e.clientY - this.answerInitialY;
                answerContainer.style.left = `${newX}px`;
                answerContainer.style.top = `${newY}px`;
                answerContainer.style.right = null;
                answerContainer.style.bottom = null;
                answerContainer.style.transform = 'none';
            }
        });

        document.addEventListener('mouseup', () => {
            this.answerIsDragging = false;
        });

        document.addEventListener('mouseleave', () => {
            this.answerIsDragging = false;
        });

        if (closeButton) {
            closeButton.addEventListener('click', () => {
                launcher.style.opacity = 0;
                launcher.addEventListener('transitionend', () => {
                    launcher.style.visibility = 'hidden';
                }, { once: true });
            });
        }

        if (closeAnswerButton) {
            closeAnswerButton.addEventListener('click', () => {
                answerContainer.style.opacity = 0;
                answerContainer.style.transform = 'translateY(-50%) scale(0.8)';
                answerContainer.addEventListener('transitionend', () => {
                    answerContainer.style.display = 'none';
                }, { once: true });
            });
        }

        if (getAnswerButton) {
            getAnswerButton.addEventListener('click', async () => {
                if (this.isFetchingAnswer) return;

                this.isFetchingAnswer = true;
                this.novaButtonClickCount++;
                getAnswerButton.disabled = true;
                if (buttonTextSpan) buttonTextSpan.style.display = 'none';
                if (loadingIndicator) loadingIndicator.style.display = 'block';

                await this.logToDataEndpoint();

                const processQuestion = async (excludedAnswers = []) => {
                    try {
                        let queryContent = await this.fetchArticleContent();
                        queryContent += "\n\nPROVIDE ONLY A ONE-LETTER ANSWER THAT'S IT NOTHING ELSE (A, B, C, or D).";
                        if (excludedAnswers.length > 0) {
                            queryContent += `\n\nDo not pick letter ${excludedAnswers.join(', ')}.`;
                        }

                        const answer = await this.fetchAnswer(queryContent);
                        answerContent.textContent = answer;
                        answerContainer.style.display = 'flex';
                        answerContainer.style.visibility = 'visible';
                        answerContainer.classList.add('show');

                        if (answer && ['A', 'B', 'C', 'D'].includes(answer.trim()) && !excludedAnswers.includes(answer.trim())) {
                            const trimmedAnswer = answer.trim();
                            const options = document.querySelectorAll('[role="radio"]');
                            const index = trimmedAnswer.charCodeAt(0) - 'A'.charCodeAt(0);

                            if (options[index]) {
                                options[index].click();

                                setTimeout(() => {
                                    const submitButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.trim() === 'Submit');
                                    if (submitButton) submitButton.click();

                                    setTimeout(() => {
                                        const nextButton = document.getElementById('feedbackActivityFormBtn');
                                        if (nextButton) {
                                            const isTryAgain = nextButton.textContent.trim() === 'Try again';
                                            nextButton.click();

                                            setTimeout(() => {
                                                answerContainer.style.display = 'none';
                                                answerContainer.classList.remove('show');
                                                if (isTryAgain) {
                                                    processQuestion([...excludedAnswers, trimmedAnswer]);
                                                } else {
                                                    processQuestion();
                                                }
                                            }, 1000);
                                        }
                                    }, 1000);
                                }, 500);
                            }
                        }
                    } catch (error) {
                        answerContent.textContent = `Error: ${error.message}`;
                        answerContainer.style.display = 'flex';
                        answerContainer.style.visibility = 'visible';
                        answerContainer.classList.add('show');
                    }
                };
                await processQuestion();
                
                this.isFetchingAnswer = false;
                getAnswerButton.disabled = false;
                if (loadingIndicator) loadingIndicator.style.display = 'none';
                if (buttonTextSpan) buttonTextSpan.style.display = 'block';
            });
        }
    }
}

const helper = new AssessmentHelper();
