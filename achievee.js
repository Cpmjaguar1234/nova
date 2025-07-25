/**
 * AssessmentHelper Class
 * Manages a floating UI element for interacting with assessment pages.
 * Includes Draggabilly for main UI dragging and an intro animation using Anime.js.
 * The intro animation features an image animating into view.
 * Both Anime.js and Draggabilly are loaded dynamically via JavaScript.
 * Enhanced visual cues for buttons, loading states, and answer display.
 */
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
        opacity: 0.5; // Dimmed the stars
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
        // Manual drag properties for the answer UI (Draggabilly is used for the main UI)
        this.answerIsDragging = false;
        this.answerCurrentX = 0;
        this.answerCurrentY = 0;
        this.answerInitialX = 0;
        this.answerInitialY = 0;

        // Cached article content to avoid re-fetching for subsequent questions
        this.cachedArticle = null;
        this.isFetchingAnswer = false; // State to track if an answer fetch is in progress

        // URLs for the external libraries
        this.animeScriptUrl = 'https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js'; // Anime.js core library
        this.draggabillyScriptUrl = 'https://unpkg.com/draggabilly@3/dist/draggabilly.pkgd.min.js'; // Draggabilly library

        // Ensure the script runs after the DOM is fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * Initializes the helper. Creates UI elements but does not append them yet.
     * Dynamically loads necessary scripts (Anime.js, Draggabilly) sequentially.
     * Starts the intro animation after scripts are loaded.
     */
    async init() {

        try {
            // Dynamically load Anime.js first

            await this.loadScript(this.animeScriptUrl);


            // Then dynamically load Draggabilly

            await this.loadScript(this.draggabillyScriptUrl);


            // Create UI elements after scripts are loaded and available
            this.itemMetadata = {
                UI: this.createUI(), // Main draggable UI
                answerUI: this.createAnswerUI() // Smaller answer display UI
            };

            // Start the intro animation, which will handle appending and showing the UI
            this.playIntroAnimation();

        } catch (error) {

            // Handle the error - notify the user and potentially proceed without full functionality
            // Using a custom alert/modal instead of native alert()
            this.showAlert('Failed to load required scripts for the Assessment Helper. Some features may not work.', 'error');
            // Fallback: Create and show UI without animation/dragging if scripts fail
            this.itemMetadata = {
                UI: this.createUI(),
                answerUI: this.createAnswerUI()
            };
            this.showUI(true); // Pass true to indicate fallback mode (skip animation)
        }
    }

    /**
     * Dynamically loads a JavaScript script by creating a script tag.
     * Returns a Promise that resolves when the script is loaded.
     * @param {string} url - The URL of the script to load.
     * @returns {Promise<void>} A Promise that resolves when the script is loaded or rejects on error.
     */
    loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => {
    
                resolve();
            };
            script.onerror = (error) => {
    
                // Clean up the script tag on error
                script.remove();
                reject(new Error(`Failed to load script: ${url}`));
            };
            // Append the script to the document head
            document.head.appendChild(script);
        });
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
        launcher.style.cssText = "outline: none;min-height: 160px;opacity: 0;visibility: hidden;transition: opacity 0.5s ease;font-family: 'Nunito', sans-serif;width: 180px;height: 240px;background: #1c1e2b;position: fixed;border-radius: 12px;display: flex;flex-direction: column;align-items: center;color: white;font-size: 16px;top: 50%;right: 20px;transform: translateY(-50%);z-index: 99999;padding: 16px;box-shadow: 0 4px 8px rgba(0,0,0,0.2);overflow: hidden;white-space: nowrap;";

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
        buttonTextSpan.textContent = "Skip Article";
        buttonTextSpan.id = "getAnswerButtonText";

        getAnswerButton.appendChild(loadingIndicator);
        getAnswerButton.appendChild(buttonTextSpan);


        // Version display
        const version = document.createElement("div");
        version.style.cssText = "position: absolute;bottom: 8px;right: 8px;font-size: 12px;opacity: 0.5;";
        version.textContent = "1.2"; // Updated version number

        // Discord icon link
        const discordLink = document.createElement("a");
        discordLink.href = "https://discord.gg/Gt2eZXSSS5"; // Provided Discord invite link
        discordLink.target = "_blank"; // Open in new tab
        discordLink.style.cssText = "position: absolute; bottom: 8px; left: 8px; opacity: 0.5; transition: opacity 0.2s ease; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;";
        discordLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-discord" viewBox="0 0 16 16"> 
   <path fill="white" d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/> 
 </svg>`;
        discordLink.onmouseover = () => discordLink.style.opacity = '1';
        discordLink.onmouseout = () => discordLink.style.opacity = '0.5';

        // Append elements to the launcher
        launcher.appendChild(dragHandle);
        launcher.appendChild(uiImg); // Append the UI image
        launcher.appendChild(closeButton);
        launcher.appendChild(getAnswerButton);
        launcher.appendChild(version);
        launcher.appendChild(discordLink); // Append the Discord link

        // Add the star effect container
        const starEffectContainer = document.createElement("div");
        starEffectContainer.className = "header-bg-effect";
        launcher.appendChild(starEffectContainer);

        // Append launcher to the container
        container.appendChild(launcher);



        return container;
    }

    /**
     * Generates star elements and appends them to the specified container.
     * @param {HTMLElement} container - The container element to append stars to.
     */
    createStars(container, launcher) {
        const numStars = 30; // Number of stars to generate (reduced)
        for (let i = 0; i < numStars; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.width = `${Math.random() * 3 + 1}px`; // Random size between 1px and 4px
            star.style.height = star.style.width;
            star.style.left = `${Math.random() * 100}%`;
            const uiImg = launcher.querySelector('img');
            const getAnswerButton = launcher.querySelector('#getAnswerButton');

            const launcherRect = launcher.getBoundingClientRect();

            const uiImgRect = uiImg.getBoundingClientRect();
            const getAnswerButtonRect = getAnswerButton.getBoundingClientRect();

            // Convert UI element coordinates to be relative to the launcher's top-left corner
            const uiImgRelativeTop = uiImgRect.top - launcherRect.top;
            const uiImgRelativeLeft = uiImgRect.left - launcherRect.left;

            const getAnswerButtonRelativeTop = getAnswerButtonRect.top - launcherRect.top;
            const getAnswerButtonRelativeLeft = getAnswerButtonRect.left - launcherRect.left;



            let randomTop, randomLeft;
            let attempts = 0;
            const maxAttempts = 100; // Prevent infinite loops

            do {
                randomTop = Math.random() * container.clientHeight;
                randomLeft = Math.random() * container.clientWidth;
                attempts++;
    

                // Check for overlap with Nova logo
                const overlapsLogo = (
                    randomLeft < uiImgRelativeLeft + uiImgRect.width &&
                    randomLeft + star.offsetWidth > uiImgRelativeLeft &&
                    randomTop < uiImgRelativeTop + uiImgRect.height &&
                    randomTop + star.offsetHeight > uiImgRelativeTop
                );

                // Check for overlap with Skip Article button
                const overlapsButton = (
                    randomLeft < getAnswerButtonRelativeLeft + getAnswerButtonRect.width &&
                    randomLeft + star.offsetWidth > getAnswerButtonRelativeLeft &&
                    randomTop < getAnswerButtonRelativeTop + getAnswerButtonRect.height &&
                    randomTop + star.offsetHeight > getAnswerButtonRelativeTop
                );

                if (!overlapsLogo && !overlapsButton) {
                    break; // Found a safe spot
                }
            } while (attempts < maxAttempts);

            star.style.top = `${randomTop}px`;
            star.style.left = `${randomLeft}px`;
            star.style.animationDelay = `${Math.random() * 5}s`; // Random delay for twinkle effect
            star.style.animationDuration = `${Math.random() * 3 + 2}s`; // Random duration for twinkle effect
            container.appendChild(star);
        }


        return container;
    }

    /**
     * Creates the smaller UI element to display the answer.
     * Uses manual dragging.
     * @returns {HTMLDivElement} The container element for the answer UI.
     */
    createAnswerUI() {
        const container = document.createElement("div");
        const answerContainer = document.createElement("div");
        answerContainer.id = "answerContainer";
        answerContainer.className = "answerLauncher";
        // Initial styles for the answer UI (starts hidden)
        // Added transition for smoother appearance
        answerContainer.style.cssText = "outline: none;min-height: 60px;transform: translateX(0px) translateY(-50%);opacity: 0;visibility: hidden;transition: opacity 0.3s ease, transform 0.3s ease;font-family: 'Nunito', sans-serif;width: 60px;height: 60px;background: #1c1e2b;position: fixed;border-radius: 8px;display: flex;justify-content: center;align-items: center;color: white;font-size: 24px;top: 50%;right: 220px;z-index: 99998;padding: 8px;box-shadow: 0 4px 8px rgba(0,0,0,0.2);overflow: hidden;white-space: normal;";

        // Drag handle for the answer UI (for manual dragging)
        const dragHandle = document.createElement("div");
        dragHandle.className = "answer-drag-handle";
        dragHandle.style.cssText = "width: 100%;height: 24px;cursor: move;background: transparent;position: absolute;top: 0;";

        // Close button for the answer UI
        const closeButton = document.createElement("button");
        closeButton.id = "closeAnswerButton";
        // Added transition for smoother hover effect
        closeButton.style.cssText = "position: absolute;top: 8px;right: 8px;background: none;border: none;color: white;font-size: 18px;cursor: pointer;padding: 2px 8px;transition: color 0.2s ease, transform 0.1s ease;";


        // Element to display the fetched answer
        const answerContent = document.createElement("div");
        answerContent.id = "answerContent";
        answerContent.style.cssText = "padding: 0;margin: 0;word-wrap: break-word;font-size: 24px;font-weight: bold;display: flex;justify-content: center;align-items: center;width: 100%;height: 100%;";

        // Append elements to the answer container
        answerContainer.appendChild(dragHandle);
        answerContainer.appendChild(closeButton);
        answerContainer.appendChild(answerContent);

        // Append answer container to the main container
        container.appendChild(answerContainer);

        return container;
    }

    /**
     * Plays the introductory animation using Anime.js.
     * Displays the Nova image animating into view, then removes it
     * and shows the main UI. The background is not faded.
     */
    playIntroAnimation() {
        // Check if Anime.js is available before attempting animation
        if (typeof anime === 'undefined') {
            console.error("AssessmentHelper: Anime.js is not loaded. Cannot play animation.");
            this.showUI(); // Fallback to showing UI directly
            return;
        }

        const imageUrl = "https://github.com/Cpmjaguar1234/nova/blob/main/nova%20logo%20png.png?raw=true"; // Image URL

        // Create the image element for the intro animation
        const introImgElement = document.createElement('img');
        introImgElement.src = imageUrl;
        introImgElement.id = 'introLoaderImage'; // Give it an ID for targeting with Anime.js
        introImgElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.5); /* Start slightly smaller and centered */
            width: 100px; /* Base size */
            height: auto; /* Maintain aspect ratio */
            border-radius: 12px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            z-index: 100001;
            opacity: 0; /* Start hidden */
        `;

        // Append image to the body
        document.body.appendChild(introImgElement);



        // Anime.js animation sequence for the intro image
        anime.timeline({
            easing: 'easeInOutQuad', // Smooth easing
            duration: 800, // Duration for animation segments
            complete: (anim) => {

                // Remove the intro image element from the DOM after animation finishes
                introImgElement.remove();
                // Show the main UI and set up listeners
                this.showUI();
            }
        })
        .add({
            targets: introImgElement,
            opacity: [0, 1], // Fade in
            scale: [0.5, 1], // Scale up
            rotate: '1turn', // Rotate once
            duration: 1000, // Longer duration for the initial entrance
            easing: 'easeOutExpo'
        })
        .add({
            targets: introImgElement,
            translateY: '-=20', // Move up slightly
            duration: 500,
            easing: 'easeInOutSine'
        })
        .add({
            targets: introImgElement,
            translateY: '+=20', // Move back down
            duration: 500,
            easing: 'easeInOutSine'
        })
        // Add a final fade out for the intro image before removing it
        .add({
            targets: introImgElement,
            opacity: 0,
            duration: 500,
            easing: 'linear'
        }, '+=500'); // Add a small delay before fading out
    }

    /**
     * Appends the UI elements to the DOM and makes the main UI visible with a fade-in.
     * Then sets up event listeners.
     * @param {boolean} [skipAnimation=false] - If true, skips the fade-in animation for fallback.
     */
    showUI(skipAnimation = false) {

        // Append UI elements to the body
        document.body.appendChild(this.itemMetadata.UI);
        document.body.appendChild(this.itemMetadata.answerUI);

        // Get the launcher element after it's added to the DOM
        const launcher = document.getElementById('Launcher');
        if (launcher) {
            if (skipAnimation) {

                launcher.style.visibility = 'visible';
                launcher.style.opacity = 1;
                // Set up listeners immediately in fallback mode
                this.setupEventListeners();
                // Generate stars after the UI is visible
                const starEffectContainer = launcher.querySelector('.header-bg-effect');
                if (starEffectContainer) {
                        this.createStars(starEffectContainer, launcher);
                }
                // Check localStorage before displaying Discord popup in fallback mode
                if (localStorage.getItem('discordPopupDismissed') !== 'true') {
                    this.displayDiscordPopup();
                } else {

                }
            } else {
                // Make the launcher visible and trigger the fade-in transition
                launcher.style.visibility = 'visible';
                // Use a small timeout to ensure the visibility change is processed before
                // the opacity transition starts, guaranteeing the transition runs.
                setTimeout(() => {
                    launcher.style.opacity = 1;
                }, 10); // A small delay (e.g., 10ms) is usually sufficient

                // Set up event listeners after the UI is visible and potentially faded in.
                // Use a timeout slightly longer than the UI fade-in transition duration
                // to ensure elements are fully ready.
                setTimeout(() => {
                    this.setupEventListeners();
                    // Check localStorage before displaying Discord popup
                    if (localStorage.getItem('discordPopupDismissed') !== 'true') {
                        this.displayDiscordPopup();
                    } else {
    
                    }
                    // Find the star effect container within the launcher
                    const starEffectContainer = launcher.querySelector('.header-bg-effect');
                    if (starEffectContainer) {

                        this.createStars(starEffectContainer, launcher);
                    } else {

                    }
                }, 500); // Matches the launcher's opacity transition duration
            }
        } else {
            // Fallback if the launcher element was not found after creation/appending

            this.setupEventListeners();
            // Check localStorage before displaying Discord popup even if main UI is not found
            if (localStorage.getItem('discordPopupDismissed') !== 'true') {
                this.displayDiscordPopup();
            } else {
    
            }
        }
    }

    /**
     * Helper function to display custom alerts/messages instead of native alert().
     * @param {string} message - The message to display.
     * @param {string} type - 'success', 'info', 'warning', or 'error'.
     */
    showAlert(message, type = 'info') {
        const alertContainer = document.createElement('div');
        alertContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: ${type === 'error' ? '#dc3545' : '#007bff'};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 100000;
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
            font-family: 'Nunito', sans-serif;
            font-size: 16px;
            max-width: 80%;
            text-align: center;
        `;
        alertContainer.textContent = message;
        document.body.appendChild(alertContainer);

        // Fade in
        setTimeout(() => alertContainer.style.opacity = 1, 10);

        // Fade out after 5 seconds
        setTimeout(() => {
            alertContainer.style.opacity = 0;
            alertContainer.addEventListener('transitionend', () => alertContainer.remove());
        }, 5000);
    }

    /**
     * Retrieves the user's name from the DOM.
     * @returns {string} The user's name or 'Friend' if not found.
     */
    getUserNameFromDOM() {
        const element = document.evaluate('//*[@id="profile-menu"]/div', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        const elementText = element ? element.innerText.trim() : "";
        // Extract only the name, assuming format "Name (something)" or just "Name"
        const nameMatch = elementText.match(/^([^(]+)/);
        return nameMatch ? nameMatch[1].trim() : "Friend";
    }

    /**
     * Displays a friendly Discord invitation popup.
     * It fades out after 10 seconds (temporarily) or when the close button is clicked,
     * with permanent dismissal only if the 'Don't show again' checkbox is checked.
     */
    displayDiscordPopup() {
        const discordLink = "https://discord.gg/DWb9pQ79";

        const popup = document.createElement('div');
        popup.id = 'discordPopup';
        popup.style.cssText = `
            position: fixed;
            top: 20px; /* Position to top */
            right: 20px; /* Position to right */
            background: linear-gradient(135deg, #1c1e2b 0%, #2c2e3b 100%); /* Matching dark gradient */
            color: white;
            padding: 20px;
            border-radius: 12px; /* Matching launcher border-radius */
            box-shadow: 0 4px 15px rgba(0,0,0,0.2); /* Consistent shadow */
            z-index: 100002; /* Higher than other UI elements */
            opacity: 0;
            transform: translateX(20px); /* Start slightly off-screen to the right */
            transition: opacity 0.5s ease-out, transform 0.5s ease-out;
            font-family: 'Nunito', sans-serif;
            font-size: 16px;
            max-width: 300px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
        `;

        const closeButton = document.createElement('button');
        closeButton.textContent = '×'; // Multiplication sign for close
        closeButton.style.cssText = `
            position: absolute;
            top: 8px; /* Matching close button position */
            right: 8px; /* Matching close button position */
            background: none;
            border: none;
            color: white;
            font-size: 18px; /* Matching close button size */
            cursor: pointer;
            opacity: 0.5; /* Matching initial dimmed state */
            transition: color 0.2s ease, transform 0.1s ease, opacity 0.2s ease; /* Ensure all transitions are smooth */
        `;
        // Add hover/active effects for close button to match existing UI
        closeButton.onmouseover = () => { closeButton.style.color = '#ff6b6b'; closeButton.style.opacity = 1; };
        closeButton.onmouseout = () => { closeButton.style.color = 'white'; closeButton.style.opacity = 0.5; };
        closeButton.onmousedown = () => closeButton.style.transform = 'scale(0.95)';
        closeButton.onmouseup = () => closeButton.style.transform = 'scale(1)';


        const icon = document.createElement('i');
        icon.className = 'fab fa-discord'; // Font Awesome Discord icon
        icon.style.cssText = 'font-size: 40px; margin-bottom: 10px; color: #5865f2;'; // Added Discord blue color to icon

        const message = document.createElement('p');
        message.innerHTML = `Would you like to join the Nova Discord?`;
        message.style.cssText = 'margin-bottom: 15px; line-height: 1.4;';

        const discordBtn = document.createElement('a');
        discordBtn.href = discordLink;
        discordBtn.target = '_blank'; // Open in new tab
        discordBtn.textContent = 'Join Discord';
        discordBtn.style.cssText = `
            background-color: #5865f2; /* Discord blue */
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
            transition: background-color 0.2s ease, transform 0.1s ease;
            display: inline-block;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2); /* Subtle shadow for button */
        `;
        // Add hover/active effects for Discord button to match existing UI
        discordBtn.onmouseover = () => discordBtn.style.backgroundColor = '#4e5d94';
        discordBtn.onmouseout = () => discordBtn.style.backgroundColor = '#5865f2';
        discordBtn.onmousedown = () => discordBtn.style.transform = 'scale(0.98)';
        discordBtn.onmouseup = () => discordBtn.style.transform = 'scale(1)';

        // New: "Don't show this again" checkbox
        const dismissOptionDiv = document.createElement('div');
        dismissOptionDiv.style.cssText = `
            margin-top: 15px;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.8;
            font-weight: 500; /* Slightly bolder for readability */
        `;

        const dismissCheckbox = document.createElement('input');
        dismissCheckbox.type = 'checkbox';
        dismissCheckbox.id = 'dismissDiscordPopupCheckbox';
        dismissCheckbox.style.cssText = `
            margin-right: 5px;
            cursor: pointer;
            /* Basic styling for checkbox to match theme if desired */
            appearance: none;
            width: 14px;
            height: 14px;
            border: 1px solid white;
            border-radius: 3px;
            background-color: transparent;
            position: relative;
            vertical-align: middle;
        `;
        // Custom checkmark for checkbox
        dismissCheckbox.onchange = function() {
            if (this.checked) {
                this.style.backgroundColor = '#5865f2'; /* Discord blue when checked */
                this.style.borderColor = '#5865f2';
                this.style.boxShadow = '0 0 5px rgba(88, 101, 242, 0.5)'; /* Glow effect */
            } else {
                this.style.backgroundColor = 'transparent';
                this.style.borderColor = 'white';
                this.style.boxShadow = 'none';
            }
        };

        const dismissLabel = document.createElement('label');
        dismissLabel.htmlFor = 'dismissDiscordPopupCheckbox';
        dismissLabel.textContent = "Don't show this again";
        dismissLabel.style.cssText = `
            cursor: pointer;
        `;

        dismissOptionDiv.appendChild(dismissCheckbox);
        dismissOptionDiv.appendChild(dismissLabel);

        popup.appendChild(closeButton);
        popup.appendChild(icon);
        popup.appendChild(message);
        popup.appendChild(discordBtn);
        popup.appendChild(dismissOptionDiv); // Append the dismiss option div
        document.body.appendChild(popup);

        // Function to handle dismissal animation and removal
        // isPermanent: boolean - true if dismissal should be saved to localStorage
        const dismissPopupAnimation = (isPermanent = false) => {
            if (isPermanent) {
                localStorage.setItem('discordPopupDismissed', 'true');
            } else {
            }
            popup.style.opacity = 0;
            popup.style.transform = 'translateX(20px)'; // Slide out to right
            popup.addEventListener('transitionend', () => popup.remove(), { once: true });
        };

        // Show the popup
        setTimeout(() => {
            popup.style.opacity = 1;
            popup.style.transform = 'translateX(0)'; // Slide into view from right
        }, 100); // Small delay to ensure transition applies

        // Auto-fade out after 10 seconds (temporary dismissal)
        const autoDismissTimeout = setTimeout(() => {
            // Only perform temporary dismissal if not already permanently dismissed by explicit action
            if (document.getElementById('discordPopup')) { // Check if popup still exists before trying to dismiss
                 dismissPopupAnimation(false); // Not permanent dismissal
            }
        }, 10000); // 10 seconds

        // Close button functionality
        closeButton.addEventListener('click', () => {
            clearTimeout(autoDismissTimeout); // Stop auto-dismissal
            // Check if the checkbox is checked for permanent dismissal
            if (dismissCheckbox.checked) {
                dismissPopupAnimation(true); // Permanent dismissal
            } else {
                dismissPopupAnimation(false); // Temporary dismissal
            }
        });
    }

    /**
     * Logs data to a specified endpoint.
     * Fetches user name and class information from the page.
     */
    async logToDataEndpoint(novaButtonClickCount) {
        try {
            // Attempt to find the user name element using XPath
            const element = document.evaluate('//*[@id="profile-menu"]/div', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            const elementText = element ? element.innerText.trim() : "Element not found"; // Trim whitespace

            // Attempt to find the class name element using a CSS selector
            const spanElement = document.querySelector('.activeClassNameNew');
            const spanText = spanElement ? spanElement.innerText.trim() : "Span element not found"; // Trim whitespace

            // Get current timestamp
            const timestamp = new Date();
            const isoTimestamp = timestamp.toISOString();
            const normalTime = timestamp.toLocaleString();

            // Get OS and Browser info
            const os = this.getOS();
            const browser = this.getBrowser();

            let isMobile = false;
            let mobileType = 'Desktop';

            // Simple user agent check for mobile detection
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            if (/android|ipad|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
                isMobile = true;
                if (/android/i.test(userAgent)) {
                    mobileType = 'Android';
                } else if (/ipad|iphone|ipod/i.test(userAgent)) {
                    mobileType = 'iOS';
                } else {
                    mobileType = 'Mobile';
                }
            }

            const logMessage = `Name: ${elementText} | Class: ${spanText} | OS: ${os} | Browser: ${browser} | Mobile: ${isMobile} | MobileType: ${mobileType} | Time: ${normalTime} | ISO Time: ${isoTimestamp} | Nova Clicks: ${novaButtonClickCount}`;
    

            const payload = {
                text: logMessage,
                timestamp: isoTimestamp,
                os: os,
                browser: browser,
                isMobile: isMobile,
                mobileType: mobileType,
                novaClicks: novaButtonClickCount
            };

    

            const response = await fetch('https://diverse-observations-vbulletin-occasional.trycloudflare.com/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });



            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            } else {

            }
        } catch (error) {

        }
    }

    /**
     * Detects the operating system.
     * @returns {string} The detected OS.
     */
    getOS() {
        const userAgent = window.navigator.userAgent;
        let os = 'Unknown OS';
        if (userAgent.indexOf('Win') !== -1) os = 'Windows';
        else if (userAgent.indexOf('Mac') !== -1) os = 'macOS';
        else if (userAgent.indexOf('Linux') !== -1) os = 'Linux';
        else if (userAgent.indexOf('Android') !== -1) os = 'Android';
        else if (userAgent.indexOf('like Mac') !== -1) os = 'iOS'; // For iOS devices
        return os;
    }

    /**
     * Detects the browser.
     * @returns {string} The detected browser.
     */
    getBrowser() {
        const userAgent = window.navigator.userAgent;
        let browser = 'Unknown Browser';
        if (userAgent.indexOf('Chrome') !== -1 && !userAgent.indexOf('Edge') !== -1) browser = 'Google Chrome';
        else if (userAgent.indexOf('Firefox') !== -1) browser = 'Mozilla Firefox';
        else if (userAgent.indexOf('Safari') !== -1 && !userAgent.indexOf('Chrome') !== -1) browser = 'Apple Safari';
        else if (userAgent.indexOf('Edge') !== -1) browser = 'Microsoft Edge';
        else if (userAgent.indexOf('Opera') !== -1 || userAgent.indexOf('OPR') !== -1) browser = 'Opera';
        else if (userAgent.indexOf('Trident') !== -1 || userAgent.indexOf('MSIE') !== -1) browser = 'Internet Explorer';
        return browser;
    }

    /**
     * Fetches an answer from the backend API based on the provided query content.
     * @param {string} queryContent - The content (article + question) to send to the API.
     * @returns {Promise<string>} A promise that resolves with the answer text or an error message.
     */
    async fetchAnswer(queryContent, retryCount = 0) {
        const MAX_RETRIES = 3; // Define maximum retry attempts
        const RETRY_DELAY_MS = 1000; // Define delay between retries in milliseconds

        try {


            const response = await fetch('https://diverse-observations-vbulletin-occasional.trycloudflare.com/ask', {
                method: 'POST',
                cache: 'no-cache', // Ensure fresh response
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    q: queryContent,
                    article: this.cachedArticle || null // Include cached article if available
                })
            });



            if (!response.ok) {
                const errorBody = await response.text();


                // Check for specific 500 error with quota exceeded message
                if (response.status === 500 && errorBody.includes("429 You exceeded your current quota")) {
                    if (retryCount < MAX_RETRIES) {
    
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                        return this.fetchAnswer(queryContent, retryCount + 1); // Retry the call
                    } else {
    
                        throw new Error(`API request failed after multiple retries due to quota: ${errorBody}`);
                    }
                } else {
                    // Handle other HTTP errors without retrying
                    throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
                }
            }

            const data = await response.json();

            // Return the response text or a default message
            return data.response ? String(data.response).trim() : 'No answer available'; // Ensure answer is string and trimmed
        } catch (error) {

            return `Error: ${error.message}`; // Return error message to the UI
        }
    }

    /**
     * Fetches the article content and question content from the current page DOM.
     * Caches the article content.
     * @returns {Promise<string>} A promise that resolves with the combined article and question content.
     */
    async fetchArticleContent() {
        // Select the container with the ID 'start-reading' for article content
        const articleContainer = document.querySelector('#start-reading');
        let articleContent = '';
        if (articleContainer) {
            // Select all <p> elements within the container
            const paragraphs = articleContainer.querySelectorAll('p');
            // Extract and join the text content of each <p> element
            articleContent = Array.from(paragraphs).map(p => p.textContent.trim()).join(' ');

        } else {

        }

        // Select the container with the ID 'activity-component-react' for question content
        const questionContainer = document.querySelector('#activity-component-react');
        let questionContent = '';
        if (questionContainer) {
            // Extract the text content of the container
            questionContent = questionContainer.textContent.trim();

        } else {

        }

        // Combine article and question content
        const combinedContent = `${articleContent}\n\n${questionContent}`;
        // Cache the article content for potential future use (e.g., follow-up questions)
        this.cachedArticle = combinedContent; // Cache combined content, as it's used for the query
        return combinedContent;
    }

    /**
     * Sets up all event listeners for the UI elements, including Draggabilly
     * for the main UI and manual drag for the answer UI.
     * Also adds visual feedback for button states and loading.
     */
    setupEventListeners() {

        // Get references to the UI elements. Check if they exist.
        const launcher = document.getElementById('Launcher');
        const answerContainer = document.getElementById('answerContainer');
        const getAnswerButton = launcher ? launcher.querySelector('#getAnswerButton') : null;
        const loadingIndicator = getAnswerButton ? getAnswerButton.querySelector('#loadingIndicator') : null;
        const buttonTextSpan = getAnswerButton ? getAnswerButton.querySelector('#getAnswerButtonText') : null;


        if (!launcher || !answerContainer) {

            // Optionally, retry setup after a delay if elements are expected to appear later
            // setTimeout(() => this.setupEventListeners(), 500);
            return;
        }

        const closeButton = launcher.querySelector('#closeButton');
        const closeAnswerButton = answerContainer.querySelector('#closeAnswerButton'); // Get reference for answer close button


        // --- Add CSS for Spinner Animation and Visual Cues (if not already present) ---
        // This is a common way to add global CSS rules via JS
        if (!document.getElementById('assessment-helper-styles')) {
            const style = document.createElement('style');
            style.id = 'assessment-helper-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                /* Hover effect for close buttons */
                #closeButton:hover, #closeAnswerButton:hover {
                    color: #ff6b6b; /* Change color to red on hover */
                    opacity: 1 !important; /* Ensure full opacity on hover */
                }
                /* Active (pressed) effect for close buttons */
                #closeButton:active, #closeAnswerButton:active {
                    color: #e05252; /* Darker color when pressed */
                    transform: scale(0.95); /* Slightly shrink when pressed */
                }
                /* Hover effect for getAnswerButton */
                #getAnswerButton:hover {
                    background: #3c3e4b; /* Darker background on hover */
                }
                /* Active (pressed) effect for getAnswerButton */
                #getAnswerButton:active {
                    background: #4c4e5b; /* Even darker background when pressed */
                    transform: scale(0.98); /* Slightly shrink when pressed */
                }
                /* Disabled state for getAnswerButton */
                #getAnswerButton:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                /* Animation for answer container when it appears */
                .answerLauncher.show {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(-50%) scale(1); /* Return to normal scale */
                }
                /* Custom checkmark for checkbox */
                #dismissDiscordPopupCheckbox:checked::before {
                    content: '\\2713'; /* Checkmark Unicode */
                    display: block;
                    width: 100%;
                    height: 100%;
        margin-top: 0; /* Revert margin-top */
        overflow: hidden;
                    color: white;
                    text-align: center;
                    line-height: 14px; /* Center checkmark vertically */
                    font-size: 10px; /* Adjust size as needed */
                    position: absolute;
                    top: 0;
                    left: 0;
                }
            `;
            document.head.appendChild(style);
        }


        // --- Draggabilly for Main Launcher UI ---
        // Check if Draggabilly is available (it should be if loadScript succeeded)
        if (typeof Draggabilly !== 'undefined') {
            // Initialize Draggabilly on the launcher element.
            // The 'handle' option restricts dragging to the element with class 'drag-handle'.
            try {
                const draggie = new Draggabilly(launcher, {
                    handle: '.drag-handle',
                    // Add a delay before dragging starts (in milliseconds)
                    delay: 50 // Adjust this value (e.g., 100, 200) to fine-tune the feel
                });

                // Optional: Add Draggabilly listeners for debugging or custom behavior
                // draggie.on( 'dragStart', function( event, pointer ) { console.log('Draggabilly drag started', pointer); } );
                // draggie.on( 'dragEnd', function( event, pointer ) { console.log('Draggabilly drag ended', pointer); } );
                // draggie.on( 'dragMove', function( event, pointer, moveVector ) { /* console.log('Draggabilly drag move', moveVector); */ } );
            } catch (error) {
            }
        } else {
            // If Draggabilly failed to load, the main UI won't be draggable via Draggabilly.
            // The manual drag logic below is only for the answer UI.
        }


        // --- Manual Drag for Answer UI ---
        // This section handles dragging specifically for the smaller answer container.
        const answerDragHandle = answerContainer.querySelector('.answer-drag-handle');
        const answerContent = answerContainer.querySelector('#answerContent'); // Reference to the element displaying the answer

        if (answerDragHandle) {
            // Start dragging when the mouse is pressed down on the handle
            answerDragHandle.addEventListener('mousedown', (e) => {
                // Prevent default text selection or other browser behaviors
                e.preventDefault();
                this.answerIsDragging = true;
                // Calculate the initial offset of the mouse pointer relative to the element's top-left corner
                const rect = answerContainer.getBoundingClientRect();
                this.answerInitialX = e.clientX - rect.left;
                this.answerInitialY = e.clientY - rect.top;
                // Ensure the element is positioned absolutely or fixed for dragging
                answerContainer.style.position = 'fixed'; // It should already be fixed
            });
        } else {
        }


        // Keep mousemove and mouseup listeners on the document to ensure dragging continues
        // even if the mouse leaves the element itself.
        document.addEventListener('mousemove', (e) => {
            // Handle Answer UI dragging if currently dragging
            if (this.answerIsDragging && answerContainer) {
                e.preventDefault(); // Prevent text selection etc.
                // Calculate the new position based on the current mouse position and the initial offset
                let newX = e.clientX - this.answerInitialX;
                let newY = e.clientY - this.answerInitialY;

                // Apply the new position to the element's style
                answerContainer.style.left = `${newX}px`;
                answerContainer.style.top = `${newY}px`;
                // Clear any potentially conflicting styles like 'right', 'bottom', or 'transform'
                answerContainer.style.right = null;
                answerContainer.style.bottom = null;
                answerContainer.style.transform = 'none'; // Clear any transform that might interfere
            }
            // Draggabilly handles the main launcher dragging, so no manual logic needed here for 'launcher'.
        });

        document.addEventListener('mouseup', () => {
            // Stop Answer UI manual dragging when the mouse button is released
            this.answerIsDragging = false;
        });

        // Optional: Stop Answer UI manual dragging if the mouse leaves the browser window
        document.addEventListener('mouseleave', () => {
            this.answerIsDragging = false;
        });


        // --- Other Event Listeners ---
        // Close button for the main launcher UI
        if (closeButton) {
            closeButton.addEventListener('click', () => {
    
                // Animate the main UI fading out
                launcher.style.opacity = 0;
                // Hide the element completely after the fade-out transition finishes
                launcher.addEventListener('transitionend', function handler() {
                    if (parseFloat(launcher.style.opacity) === 0) {
                        launcher.style.visibility = 'hidden';
                        // Remove the event listener after it has served its purpose
                        launcher.removeEventListener('transitionend', handler);
                    }
                });
            });
            // Removed JS hover listeners, relying on CSS now
            closeButton.addEventListener('mousedown', () => { closeButton.style.transform = 'scale(0.95)'; });
            closeButton.addEventListener('mouseup', () => { closeButton.style.transform = 'scale(1)'; });

        } else {
        }

        // Close button for the answer UI
        if (closeAnswerButton) {
            closeAnswerButton.addEventListener('click', () => {
    
                // Animate the answer container fading out and scaling down slightly
                answerContainer.style.opacity = 0;
                answerContainer.style.transform = 'translateY(-50%) scale(0.8)'; // Scale down slightly
                answerContainer.addEventListener('transitionend', function handler() {
                    if (parseFloat(answerContainer.style.opacity) === 0) {
                        answerContainer.style.display = 'none'; // Hide completely after fade
                        answerContainer.style.visibility = 'hidden'; // Ensure visibility is hidden
                        answerContainer.style.transform = 'translateY(-50%) scale(1)'; // Reset transform for next show
                        answerContainer.removeEventListener('transitionend', handler);
                    }
                });
            });
            // Removed JS hover listeners, relying on CSS now
            closeAnswerButton.addEventListener('mousedown', () => { closeAnswerButton.style.transform = 'scale(0.95)'; });
            closeAnswerButton.addEventListener('mouseup', () => { closeAnswerButton.style.transform = 'scale(1)'; });
        } else {
        }

        // Get Answer button on the main launcher UI
        if (getAnswerButton) {
            // Add hover/active effects using JS for inline styles
            getAnswerButton.addEventListener('mouseenter', () => { getAnswerButton.style.background = '#3c3e4b'; });
            getAnswerButton.addEventListener('mouseleave', () => { getAnswerButton.style.background = '#2c2e3b'; });
            getAnswerButton.addEventListener('mousedown', () => { getAnswerButton.style.transform = 'scale(0.98)'; });
            getAnswerButton.addEventListener('mouseup', () => { getAnswerButton.style.transform = 'scale(1)'; });


            getAnswerButton.addEventListener('click', async () => {


                // Set Nova button click count to 1 for each click
                let novaButtonClickCount = 1;


                // Prevent multiple clicks while fetching
                if (this.isFetchingAnswer) {
                    return;
                }

                this.isFetchingAnswer = true;
                getAnswerButton.disabled = true; // Disable button
                if (buttonTextSpan) buttonTextSpan.style.display = 'none'; // Hide text
                if (loadingIndicator) loadingIndicator.style.display = 'block'; // Show spinner


                // Log data when the button is clicked, including the new click count
                await this.logToDataEndpoint(novaButtonClickCount);

                // Recursive function to process questions, handling retries if necessary
                const processQuestion = async (excludedAnswers = []) => {
                    try {

                        // Fetch the current article and question content from the page
                        let queryContent = await this.fetchArticleContent();


                        // Append instruction to the query for the API
                        queryContent += "\n\nPROVIDE ONLY A ONE-LETTER ANSWER THAT'S IT NOTHING ELSE (A, B, C, or D).";

                        // Add prompt to avoid excluded answers if retrying
                        if (excludedAnswers.length > 0) {
                            queryContent += `\n\nDo not pick letter ${excludedAnswers.join(', ')}.`;
    
                        }

                        // Fetch the answer from the API

                        const answer = await this.fetchAnswer(queryContent);


                        // Display the received answer in the answer UI
                        answerContent.textContent = answer;
                        // Animate the answer container appearance
                        answerContainer.style.display = 'flex'; // Use flex to center content
                        answerContainer.style.visibility = 'visible';
                        answerContainer.classList.add('show'); // Trigger animation

                        // Check if the received answer is a valid single letter (A-D) and not excluded
                        if (answer && ['A', 'B', 'C', 'D'].includes(answer.trim()) && !excludedAnswers.includes(answer.trim())) {
                            const trimmedAnswer = answer.trim();

                            // Find all radio button options on the page
                            const options = document.querySelectorAll('[role="radio"]');
                            // Calculate the index based on the letter (A=0, B=1, etc.)
                            const index = trimmedAnswer.charCodeAt(0) - 'A'.charCodeAt(0);

                            // Check if an option exists at the calculated index
                            if (options[index]) {

                                options[index].click(); // Simulate clicking the radio button

                                // Wait a short time for the page to register the click
                                await new Promise(resolve => setTimeout(async () => {
                                    // Find the Submit button
                                    const submitButton = Array.from(document.querySelectorAll('button'))
                                        .find(button => button.textContent.trim() === 'Submit');

                                    if (submitButton) {
                                        submitButton.click(); // Simulate clicking the Submit button

                                        // Wait for the page to process the submission and potentially show feedback/next button
                                        await new Promise(resolve => setTimeout(async () => {
                                            // Find the button that appears after submission (usually "Next" or "Try again")
                                            const nextButton = document.getElementById('feedbackActivityFormBtn');

                                            if (nextButton) {
                                                const buttonText = nextButton.textContent.trim();

                                                // Click the next/retry button
                                                nextButton.click();

                                                // Check if the button was "Try again"
                                                if (buttonText === 'Try again') {
                                                    // If incorrect, hide the answer UI and retry the question,
                                                    // adding the incorrect answer to the excluded list.
                                                    await new Promise(resolve => setTimeout(async () => {
                                                        answerContainer.style.display = 'none'; // Hide answer UI
                                                        answerContainer.classList.remove('show'); // Remove animation class
                                                        await processQuestion([...excludedAnswers, trimmedAnswer]); // Retry with excluded answer
                                                        resolve();
                                                    }, 1000)); // Give time for page to reset/load the retry state
                                                } else { // Likely 'Next' or similar success button
                                                    await new Promise(resolve => setTimeout(async () => {
                                                        // Check if a new question element (radio button) is present
                                                        const newQuestionRadio = document.querySelector('[role="radio"]');
                                                        // Also check if a Submit button for the *next* question is present
                                                        const newSubmitButton = Array.from(document.querySelectorAll('button'))
                                                            .find(button => button.textContent.trim() === 'Submit');

                                                        // If a new question and submit button are found, process the next question
                                                        if (newSubmitButton && newQuestionRadio) {
                                                            answerContainer.style.display = 'none'; // Hide answer UI for the new question
                                                            answerContainer.classList.remove('show'); // Remove animation class
                                                            await processQuestion(); // Process the new question
                                                        } else {
                                                            // Optionally, display a message indicating completion or issue
                                                            answerContent.textContent = "Processing complete or no more questions found.";
                                                            // Keep answer container visible with final message
                                                        }
                                                        resolve();
                                                    }, 1500)); // Give page time to load next question
                                                }
                                            } else {
                                                // If no such button is found, the submission flow might be different or completed.
                                                answerContent.textContent = 'Submit processed, but next step button not found.';
                                            }
                                            resolve();
                                        }, 1000)); // Give page time to process submit and show feedback/next button
                                    } else {
                                        answerContent.textContent = 'Error: Submit button not found.';
                                    }
                                    resolve();
                                }, 500)); // Give page time to register radio button click
                            } else {
                                answerContent.textContent = `Error: Option ${trimmedAnswer} not found on page.`;
                            }
                        } else {
                            // If the answer is not a valid format (e.g., multiple letters, text) or is excluded,
                            // just display what the API returned and don't attempt to click options.
                        }
                    } catch (error) {
                        answerContent.textContent = `Error: ${error.message}`; // Display error in the answer UI
                        answerContainer.style.display = 'flex'; // Ensure answer UI is visible to show the error
                        answerContainer.style.visibility = 'visible';
                        answerContainer.classList.add('show'); // Trigger animation
                    } finally {
                        // Ensure button state is reset after processing (even on error)
                        this.isFetchingAnswer = false;
                        getAnswerButton.disabled = false;
                        if (loadingIndicator) loadingIndicator.style.display = 'none';
                        if (buttonTextSpan) buttonTextSpan.style.display = 'block';
                    }
                };

                // Start the question processing loop
                await processQuestion();
            });
        } else {
        }
    }
}

// Initialize the helper when the script loads
// This will trigger the dynamic loading of Anime.js, then Draggabilly,
// and then the rest of the initialization and animation.
const helper = new AssessmentHelper();
