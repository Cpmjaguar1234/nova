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

class AssessmentHelper {
    constructor() {
        console.log('AssessmentHelper: Initializing...');
        this.answerIsDragging = false;
        this.answerCurrentX = 0;
        this.answerCurrentY = 0;
        this.answerInitialX = 0;
        this.answerInitialY = 0;
        this.cachedArticle = null;
        this.isFetchingAnswer = false;
        // anime.js removed; using pure CSS/JS for animations

        this.draggabillyScriptUrl = 'https://unpkg.com/draggabilly@3/dist/draggabilly.pkgd.min.js';
        this.autoNextTimeout = null;
        this.isClosed = false;

        if (document.readyState === 'loading') {
            console.log('AssessmentHelper: Document still loading, waiting for DOMContentLoaded...');
            document.addEventListener('DOMContentLoaded', () => {
                this.init();
            });
        } else {
            this.init();
        }
    }

    async init() {
        try {
            console.log('AssessmentHelper: Loading required scripts...');
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
                answerUI: this.createAnswerUI()
            };

            document.body.appendChild(this.itemMetadata.UI);
            document.body.appendChild(this.itemMetadata.answerUI);
            console.log('AssessmentHelper: UI components mounted to DOM');
            
            this.setupEventListeners();
            this.playIntroAnimation();
        } catch (error) {
            console.error('AssessmentHelper: Initialization failed:', error);
            this.showAlert('Failed to load required scripts for the Assessment Helper. Some features may not work.', 'error');
            this.itemMetadata = {
                UI: this.createUI(),
                answerUI: this.createAnswerUI()
            };
            document.body.appendChild(this.itemMetadata.UI);
            document.body.appendChild(this.itemMetadata.answerUI);
            
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
        loadingIndicator.style.cssText = "border: 4px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top: 4px solid #fff; width: 20px; height: 20px; display: none; animation: spin 1s linear infinite;";
        // Add CSS for @keyframes spin if not present
        if (!document.getElementById('custom-spin-keyframes')) {
            const spinStyle = document.createElement('style');
            spinStyle.id = 'custom-spin-keyframes';
            spinStyle.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
            document.head.appendChild(spinStyle);
        }

        const buttonTextSpan = document.createElement("span");
        buttonTextSpan.textContent = "Skip Test";
        buttonTextSpan.id = "getAnswerButtonText";

        getAnswerButton.appendChild(loadingIndicator);
        getAnswerButton.appendChild(buttonTextSpan);

        const version = document.createElement("div");
        version.style.cssText = "position: absolute;bottom: 8px;right: 8px;font-size: 12px;opacity: 0.5;";
        version.textContent = "1.2";

        const discordLink = document.createElement("a");
        discordLink.href = "https://discord.gg/fmXQN5Pg4E";
        discordLink.target = "_blank";
        discordLink.style.cssText = "position: absolute; bottom: 8px; left: 8px; opacity: 0.5; transition: opacity 0.2s ease; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;";
        discordLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-discord" viewBox="0 0 16 16"><path fill="white" d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/></svg>`;
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
        this.showUI();
        this.setupEventListeners();
    }, 2600);
}

    setupEventListeners() {
        console.log('AssessmentHelper: Setting up event listeners...');
        const launcher = this.itemMetadata?.UI?.querySelector('#Launcher');
        const getAnswerButton = launcher?.querySelector('#getAnswerButton');
        const buttonTextSpan = getAnswerButton?.querySelector('#getAnswerButtonText');
        const loadingIndicator = getAnswerButton?.querySelector('#loadingIndicator');
        const answerContainer = this.itemMetadata?.answerUI?.querySelector('#answerContainer');

        if (!launcher || !getAnswerButton) {
            console.error('AssessmentHelper: Critical UI elements not found during event listener setup');
            return;
        }

        if (answerContainer) {
            console.log('AssessmentHelper: Initializing answer container state');
            answerContainer.style.display = 'none';
            answerContainer.style.visibility = 'hidden';
            answerContainer.style.opacity = '0';
        }

        const answerContent = answerContainer?.querySelector('#answerContent');
        const closeButton = launcher?.querySelector('#closeButton');
        const closeAnswerButton = answerContainer?.querySelector('#closeAnswerButton');

        if (closeAnswerButton) {
            closeAnswerButton.textContent = '×';
            closeAnswerButton.addEventListener('click', () => {
                console.log('AssessmentHelper: Answer container closed');
                if (answerContainer) {
                    answerContainer.style.opacity = '0';
                    answerContainer.style.visibility = 'hidden';
                }
            });
        }

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
                if (answerContainer) {
                    answerContainer.style.opacity = '0';
                    answerContainer.style.visibility = 'hidden';
                }
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
                    const queryContent = await this.fetchArticleContent();
                    if (queryContent.startsWith('Error:')) {
                        console.error('AssessmentHelper: Failed to fetch article content:', queryContent);
                        this.showAlert(queryContent, 'error');
                        throw new Error(queryContent);
                    }

                    const isHottextQuestion = document.querySelector('.hottext-multichoice-content') !== null;
                    console.log('AssessmentHelper: Question type:', isHottextQuestion ? 'hottext' : 'multiple choice');
                    
                    let formattedQuery = queryContent + (isHottextQuestion ?
                        "\n\nPROVIDE ONLY THE INCORRECT OR MISSPELLED WORD FROM THE CHOICES, NOTHING ELSE." :
                        "\n\nPROVIDE ONLY A ONE-LETTER ANSWER THAT'S IT NOTHING ELSE (A, B, C, or D).");
                    
                    console.log('AssessmentHelper: Fetching answer...');
                    const answer = await this.fetchAnswer(formattedQuery);

                    if (answer.startsWith('Error:')) {
                        console.error('AssessmentHelper: Failed to fetch answer:', answer);
                        this.showAlert(answer, 'error');
                        throw new Error(answer);
                    }

                   
                    if (answerContent && answerContainer) {
                        answerContent.textContent = answer;
                        answerContainer.style.display = 'flex';
                        answerContainer.style.visibility = 'visible';
                        answerContainer.style.opacity = '1';
                        answerContainer.style.width = '200px';
                        
                        const answerText = answer.trim();
                        console.log('AssessmentHelper: Attempting to select answer:', answerText);
                        
                        // Optimization for double choice hottext-multiresponse
                        const hottextSpans = Array.from(document.querySelectorAll('.hottext-mc-span'));
                        if (answerText.includes(',') && hottextSpans.length > 0) {
                            // Likely two answers separated by comma
                            const answers = answerText.split(',').map(a => a.trim().toLowerCase());
                            let foundCount = 0;
                            answers.forEach(ans => {
                                const match = hottextSpans.find(span => span.innerText.toLowerCase() === ans);
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
                            const matchingSpan = hottextSpans.find(span => span.innerText.toLowerCase() === answerText.toLowerCase());
                            if (matchingSpan) {
                                console.log('AssessmentHelper: Selecting hottext answer');
                                matchingSpan.click();
                            } else {
                                console.log('AssessmentHelper: Selecting multiple choice answer');
                                const answerLetter = answerText.charAt(0).toUpperCase();
                                const radioInput = document.querySelector(`input[id^='answerSelection'][id$='${['A', 'B', 'C', 'D'].indexOf(answerLetter)}']`);
                                if (radioInput) {
                                    radioInput.click();
                                } else {
                                    console.warn('AssessmentHelper: Answer option not found in DOM');
                                }
                            }
                        }
                        
                        console.log('AssessmentHelper: Setting up auto-next sequence');
                        setTimeout(() => {
                            const nextButton = document.querySelector('.player-button.worksheets-submit');
                            if (nextButton) {
                                console.log('AssessmentHelper: Clicking next button');
                                nextButton.click();
                                this.autoNextTimeout = setTimeout(() => {
                                    if (!this.isClosed) {
                                        console.log('AssessmentHelper: Auto-triggering next question');
                                        const getAnswerButton = document.querySelector('#getAnswerButton');
                                        if (getAnswerButton) {
                                            getAnswerButton.click();
                                        }
                                    }
                                }, 1000);
                            } else {
                                console.warn('AssessmentHelper: Next button not found');
                            }
                        }, 1000);
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

            const answerContainer = this.itemMetadata?.answerUI?.querySelector('#answerContainer');
            if (answerContainer) {
                console.log('AssessmentHelper: Initializing Draggabilly for answer container.');
                new Draggabilly(answerContainer, {
                    handle: '.answer-drag-handle'
                });
            }
        }

        if (starEffectContainer && launcher) {
            console.log('AssessmentHelper: Creating stars effect.');
            this.createStars(starEffectContainer, launcher);
        } else {
            console.warn('AssessmentHelper: Star effect container or launcher not found.');
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
        console.log('AssessmentHelper: Extracting article content...');
        const questionsContainer = document.querySelector('.questions-container');
        const prompt = document.querySelector('.prompt.visible');
        const stem = document.querySelector('.stem');
        const firstDiv = document.querySelector('.first');
        const touchables = document.querySelector('.touchables');
        let content = '';

        if (firstDiv) {
            console.log('AssessmentHelper: Found first div content');
            content += '\n[FIRST DIV]\n' + firstDiv.outerHTML + '\n';
        }
        if (questionsContainer) {
            console.log('AssessmentHelper: Found questions container');
            content += '\n[QUESTIONS CONTAINER HTML]\n' + questionsContainer.outerHTML + '\n';
        }
        // Always check for and include .prompt.visible and .stem if found
        if (prompt) {
            console.log('AssessmentHelper: Found prompt.visible content');
            content += '\n[PROMPT VISIBLE]\n' + prompt.innerText + '\n';
        }
        if (stem) {
            console.log('AssessmentHelper: Found stem content');
            content += '\n[STEM]\n' + stem.innerText + '\n';
        }
        if (touchables) {
            console.log('AssessmentHelper: Found touchables content');
            content += '\n[TOUCHABLES HTML]\n' + touchables.outerHTML + '\n';
            const clickables = Array.from(touchables.querySelectorAll('.clickable'));
            if (clickables.length > 0) {
                console.log('AssessmentHelper: Found clickable elements:', clickables.length);
                content += '\n[CLICKABLE DATA-IDENTIFIERS]\n';
                clickables.forEach(el => {
                    content += (el.getAttribute('data-identifier') || '') + '\n';
                });
            }
        }

        if (!content) {
            console.error('AssessmentHelper: No question content found');
            return 'Error: Could not find question content.';
        }

        console.log('AssessmentHelper: Successfully extracted article content');
        return content;
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

                const data = await response.json();
               
                return data.response;
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


}

// Initialize the AssessmentHelper
const assessmentHelper = new AssessmentHelper();

// === DEBUG PANEL ===
(function addDebugPanel() {
    if (document.getElementById('nova-debug-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'nova-debug-panel';
    panel.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:100000;background:#222;color:#fff;padding:16px 20px;border-radius:10px;box-shadow:0 2px 12px #0008;font-size:14px;min-width:260px;max-width:340px;opacity:0.95;';
    panel.innerHTML = `
      <div style="font-weight:bold;font-size:16px;margin-bottom:8px;">Nova Debug Panel</div>
      <div id="debug-state"></div>
      <button id="btn-refresh-state" style="margin:6px 0 6px 0;">Refresh State</button>
      <button id="btn-show-ui">Show UI</button>
      <button id="btn-hide-ui">Hide UI</button>
      <button id="btn-test-alert">Test Alert</button>
      <button id="btn-test-stars">Test Stars</button>
      <input id="debug-cmd" placeholder="Type command..." style="margin-top:8px;width:90%;padding:4px;border-radius:4px;border:none;outline:none;"/>
      <button id="btn-run-cmd">Run</button>
      <div id="debug-cmd-output" style="margin-top:8px;white-space:pre-wrap;"></div>
      <button id="btn-toggle-logs" style="margin-top:8px;">Toggle Console Logs</button>
    `;
    document.body.appendChild(panel);
    // State display
    function updateState() {
        const helper = window.assessmentHelperInstance;
        document.getElementById('debug-state').textContent = helper ?
            `isFetchingAnswer: ${helper.isFetchingAnswer}\nisClosed: ${helper.isClosed}\ncachedArticle: ${!!helper.cachedArticle}` :
            'AssessmentHelper not initialized.';
    }
    document.getElementById('btn-refresh-state').onclick = updateState;
    document.getElementById('btn-show-ui').onclick = () => window.assessmentHelperInstance?.showUI(true);
    document.getElementById('btn-hide-ui').onclick = () => {
        const launcher = document.getElementById('Launcher');
        if (launcher) { launcher.style.opacity = '0'; launcher.style.visibility = 'hidden'; }
    };
    document.getElementById('btn-test-alert').onclick = () => window.assessmentHelperInstance?.showAlert('Test alert from debug panel!','info');
    document.getElementById('btn-test-stars').onclick = () => {
        const launcher = document.getElementById('Launcher');
        const starContainer = launcher?.querySelector('.header-bg-effect');
        if (starContainer && window.assessmentHelperInstance) window.assessmentHelperInstance.createStars(starContainer, launcher);
    };
    document.getElementById('btn-run-cmd').onclick = () => {
        const cmd = document.getElementById('debug-cmd').value.trim();
        let output = '';
        try {
            output = eval(cmd);
        } catch (e) {
            output = e.toString();
        }
        document.getElementById('debug-cmd-output').textContent = output;
    };
    let logsVisible = true;
    document.getElementById('btn-toggle-logs').onclick = () => {
        logsVisible = !logsVisible;
        if (!logsVisible) {
            console._log = console.log;
            console.log = function(){};
        } else {
            if (console._log) console.log = console._log;
        }
    };
    updateState();
})();
// Expose instance for debug panel
setTimeout(()=>{window.assessmentHelperInstance = window.assessmentHelperInstance || new AssessmentHelper();}, 1000);
