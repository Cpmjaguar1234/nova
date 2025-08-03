// ==UserScript==
// @name         Edmentum Assessment Helper
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Helper script for Edmentum assessments with UI enhancements.
// @author       Bigjaguar16
// @match        *://*.edmentum.com/*
// @grant        unsafeWindow
// @grant        GM_log
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      *
// @require      https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js
// @require      https://unpkg.com/draggabilly@2.3.0/dist/draggabilly.pkgd.min.js
// ==/UserScript==

const starEffectCSS = `
    .header-bg-effect {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        margin-top: 0; /* Revert margin-top */
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
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = starEffectCSS;
document.head.appendChild(styleSheet);

class AssessmentHelper {
    constructor() {
        // Constructor can be used for initial setup if needed
    }

    /**
     * Generates star elements and appends them to the specified container.
     * @param {HTMLElement} container - The container element to append stars to.
     */
    createStars(container, launcher) {
        const numStars = 30;
        for (let i = 0; i < numStars; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            const starSize = Math.random() * 3 + 1;
            star.style.width = `${starSize}px`;
            star.style.height = `${starSize}px`;
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
            const starWidth = starSize;
            const starHeight = starSize;
            do {
                randomTop = Math.random() * container.clientHeight;
                randomLeft = Math.random() * container.clientWidth;
                attempts++;
                const overlapsLogo = (
                    randomLeft < uiImgRelativeLeft + uiImgRect.width &&
                    randomLeft + starWidth > uiImgRelativeLeft &&
                    randomTop < uiImgRelativeTop + uiImgRect.height &&
                    randomTop + starHeight > uiImgRelativeTop
                );
                const overlapsButton = (
                    randomLeft < getAnswerButtonRelativeLeft + getAnswerButtonRect.width &&
                    randomLeft + starWidth > getAnswerButtonRelativeLeft &&
                    randomTop < getAnswerButtonRelativeTop + getAnswerButtonRect.height &&
                    randomTop + starHeight > getAnswerButtonRelativeTop
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

    /**
     * Handles dropdown type questions by selecting the first valid option.
     */
    async handleQuestion() {
        console.log('%c⚙️ Entering handleQuestion function.', 'color: #800080; font-weight: bold;');
        try {
            // Check for multiple choice questions first
            let mcQuestionHtml = '';
            let mcQuestionText = '';

            const getElement = (selector, doc) => {
                return doc.querySelector(selector);
            };

            const getElementInIframe = (selector) => {
                const iframe = document.querySelector('iframe#content-iframe');
                if (iframe && iframe.contentDocument) {
                    return iframe.contentDocument.querySelector(selector);
                }
                return null;
            };

            let stemElement = getElement('.stem', document);
            let multichoiceElement = getElement('.multichoice', document);

            if (!stemElement || !multichoiceElement) {
                stemElement = getElementInIframe('.stem');
                multichoiceElement = getElementInIframe('.multichoice');
            }

            if (stemElement && multichoiceElement) {
                let mcQuestionText = stemElement.textContent.trim();
                let mcQuestionHtml = multichoiceElement.outerHTML;
                let questionContainer = getElement('.question-container', document);
                if (!questionContainer) {
                    questionContainer = getElementInIframe('.question-container');
                }
                if (questionContainer) {
                    mcQuestionHtml = questionContainer.outerHTML;
                    console.log('%c❓ Extracted Question Container HTML Content:', 'color: #FFA500; font-weight: bold;', mcQuestionHtml);
                } else {
                    console.warn('%c❌ No .question-container found in main document or iframe.', 'color: #dc3545; font-weight: bold;');
                }

                let passageElement = getElement('.passage', document);
                if (!passageElement) {
                    passageElement = getElementInIframe('.passage');
                }

                if (passageElement) {
                    mcQuestionHtml += '\n' + passageElement.outerHTML;
                    console.log('%c❓ Appended Passage HTML Content:', 'color: #FFA500; font-weight: bold;', passageElement.outerHTML);
                } else {
                    console.warn('%c❌ No .passage found in main document or iframe.', 'color: #dc3545; font-weight: bold;');
                }
                console.log('%c❓ Extracted Multiple Choice Question Text:', 'color: #FFA500; font-weight: bold;', mcQuestionText);
                console.log('%c❓ Extracted Multiple Choice HTML Content:', 'color: #FFA500; font-weight: bold;', mcQuestionHtml);
                this.injectIframeScript();
                console.log('%c🧠 Calling askAI with extracted MC question and HTML content.', 'color: #8A2BE2; font-weight: bold;');
                const modifiedQuestion = "IMPORTANT: Provide ONLY the letter of the correct answer (A, B, C, or D). Do NOT include any explanation, text, or additional content. Your response MUST be a single letter.\n\n" + mcQuestionText + "\n\nRemember: ONLY a single letter (A, B, C, or D). Nothing else.";
                const aiAnswer = await this.askAI(modifiedQuestion, mcQuestionHtml);
                console.log('%c🤖 AI answer:', 'color: #8A2BE2; font-weight: bold;', aiAnswer);
                if (aiAnswer.startsWith('Error:')) {
                    console.error('%c❌ AI did not provide a valid answer, or connection failed. Falling back to default handling.', 'color: #dc3545; font-weight: bold;');
                } else {
                    const mcChoices = multichoiceElement.querySelectorAll('.multichoice-choice');
                    let selected = false;
                    // Try letter match first
                    const answerLetterMatch = aiAnswer.match(/^[A-D]/i);
                    if (answerLetterMatch) {
                        const answerLetter = answerLetterMatch[0].toUpperCase();
                        console.log(`%c🎯 AI suggested answer: ${answerLetter}`, 'color: #008000; font-weight: bold;');
                        for (let choice of mcChoices) {
                            const letterSpan = choice.querySelector('.multichoice-answer-letter');
                            if (letterSpan && letterSpan.textContent.trim().startsWith(answerLetter)) {
                                const radioButton = choice.querySelector('input[type="radio"]');
                                if (radioButton) {
                                    radioButton.checked = true;
                                    radioButton.dispatchEvent(new Event('change', { bubbles: true }));
                                    console.log(`%c✅ Selected radio button for answer ${answerLetter}.`, 'color: #28a745; font-weight: bold;');
                                    selected = true;
                                    break;
                                }
                            }
                        }
                    }
                    // If not selected, try text match
                    if (!selected) {
                        for (let choice of mcChoices) {
                            const content = choice.querySelector('.content-inner');
                            if (content && content.textContent.trim() === aiAnswer.trim()) {
                                const radioButton = choice.querySelector('input[type="radio"]');
                                if (radioButton) {
                                    radioButton.checked = true;
                                    radioButton.dispatchEvent(new Event('change', { bubbles: true }));
                                    console.log(`%c✅ Selected radio button by text match: ${aiAnswer}.`, 'color: #28a745; font-weight: bold;');
                                    selected = true;
                                    break;
                                }
                            }
                        }
                    }
                    if (!selected) {
                        console.warn('%c❌ Could not find or select radio button based on AI answer.', 'color: #dc3545; font-weight: bold;');
                    } else {
                        console.log('%c✅ Answer selected successfully, attempting to click Next button...', 'color: #28a745; font-weight: bold;');
                        // After successful answer selection, click the Next button
                        const nextButton = document.querySelector('button.rbi-btn.floatleft.question-next');
                        if (nextButton) {
                            console.log('%c🔍 Found Next button, clicking...', 'color: #4CAF50; font-weight: bold;');
                            nextButton.click();
                            console.log('%c➡️ Next button clicked successfully.', 'color: #00BFFF; font-weight: bold;');
                            // Wait a bit and call handleQuestion again to loop
                            setTimeout(() => {
                                console.log('%c🔄 Continuing to next question...', 'color: #9C27B0; font-weight: bold;');
                                this.handleQuestion();
                            }, 1000);
                        } else {
                            console.warn('%c❌ Next button not found after successful answer. Selector: button.rbi-btn.floatleft.question-next', 'color: #dc3545; font-weight: bold;');
                        }
                    }
                }
                // Remove return; after MC
            }

            let hottextContainer = getElement('.hottext-multichoice', document);
            if (!hottextContainer) {
                hottextContainer = getElementInIframe('.hottext-multichoice');
            }

            if (hottextContainer) {
                const stemElement = getElement('.stem', document) || getElementInIframe('.stem');
                const hottextQuestionText = stemElement ? stemElement.textContent.trim() : '';
                let hottextQuestionHtml = hottextContainer.outerHTML;

                // Get all hottext spans and their text content
                const hottextSpans = hottextContainer.querySelectorAll('.hottext-mc-span');
                const answerChoices = Array.from(hottextSpans).map(span => span.textContent.trim()).join('\n');

                console.log('%c❓ Extracted Hottext Question Text:', 'color: #FFA500; font-weight: bold;', hottextQuestionText);
                console.log('%c❓ Answer Choices:', 'color: #FFA500; font-weight: bold;', answerChoices);
                console.log('%c❓ Extracted Hottext HTML Content:', 'color: #FFA500; font-weight: bold;', hottextQuestionHtml);

                this.injectIframeScript();
                console.log('%c🧠 Calling askAI with extracted Hottext question and answer choices.', 'color: #8A2BE2; font-weight: bold;');
                const modifiedQuestion = hottextQuestionText + '\n\nSelect one from these choices:\n' + answerChoices;
                const aiAnswer = await this.askAI(modifiedQuestion, hottextQuestionHtml);
                console.log('%c🤖 AI answer:', 'color: #8A2BE2; font-weight: bold;', aiAnswer);
                if (aiAnswer.startsWith('Error:')) {
                    console.error('%c❌ AI did not provide a valid answer, or connection failed. Falling back to default handling.', 'color: #dc3545; font-weight: bold;');
                }
                const allHottextSpans = hottextContainer.querySelectorAll('.hottext-mc-span');
                let selected = false;
                if (aiAnswer && !aiAnswer.startsWith('Error:')) {
                    allHottextSpans.forEach(span => {
                        if (span.textContent.trim() === aiAnswer.trim()) {
                            span.click();
                            console.log(`%c✅ Selected hottext span: ${aiAnswer}.`, 'color: #28a745; font-weight: bold;');
                            selected = true;
                        }
                    });
                }
                if (!selected) {
                    console.warn('%c❌ Could not find or select hottext span based on AI answer.', 'color: #dc3545; font-weight: bold;');
                } else {
                    console.log('%c✅ Answer selected successfully, attempting to click Next button...', 'color: #28a745; font-weight: bold;');
                    // After successful answer selection, click the Next button
                    const nextButton = document.querySelector('button.rbi-btn.floatleft.question-next');
                    if (nextButton) {
                        console.log('%c🔍 Found Next button, clicking...', 'color: #4CAF50; font-weight: bold;');
                        nextButton.click();
                        console.log('%c➡️ Next button clicked successfully.', 'color: #00BFFF; font-weight: bold;');
                        // Wait a bit and call handleQuestion again to loop
                        setTimeout(() => {
                            console.log('%c🔄 Continuing to next question...', 'color: #9C27B0; font-weight: bold;');
                            this.handleQuestion();
                        }, 1000);
                    } else {
                        console.warn('%c❌ Next button not found after successful answer. Selector: button.rbi-btn.floatleft.question-next', 'color: #dc3545; font-weight: bold;');
                    }
                }
                // Remove return; after hottext
            }
            const dropdowns = document.querySelectorAll('select.form-control');
            if (dropdowns.length === 0) {
                console.log('%c⚠️ No dropdowns found on the page.', 'color: #ffc107; font-weight: bold;');
                return;
            }
            let htmlContent = '';
            const xpath = '/html/body/div[2]/div[3]/div[3]/div[3]/div[2]';
            const getElementByXpath = (xpath, doc) => {
                const result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                return result.singleNodeValue;
            };
            let targetElement = getElementByXpath(xpath, document);
            if (!targetElement) {
                const iframe = document.querySelector('iframe#content-iframe');
                if (iframe && iframe.contentDocument) {
                    targetElement = getElementByXpath(xpath, iframe.contentDocument);
                }
            }
            if (targetElement) {
                htmlContent = targetElement.outerHTML;
                console.log('%c❓ Extracted HTML content from specified XPath:', 'color: #FFA500; font-weight: bold;', htmlContent);
            } else {
                console.warn('%c❌ No element found at specified XPath in either main document or iframe.', 'color: #dc3545; font-weight: bold;');
            }
            if (htmlContent) {
                // Inject script into iframe to look for elements
                this.injectIframeScript();
                const questionText = this.getQuestionText();
                console.log('%c🧠 Calling askAI with extracted question and HTML content.', 'color: #8A2BE2; font-weight: bold;');
                aiAnswer = await this.askAI(questionText, htmlContent);
                console.log('%c🤖 AI answer:', 'color: #8A2BE2; font-weight: bold;', aiAnswer);
                if (aiAnswer.startsWith('Error:')) {
                    console.error('%c❌ AI did not provide a valid answer, or connection failed. Falling back to default dropdown handling.', 'color: #dc3545; font-weight: bold;');
                    aiAnswer = '';
                }
            }
            this.checkForSubmitTestButton();
            this.checkTestType();
            const selectFirstValid = (dropdown) => {
                for (let i = 0; i < dropdown.options.length; i++) {
                    if (dropdown.options[i].value !== '-1') {
                        dropdown.value = dropdown.options[i].value;
                        dropdown.dispatchEvent(new Event('change'));
                        break;
                    }
                }
            };
            if (aiAnswer) {
                const answers = aiAnswer.split(',').map(s => s.trim());
                let useAI = answers.length > 0;
                if (useAI) {
                    Array.from(dropdowns).forEach((dropdown, index) => {
                        if (index >= answers.length) {
                            selectFirstValid(dropdown);
                            return;
                        }
                        let selected = false;
                        for (let option of dropdown.options) {
                            if (option.text.trim() === answers[index]) {
                                dropdown.value = option.value;
                                dropdown.dispatchEvent(new Event('change'));
                                console.log(`%c✅ Selected dropdown option: ${answers[index]}.`, 'color: #28a745; font-weight: bold;');
                                selected = true;
                                break;
                            }
                        }
                        if (!selected) {
                            console.warn(`%c❌ Could not find matching option for "${answers[index]}" in dropdown ${index}. Falling back.`, 'color: #dc3545; font-weight: bold;');
                            selectFirstValid(dropdown);
                        }
                    });
                } else {
                    dropdowns.forEach(selectFirstValid);
                }
            } else {
                console.log('%c🔄 Falling back to selecting first valid option in dropdown.', 'color: #6c757d; font-weight: bold;');
                dropdowns.forEach(selectFirstValid);
            }
            console.log('%c🚀 Question handled successfully!', 'color: #007bff; font-weight: bold;');
            console.log('%c✅ Answer selected successfully, attempting to click Next button...', 'color: #28a745; font-weight: bold;');
            // After successful handling, click the Next button
            const nextButton = document.querySelector('button.rbi-btn.floatleft.question-next');
            if (nextButton) {
                console.log('%c🔍 Found Next button, clicking...', 'color: #4CAF50; font-weight: bold;');
                nextButton.click();
                console.log('%c➡️ Next button clicked successfully.', 'color: #00BFFF; font-weight: bold;');
                // Wait a bit and call handleQuestion again to loop
                setTimeout(() => {
                    console.log('%c🔄 Continuing to next question...', 'color: #9C27B0; font-weight: bold;');
                    this.handleQuestion();
                }, 1000);
            } else {
                console.warn('%c❌ Next button not found after successful answer. Selector: button.rbi-btn.floatleft.question-next', 'color: #dc3545; font-weight: bold;');
            }
        } catch (error) {
            console.error('%c❌ Error handling question:', 'color: #dc3545; font-weight: bold;', error);
            // Stop the processing logic on error
        }
    }

    /**
     * Checks if the element with id='test-title' contains the word 'pretest' and logs the test type.
     */
    checkTestType() {
        const testTitleElement = document.getElementById('test-title');
        if (testTitleElement) {
            const titleText = testTitleElement.textContent.toLowerCase();
            if (titleText.includes('pretest')) {
                console.log('%c📝 Test Type: Pretest', 'color: #007bff; font-weight: bold;');
            } else {
                console.log('%c📝 Test Type: Regular Test', 'color: #007bff; font-weight: bold;');
            }
        } else {
            console.log('%c❓ Test title element not found.', 'color: #6c757d; font-weight: bold;');
        }
    }

    /**
     * Checks for the presence of the 'Submit Test' button and logs it.
     */
    checkForSubmitTestButton() {
        const submitTestButton = document.querySelector('li#submit-test-btn button[type="button"][title="Submit Test"]');
        if (submitTestButton) {
            console.log('%c✅ Found Submit Test button. This is likely a test.', 'color: #28a745; font-weight: bold;');
        } else {
            console.log('%c❌ Submit Test button not found. This may not be a test.', 'color: #dc3545; font-weight: bold;');
        }
    }

    /**
     * Sends a question to the AI endpoint and returns the response.
     * @param {string} question - The question to send to the AI.
     * @returns {Promise<string>} - A promise that resolves with the AI's answer.
     */
    getQuestionText() {
        const extractClozeSentences = (doc) => {
            const blocks = doc.querySelectorAll('.interaction-cloze-content-block');
            const sentences = [];

            blocks.forEach(block => {
                const parts = [];
                const children = block.querySelectorAll('thspan, .interaction-cloze-selectable-wrapper select');

                children.forEach(child => {
                    if (child.tagName === 'THSPAN') {
                        parts.push(child.textContent.trim());
                    } else if (child.tagName === 'SELECT') {
                        const selected = child.options[child.selectedIndex];
                        if (selected && selected.value !== '-1') {
                            parts.push(selected.textContent.trim());
                        } else {
                            parts.push('[?]'); // placeholder for unselected
                        }
                    }
                });

                if (parts.length > 0) {
                    sentences.push(parts.join(''));
                }
            });

            console.log('[Extracted Cloze Sentences]', sentences);
            return sentences.join(' '); // Join all sentences into a single string
        };

        // Try main document first
        let questionText = extractClozeSentences(document);
        if (questionText) {
            console.log('%c❓ Extracted question text from main document using cloze logic:', 'color: #FFA500; font-weight: bold;', questionText);
            return questionText;
        }

        // Try inside iframe
        const iframe = document.querySelector('iframe#content-iframe');
        if (iframe && iframe.contentDocument) {
            questionText = extractClozeSentences(iframe.contentDocument);
            if (questionText) {
                console.log('%c❓ Extracted question text from iframe using cloze logic:', 'color: #FFA500; font-weight: bold;', questionText);
                return questionText;
            }
        }

        console.warn('No relevant question text found in either main document or iframe using cloze logic.');
        return '';
    }

    /**
     * Injects a script into the content-iframe to look for specific elements.
     */
    injectIframeScript() {
        const iframe = document.querySelector('iframe#content-iframe');
        if (iframe && iframe.contentDocument && iframe.contentWindow) {
            const script = iframe.contentDocument.createElement('script');
            script.textContent = `
                console.log('%c🚀 Script injected into iframe: Looking for elements...', 'color: #FFD700; font-weight: bold;');
                const stemElement = document.querySelector('.stem');
                if (stemElement) {
                    console.log('%c✅ Injected script found .stem element in iframe.', 'color: #32CD32; font-weight: bold;');
                } else {
                    console.log('%c❌ Injected script did NOT find .stem element in iframe.', 'color: #dc3545; font-weight: bold;');
                }
                const clozeContentBlock = document.querySelector('.interaction-cloze-content-block');
                if (clozeContentBlock) {
                    console.log('%c✅ Injected script found .interaction-cloze-content-block in iframe.', 'color: #32CD32; font-weight: bold;');
                } else {
                    console.log('%c❌ Injected script did NOT find .interaction-cloze-content-block in iframe.', 'color: #dc3545; font-weight: bold;');
                }
            `;
            iframe.contentDocument.head.appendChild(script);
            console.log('%c✅ Script successfully injected into iframe.', 'color: #00BFFF; font-weight: bold;');
        } else {
            console.warn('%c❌ Could not inject script: iframe#content-iframe not found or not accessible.', 'color: #dc3545; font-weight: bold;');
        }
    }

    async askAI(question, htmlContent = null) {
        console.log('%c🚀 Entering askAI function.', 'color: #00FFFF; font-weight: bold;');
        console.log('%c🤖 Sending question to AI:', 'color: #17a2b8; font-weight: bold;', question);
        const endpoint = 'https://diverse-observations-vbulletin-occasional.trycloudflare.com/ask';

        const body = { q: question };
        if (htmlContent) {
            body.html = htmlContent;
            console.log('%c📦 Including HTML content in AI request.', 'color: #17a2b8; font-weight: bold;');
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (data && data.response) {
                console.log('%c✅ AI response received:', 'color: #28a745; font-weight: bold;', data.response);
                return data.response;
            } else {
                console.error('%c❌ AI response did not contain a valid answer:', 'color: #dc3545; font-weight: bold;', data);
                return 'Error: Could not get an answer from AI.';
            }
        } catch (error) {
            console.log('%c🚨 Error caught in askAI function.', 'color: #FF0000; font-weight: bold;', error);
            console.error('%c❌ Error asking AI:', 'color: #dc3545; font-weight: bold;', error);
            return 'Error: Failed to connect to AI service.';
        }
    }

    /**
     * Plays the introductory animation using Anime.js.
     * Displays the Nova image animating into view, then removes it
     * and shows the main UI. The background is not faded.
     */
    playIntroAnimation() {
        // Check if Anime.js is available before attempting animation
        if (typeof anime === 'undefined') {
            console.error('%c⚠️ AssessmentHelper: Anime.js is not loaded. Cannot play animation.', 'color: #ffc107; font-weight: bold;');
            this.showUI();
            return;
        }

        const imageUrl = "https://github.com/Cpmjaguar1234/nova/blob/main/nova%20logo%20png.png?raw=true";

        // Create the image element for the intro animation
        const introImgElement = document.createElement('img');
        introImgElement.src = imageUrl;
        introImgElement.id = 'introLoaderImage';
        introImgElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.5);
            width: 100px;
            height: auto;
            border-radius: 12px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            z-index: 100001;
            opacity: 0;
        `;

        // Append image to the body
        document.body.appendChild(introImgElement);



        // Anime.js animation sequence for the intro image
        anime.timeline({
            easing: 'easeInOutQuad',
            duration: 800,
            complete: (anim) => {

                // Remove the intro image element from the DOM after animation finishes
                introImgElement.remove();
                // Show the main UI and set up listeners
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
        // Add a final fade out for the intro image before removing it
        .add({
            targets: introImgElement,
            opacity: 0,
            duration: 500,
            easing: 'linear'
        }, '+=500');
    }

    /**
     * Creates the main UI element (the launcher).
     * Includes the drag handle for Draggabilly.
     * @returns {HTMLDivElement} The container element for the main UI.
     */
    createUI() {
        const container = document.createElement("div");
        const launcher = document.createElement("div");
        launcher.id = "Launcher";
        launcher.className = "Launcher";
        // Initial styles for animation: hidden and transparent
        // Transition added for the fade-in effect
        launcher.style.cssText = "outline: none; min-height: 160px; opacity: 0; visibility: hidden; transition: opacity 0.5s ease; font-family: 'Nunito', sans-serif; width: 180px; height: 240px; background: #1c1e2b; position: fixed; border-radius: 12px; display: flex; flex-direction: column; align-items: center; color: white; font-size: 16px; z-index: 99999; padding: 16px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); overflow: hidden; white-space: nowrap;";

        // Drag handle element - Draggabilly will be configured to use this
        const dragHandle = document.createElement("div");
        dragHandle.className = "drag-handle";
        dragHandle.style.cssText = "width: 100%;height: 24px;cursor: move;background: transparent;position: absolute;top: 0;";

        // Image element inside the launcher (this image is part of the UI, not the intro animation image)
        const uiImg = document.createElement("img");
        uiImg.src = "https://raw.githubusercontent.com/Cpmjaguar1234/nova/refs/heads/main/nova%20logo%20png.png"; // Keep the original UI image
        uiImg.style.cssText = "width: 90px;height: 90px;margin-top: 32px;border-radius: 50%;";

        // Close button for the main UI
        const closeButton = document.createElement("button");
        closeButton.id = "closeButton";
        // Use Unicode multiplication symbol
        closeButton.textContent = "\u00D7"; // Unicode multiplication symbol
        // Added transition for smoother hover effect
        // Set initial color to white and opacity to 0.5 for dimmed appearance
        // Removed temporary blue background
        closeButton.style.cssText = "position: absolute;top: 8px;right: 8px;background: none;border: none;color: white;font-size: 18px;cursor: pointer;padding: 2px 8px;transition: color 0.2s ease, transform 0.1s ease; opacity: 0.5; display: block; visibility: visible;";


        // Button to trigger the answer fetching process
        const getAnswerButton = document.createElement("button");
        getAnswerButton.id = "getAnswerButton";
        // Added transitions for background and transform on hover/active
        getAnswerButton.style.cssText = "background: #2c2e3b;border: none;color: white;padding: 12px 20px;border-radius: 8px;cursor: pointer;margin-top: 24px;width: 120px;height: 44px;font-size: 16px;transition: background 0.2s ease, transform 0.1s ease; display: flex; justify-content: center; align-items: center;"; // Added flex properties for centering content

        // Loading indicator element (initially hidden)
        const loadingIndicator = document.createElement("div");
        loadingIndicator.id = "loadingIndicator";
        loadingIndicator.style.cssText = "border: 4px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top: 4px solid #fff; width: 20px; height: 20px; animation: spin 1s linear infinite; display: none;"; // Basic spinner CSS

        // Button text span
        const buttonTextSpan = document.createElement("span");
        buttonTextSpan.textContent = "Skip Course";
        buttonTextSpan.id = "getAnswerButtonText";

        getAnswerButton.appendChild(loadingIndicator);
        getAnswerButton.appendChild(buttonTextSpan);

        // Add event listener to the getAnswerButton
        getAnswerButton.addEventListener('click', () => {
            console.log('%c▶️ Skip Course button clicked. Initiating auto-click/AI process...', 'color: #ff8c00; font-weight: bold;');
            let nextButtonNotFoundCount = 0;
            const maxNotFoundAttempts = 5; // Number of times to check for next button before assuming it's a question page

            let autoClickInterval = setInterval(() => {
                const nextButton = document.querySelector('button.tutorial-nav-next');

                if (nextButton) {
                    nextButtonNotFoundCount = 0; // Reset counter if button is found
                    console.log('%c✅ Next button element found.', 'color: #28a745; font-weight: bold;', nextButton);
                    console.log('%cℹ️ Next button classList:', 'color: #17a2b8; font-weight: bold;', nextButton.classList);

                    if (nextButton.classList.contains('disabled')) {
                        console.log('%c🛑 Auto-clicking stopped. Next button is disabled. Calling handleQuestion.', 'color: #FFD700; font-weight: bold;');
                        clearInterval(autoClickInterval);
                        autoClickInterval = null;
                        this.handleQuestion();
                    } else {
                        console.log('%c➡️ Clicking next button.', 'color: #00BFFF; font-weight: bold;');
                        nextButton.click();
                        console.log('%c✅ Next button clicked.', 'color: #32CD32; font-weight: bold;');
                    }
                } else {
                    nextButtonNotFoundCount++;
                    console.log(`%c🔍 Next button not found yet. Attempt ${nextButtonNotFoundCount}/${maxNotFoundAttempts}.`, 'color: #6c757d; font-weight: bold;');

                    if (nextButtonNotFoundCount >= maxNotFoundAttempts) {
                        console.log('%c⚠️ Max attempts reached. Next button not found. Assuming question page and calling handleQuestion.', 'color: #ffc107; font-weight: bold;');
                        clearInterval(autoClickInterval);
                        autoClickInterval = null;
                        this.handleQuestion();
                    }
                }
            }, 500); // Increased interval to 500ms to reduce rapid checks
        });

        // Version display
        const version = document.createElement("div");
        version.style.cssText = "position: absolute;bottom: 8px;right: 8px;font-size: 12px;opacity: 0.5;";
        version.textContent = "2.0"; // Updated version number

        // Discord icon link
        const discordLink = document.createElement("a");
        discordLink.href = "https://discord.gg/Gt2eZXSSS5"; // Provided Discord invite link
        discordLink.target = "_blank"; // Open in new tab
        discordLink.style.cssText = "position: absolute; bottom: 8px; left: 8px; opacity: 0.5; transition: opacity 0.2s ease; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;";
        const fontAwesomeLink = document.createElement('link');
        fontAwesomeLink.rel = 'stylesheet';
        fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css';
        document.head.appendChild(fontAwesomeLink);
        discordLink.innerHTML = '';
        const icon = document.createElement('i');
        icon.className = 'fab fa-discord';
        icon.style.fontSize = '16px';
        icon.style.color = 'white';
        discordLink.appendChild(icon);
        discordLink.onmouseover = () => discordLink.style.opacity = '1';
        discordLink.onmouseout = () => discordLink.style.opacity = '0.5';

        // Append elements to the launcher
        launcher.appendChild(dragHandle);
        launcher.appendChild(uiImg);
        launcher.appendChild(closeButton);
        launcher.appendChild(getAnswerButton);
        launcher.appendChild(version);
        launcher.appendChild(discordLink);

        // Add the star effect container
        const starEffectContainer = document.createElement("div");
        starEffectContainer.className = "header-bg-effect";
        launcher.appendChild(starEffectContainer);

        // Append launcher to the container
        container.appendChild(launcher);

        // Call createStars after the launcher is appended and has dimensions
        // This ensures stars are positioned correctly within the visible launcher area

        if (starEffectContainer) {
            this.createStars(starEffectContainer, launcher);
        }

        // Enable Draggabilly drag support
        new Draggabilly(launcher, {
            handle: '.drag-handle'
        });

        return container;
    }

    /**
     * Shows the main UI by creating it, appending to body, and making it visible.
     * Also recreates the star effects.
     */
    showUI() {
        // Prevent multiple UIs if the script runs more than once
        if (document.getElementById("Launcher")) return;

        const container = this.createUI();
        document.body.appendChild(container);

        const launcher = container.querySelector('#Launcher');
        // Get saved position from localStorage, or use default position
        const savedPosition = JSON.parse(localStorage.getItem('launcherPosition') || '{}');
        launcher.style.position = 'fixed'; // Use fixed positioning to stay in viewport
        launcher.style.top = savedPosition.top ? `${parseInt(savedPosition.top) - (window.pageYOffset || document.documentElement.scrollTop)}px` : '50%';
        launcher.style.left = savedPosition.left || '20px';
        launcher.style.opacity = '1';
        launcher.style.visibility = 'visible';

        // Save position when dragged
        const draggie = new Draggabilly(launcher, {
            handle: '.drag-handle'
        });
        draggie.on('dragEnd', () => {
            const rect = launcher.getBoundingClientRect();
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
            localStorage.setItem('launcherPosition', JSON.stringify({
                top: `${rect.top + scrollY}px`,
                left: `${rect.left}px`
            }));
        });

        // Recreate stars when UI is shown
        const starEffectContainer = launcher.querySelector('.header-bg-effect');
        if (starEffectContainer) {
            starEffectContainer.innerHTML = '';
            this.createStars(starEffectContainer, launcher);
        }
    }
}
if (window.top === window.self) { // Ensure script runs only in the top-most frame
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                const helper = new AssessmentHelper();
                helper.playIntroAnimation();
            }, 4000); // 4-second delay
        });
    } else {
        setTimeout(() => {
            const helper = new AssessmentHelper();
            helper.playIntroAnimation();
        }, 4000); // 4-second delay
    }
}

