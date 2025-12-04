/**
 * AssessmentHelper Class
 * Manages a floating UI element for interacting with assessment pages.
 * Includes Draggabilly for main UI dragging and an intro animation using Anime.js.
 * The intro animation features an image animating into view.
 * Both Anime.js and Draggabilly are loaded dynamically via JavaScript.
 * Enhanced visual cues for buttons, loading states, and answer display.
 */
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
    this.isProcessingRespond = false;
    this.currentQuestionText = ''; // Track the current question text
    this.completionAnimationPlayed = false; // Track if the completion animation has been played

    // URLs for the external libraries
    this.animeScriptUrl =
      "https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js"; // Anime.js core library
    this.draggabillyScriptUrl =
      "https://unpkg.com/draggabilly@3/dist/draggabilly.pkgd.min.js"; // Draggabilly library

    // Ensure the script runs after the DOM is fully loaded
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
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
    console.log("AssessmentHelper: Starting initialization...");
    try {
      // Dynamically load Anime.js first
      console.log(`AssessmentHelper: Loading script: ${this.animeScriptUrl}`);
      await this.loadScript(this.animeScriptUrl);
      console.log("AssessmentHelper: Anime.js script loaded successfully.");

      // Then dynamically load Draggabilly
      console.log(
        `AssessmentHelper: Loading script: ${this.draggabillyScriptUrl}`,
      );
      await this.loadScript(this.draggabillyScriptUrl);
      console.log("AssessmentHelper: Draggabilly script loaded successfully.");

      // Create UI elements after scripts are loaded and available
      this.itemMetadata = {
        UI: this.createUI(), // Main draggable UI
        answerUI: this.createAnswerUI(), // Smaller answer display UI
      };

      // Start the intro animation, which will handle appending and showing the UI
      this.playIntroAnimation();
    } catch (error) {
      console.error("AssessmentHelper: Failed during script loading:", error);
      // Handle the error - notify the user and potentially proceed without full functionality
      alert(
        "Failed to load required scripts for the Assessment Helper. Some features may not work.",
      );
      // Fallback: Create and show UI without animation/dragging if scripts fail
      this.itemMetadata = {
        UI: this.createUI(),
        answerUI: this.createAnswerUI(),
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
      const script = document.createElement("script");
      script.src = url;
      script.onload = () => {
        console.log(`AssessmentHelper: Script loaded: ${url}`);
        resolve();
      };
      script.onerror = (error) => {
        console.error(`AssessmentHelper: Error loading script: ${url}`, error);
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
    launcher.style.cssText =
      "outline: none;min-height: 160px;opacity: 0;visibility: hidden;transition: opacity 0.5s ease;font-family: 'Nunito', sans-serif;width: 180px;height: 240px;background: #1c1e2b;position: fixed;border-radius: 12px;display: flex;flex-direction: column;align-items: center;color: white;font-size: 16px;top: 50%;right: 20px;transform: translateY(-50%);z-index: 99999;padding: 16px;box-shadow: 0 4px 8px rgba(0,0,0,0.2);overflow: hidden;white-space: nowrap;";

    // Drag handle element - Draggabilly will be configured to use this
    const dragHandle = document.createElement("div");
    dragHandle.className = "drag-handle";
    dragHandle.style.cssText =
      "width: 100%;height: 24px;cursor: move;background: transparent;position: absolute;top: 0;";

    // Image element inside the launcher (this image is part of the UI, not the intro animation image)
    const uiImg = document.createElement("img");
    uiImg.src =
      "https://github.com/Cpmjaguar1234/nova/blob/main/nova%20logo%20png.png?raw=true"; // Keep the original UI image
    uiImg.style.cssText =
      "width: 90px;height: 90px;margin-top: 32px;border-radius: 50%;";

    // Close button for the main UI
    const closeButton = document.createElement("button");
    closeButton.id = "closeButton";
    // Use Unicode multiplication symbol
    closeButton.textContent = "\u00D7"; // Unicode multiplication symbol
    // Added transition for smoother hover effect
    // Set initial color to white and opacity to 0.5 for dimmed appearance
    // Removed temporary blue background
    closeButton.style.cssText =
      "position: absolute;top: 8px;right: 8px;background: none;border: none;color: white;font-size: 18px;cursor: pointer;padding: 2px 8px;transition: color 0.2s ease, transform 0.1s ease; opacity: 0.5; display: block; visibility: visible;";

    // Button to trigger the answer fetching process
    const getAnswerButton = document.createElement("button");
    getAnswerButton.id = "getAnswerButton";
    // Added transitions for background and transform on hover/active
    getAnswerButton.style.cssText =
      "background: #2c2e3b;border: none;color: white;padding: 12px 20px;border-radius: 8px;cursor: pointer;margin-top: 24px;width: 120px;height: 44px;font-size: 16px;transition: background 0.2s ease, transform 0.1s ease; display: flex; justify-content: center; align-items: center;"; // Added flex properties for centering content

    // Loading indicator element (initially hidden)
    const loadingIndicator = document.createElement("div");
    loadingIndicator.id = "loadingIndicator";
    loadingIndicator.style.cssText =
      "border: 4px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top: 4px solid #fff; width: 20px; height: 20px; animation: spin 1s linear infinite; display: none;"; // Basic spinner CSS

    // Button text span
    const buttonTextSpan = document.createElement("span");
    buttonTextSpan.textContent = "Skip Article";
    buttonTextSpan.id = "getAnswerButtonText";

    getAnswerButton.appendChild(loadingIndicator);
    getAnswerButton.appendChild(buttonTextSpan);

    // Version display
    const version = document.createElement("div");
    version.style.cssText =
      "position: absolute;bottom: 8px;right: 8px;font-size: 12px;opacity: 0.5;";
    version.textContent = "1.2"; // Updated version number

    // Append elements to the launcher
    launcher.appendChild(dragHandle);
    launcher.appendChild(uiImg); // Append the UI image
    launcher.appendChild(closeButton);
    launcher.appendChild(getAnswerButton);
    launcher.appendChild(version);

    // Append launcher to the container
    container.appendChild(launcher);

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
    answerContainer.style.cssText =
      "outline: none;min-height: 60px;transform: translateX(0px) translateY(-50%);opacity: 0;visibility: hidden;transition: opacity 0.3s ease, transform 0.3s ease;font-family: 'Nunito', sans-serif;width: 60px;height: 60px;background: #1c1e2b;position: fixed;border-radius: 8px;display: flex;justify-content: center;align-items: center;color: white;font-size: 24px;top: 50%;right: 220px;z-index: 99998;padding: 8px;box-shadow: 0 4px 8px rgba(0,0,0,0.2);overflow: hidden;white-space: normal;";

    // Drag handle for the answer UI (for manual dragging)
    const dragHandle = document.createElement("div");
    dragHandle.className = "answer-drag-handle";
    dragHandle.style.cssText =
      "width: 100%;height: 24px;cursor: move;background: transparent;position: absolute;top: 0;";

    // Close button for the answer UI
    const closeButton = document.createElement("button");
    closeButton.id = "closeAnswerButton";
    // Added transition for smoother hover effect
    closeButton.style.cssText =
      "position: absolute;top: 8px;right: 8px;background: none;border: none;color: white;font-size: 18px;cursor: pointer;padding: 2px 8px;transition: color 0.2s ease, transform 0.1s ease;";

    // Element to display the fetched answer
    const answerContent = document.createElement("div");
    answerContent.id = "answerContent";
    answerContent.style.cssText =
      "padding: 0;margin: 0;word-wrap: break-word;font-size: 24px;font-weight: bold;display: flex;justify-content: center;align-items: center;width: 100%;height: 100%;";

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
    if (typeof anime === "undefined") {
      console.error(
        "AssessmentHelper: Anime.js is not loaded. Cannot play animation.",
      );
      this.showUI(); // Fallback to showing UI directly
      return;
    }

    const imageUrl =
      "https://github.com/Cpmjaguar1234/nova/blob/main/nova%20logo%20png.png?raw=true"; // Image URL

    // Create the image element for the intro animation
    const introImgElement = document.createElement("img");
    introImgElement.src = imageUrl;
    introImgElement.id = "introLoaderImage"; // Give it an ID for targeting with Anime.js
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

    console.log("AssessmentHelper: Starting Anime.js intro animation.");

    // Anime.js animation sequence for the intro image
    anime
      .timeline({
        easing: "easeInOutQuad", // Smooth easing
        duration: 800, // Duration for animation segments
        complete: (anim) => {
          console.log(
            "AssessmentHelper: Intro animation complete. Showing UI.",
          );
          // Remove the intro image element from the DOM after animation finishes
          introImgElement.remove();
          // Show the main UI and set up listeners
          this.showUI();
        },
      })
      .add({
        targets: introImgElement,
        opacity: [0, 1], // Fade in
        scale: [0.5, 1], // Scale up
        rotate: "1turn", // Rotate once
        duration: 1000, // Longer duration for the initial entrance
        easing: "easeOutExpo",
      })
      .add({
        targets: introImgElement,
        translateY: "-=20", // Move up slightly
        duration: 500,
        easing: "easeInOutSine",
      })
      .add({
        targets: introImgElement,
        translateY: "+=20", // Move back down
        duration: 500,
        easing: "easeInOutSine",
      })
      // Add a final fade out for the intro image before removing it
      .add(
        {
          targets: introImgElement,
          opacity: 0,
          duration: 500,
          easing: "linear",
        },
        "+=500",
      ); // Add a small delay before fading out
  }

  /**
   * Appends the UI elements to the DOM and makes the main UI visible with a fade-in.
   * Then sets up event listeners.
   * @param {boolean} [skipAnimation=false] - If true, skips the fade-in animation for fallback.
   */
  showUI(skipAnimation = false) {
    console.log("AssessmentHelper: Showing UI.");
    // Append UI elements to the body
    document.body.appendChild(this.itemMetadata.UI);
    document.body.appendChild(this.itemMetadata.answerUI);

    // Get the launcher element after it's added to the DOM
    const launcher = document.getElementById("Launcher");
    if (launcher) {
      if (skipAnimation) {
        console.log("AssessmentHelper: Skipping UI fade-in animation.");
        launcher.style.visibility = "visible";
        launcher.style.opacity = 1;
        // Set up listeners immediately in fallback mode
        this.setupEventListeners();
      } else {
        // Make the launcher visible and trigger the fade-in transition
        launcher.style.visibility = "visible";
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
        }, 500); // Matches the launcher's opacity transition duration
      }
    } else {
      // Fallback if the launcher element was not found after creation/appending
      console.error(
        "AssessmentHelper: Launcher UI element not found after animation. Attempting event listener setup anyway.",
      );
      // If launcher isn't found, Draggabilly won't initialize for it, but other listeners might work.
      this.setupEventListeners();
    }
  }

  /**
   * Sets up polling to check for changes in the assessment UI
   */
  setupPolling() {
    const pollInterval = setInterval(async () => {
      const activeStep = this.getActiveStep();
      const currentTab = activeStep?.stepLabel?.toLowerCase() || '';

      // Handle Read tab
      if (currentTab === 'read') {
        console.log('AssessmentHelper: On Read tab, looking for Next button...');
        const nextButton = Array.from(document.querySelectorAll('button.MuiButton-containedPrimary, button.MuiButton-root, button'))
          .find(btn => btn.textContent?.trim().toLowerCase() === 'next');

      if (nextButton) {
        console.log('AssessmentHelper: Found and clicking Next button on Read tab');
        nextButton.click();
        return;
      }
      console.log('AssessmentHelper: No Next button found on Read tab yet');
      return;
    }

    // Handle Ready tab (polls)
    if (currentTab === 'ready') {
      console.log('AssessmentHelper: On Ready tab, checking for poll...');
      if (!this.isFetchingAnswer) {
        this.processQuestion().catch(error => {
          console.error('AssessmentHelper: Error processing poll:', error);
        });
      }
      return;
    }

    // Handle Respond tab
    if (currentTab === 'respond') {
      console.log('AssessmentHelper: On Respond tab, starting question answering...');
      clearInterval(pollInterval);
      if (!this.isFetchingAnswer) {
        this.processQuestion().catch(error => {
          console.error('AssessmentHelper: Error in processQuestion:', error);
        });
      }
      return;
    }

    console.log(`AssessmentHelper: On ${currentTab} tab, no action needed.`);
  }, 2000);
  }

  /**
   * Fetches an answer from the backend API based on the provided query content.
   * @param {string} queryContent - The content (article + question) to send to the API.
   * @returns {Promise<string>} A promise that resolves with the answer text or an error message.
   */
  async fetchAnswer(queryContent) {
    if (!queryContent) {
      console.error('AssessmentHelper: No query content provided');
      return 'Error: No question provided';
    }

    const getAnswerButton = document.getElementById('getAnswerButton');
    const buttonTextSpan = document.getElementById('getAnswerButtonText');
    const loadingIndicator = document.getElementById('loadingIndicator');

    try {
      // Update UI for loading state
      this.isFetchingAnswer = true;
      if (getAnswerButton) getAnswerButton.disabled = true;
      if (buttonTextSpan) buttonTextSpan.style.display = 'none';
      if (loadingIndicator) loadingIndicator.style.display = 'block';

      // Check if this is a poll question
      const isPollQuestion = Array.from(document.querySelectorAll('.MuiFormControlLabel-label')).some(label => {
        const text = label.textContent.toLowerCase();
        return text.includes('agree') || text.includes('disagree') || text.includes('yes') || text.includes('no');
      });

      // Modify the query based on question type
      let modifiedQuery = queryContent;
      if (isPollQuestion) {
        modifiedQuery += "\n\nIMPORTANT: This is a poll question with Agree/Disagree/Yes/No options. Please respond with ONLY 'A' for Agree/Yes or 'D' for Disagree/No. Nothing else.";
      } else {
        modifiedQuery += "\n\nIMPORTANT: Provide ONLY a single letter answer (A, B, C, or D). Nothing else.";
      }

      // Get article container content
      const articleContainer = document.getElementById('article_container');
      const articleContent = articleContainer ? articleContainer.outerHTML : '';

      const response = await fetch('https://novaedu.us.kg/ask', {
        method: 'POST',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: modifiedQuery,
          article: articleContent || this.cachedArticle || null,
          conversation_id: sessionStorage.getItem('conversation_id') || null,
        }),
      });

      if (!response.ok) {
        // Handle HTTP errors
        const errorBody = await response.text(); // Try to get error details
        console.error(
          "AssessmentHelper: Failed to fetch answer from API. Status:",
          response.status,
          "Body:",
          errorBody,
        );
        throw new Error(
          `API request failed with status ${response.status}: ${errorBody}`,
        );
      }

      const data = await response.json();
      let answer = data.response ? String(data.response).trim() : "No answer available";

      // For poll questions, ensure the answer is just A or D
      if (isPollQuestion) {
        const lowerAnswer = answer.toLowerCase();
        if (lowerAnswer.includes("agree") || lowerAnswer.includes("yes")) {
          answer = "A";
        } else if (lowerAnswer.includes("disagree") || lowerAnswer.includes("no")) {
          answer = "D";
        } else if (answer.length > 1) {
          answer = answer.charAt(0).toUpperCase();
        }
      }

      return answer;
    } catch (error) {
      console.error("AssessmentHelper: Error fetching answer:", error);
      return `Error: ${error.message}`; // Return error message to the UI
    }
  }

  /**
   * Fetches the article content and question content from the current page DOM.
   * Caches the article content.
   * @returns {Promise<string>} A promise that resolves with the combined article and question content.
   */

  /**
   * Fetches the article content and question content from the current page DOM.
   * Caches the article content.
   * @returns {Promise<string>} A promise that resolves with the combined article and question content.
   */
  /**
   * Handles the 'Respond' tab by finding the question and options,
   * then selecting the best answer.
   */
  async handleRespondTab() {
    console.log('AssessmentHelper: Handling Respond tab...');

    // Find the question text
    const questionElement = document.querySelector('.activity-questions-handle');
    if (!questionElement) {
      console.error('AssessmentHelper: Could not find question element');
      return;
    }

    const questionText = questionElement.textContent.trim();
    console.log('AssessmentHelper: Found question:', questionText);

    // Find all answer options
    const options = Array.from(document.querySelectorAll('[role="radio"]'));
    if (options.length === 0) {
      console.error('AssessmentHelper: No answer options found');
      return;
    }

    console.log(`AssessmentHelper: Found ${options.length} answer options`);

    // Get the text for each option
    const optionTexts = options.map(option => {
      const textElement = option.querySelector('.jss745');
      return textElement ? textElement.textContent.trim() : '';
    }).filter(Boolean);

    // Format the question and options for the API
    const formattedQuestion = `${questionText}\n\nOptions:\n${optionTexts.map((text, index) => `${String.fromCharCode(65 + index)}. ${text}`).join('\n')}`;

    try {
      // Get the answer from the API
      console.log('AssessmentHelper: Fetching answer for question...');
      const answer = await this.fetchAnswer(formattedQuestion);
      console.log('AssessmentHelper: Received answer:', answer);

      // Extract just the letter from the answer (A, B, C, or D)
      const answerLetter = answer.trim().charAt(0).toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(answerLetter)) {
        throw new Error(`Invalid answer format: ${answer}`);
      }

      // Find and click the corresponding option
      const optionIndex = answerLetter.charCodeAt(0) - 65; // A=0, B=1, etc.
      if (optionIndex >= 0 && optionIndex < options.length) {
        console.log(`AssessmentHelper: Selecting option ${answerLetter} (${optionTexts[optionIndex]})`);
        options[optionIndex].click();

        // Find and click the
        const submitButton = document.querySelector('button[type="button"]:has-text("Submit")');
        if (submitButton) {
          console.log('AssessmentHelper: Clicking submit button');
          submitButton.click();
        } else {
          console.warn('AssessmentHelper: Could not find submit button');
        }
      } else {
        console.error('AssessmentHelper: Invalid option index:', optionIndex);
      }
    } catch (error) {
      console.error('AssessmentHelper: Error handling Respond tab:', error);
    }
  }

  async fetchArticleContent() {
    // First check if we're on the Read tab
    const activeStep = this.getActiveStep();
    if (activeStep && activeStep.stepLabel && activeStep.stepLabel.toLowerCase() === 'read') {
        console.log('AssessmentHelper: On Read tab, skipping question detection');
        return '';
    }

    // Select the container with the ID 'start-reading' for article content
    const articleContainer = document.querySelector("#start-reading");
    let articleContent = "";
    if (articleContainer) {
      // Select all <p> elements within the container
      const paragraphs = articleContainer.querySelectorAll("p");
      // Extract and join the text content of each <p> element
      articleContent = Array.from(paragraphs)
        .map((p) => p.textContent.trim())
        .join(" ");
    } else {
      console.warn(
        "AssessmentHelper: Article content container (#start-reading) not found.",
      );
    }

    // Double check if we're on the Read tab after getting article content
    const currentStep = this.getActiveStep();
    if (currentStep && currentStep.stepLabel && currentStep.stepLabel.toLowerCase() === 'read') {
        console.log('AssessmentHelper: Confirmed on Read tab, returning article content only');
        return articleContent;
    }

    // Only try to find questions if we're not on the Read tab
    let questionContent = "";
    let questionContainer = null;

    // Try the poll container first
    questionContainer = document.querySelector("#before-reading-poll");
    if (questionContainer) {
      // Extract the question text from the poll
      const questionElement = questionContainer.querySelector("p.MuiTypography-h6");
      if (questionElement) {
        questionContent = questionElement.textContent.trim();
      }
    }

    // If not found, try the activity component
    if (!questionContainer) {
      questionContainer = document.querySelector("#activity-component-react");
      if (questionContainer) {
        questionContent = questionContainer.textContent.trim();
      }
    }

    // If not found, try a specific selector that might appear on the 'Read' tab
    if (!questionContent) {
        const challengeQuestion = document.querySelector('.challenge-question-prompt p');
        if (challengeQuestion) {
            questionContent = challengeQuestion.textContent.trim();
            console.log(`AssessmentHelper: Found question with '.challenge-question-prompt' selector.`);
        }
    }

    // If still not found, try a more generic approach for question-like elements
    if (!questionContent) {
      const allTextElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div[role="heading"]');
      for (const elem of allTextElements) {
        const text = elem.textContent.trim();
        // A simple heuristic: if it ends with a question mark and is of a reasonable length
        if (text.endsWith('?') && text.length > 15) {
          // Avoid picking up labels or instructions
          if (!text.toLowerCase().includes('maximum points') && !text.toLowerCase().includes('your answer')) {
            questionContent = text;
            console.log(`AssessmentHelper: Found question with generic fallback: ${text}`);
            break;
          }
        }
      }
    }

    if (questionContent) {
      console.log(
        `AssessmentHelper: Fetched question content (truncated): ${questionContent.substring(0, 200)}...`,
      );
    } else {
      console.warn(
        "AssessmentHelper: Question content not found with any selector.",
      );
    }

    // Combine article and question content
    const combinedContent = `${articleContent}\n\n${questionContent}`;
    // Cache the article content for potential future use (e.g., follow-up questions)
    this.cachedArticle = combinedContent;
    return combinedContent;
  }

  /**
   * Sets up all event listeners for the UI elements, including Draggabilly
   * for the main UI and manual drag for the answer UI.
   * Also adds visual feedback for button states and loading.
   */
  setupEventListeners() {
    console.log("AssessmentHelper: Setting up event listeners.");

    // Initialize progress bar
    this.addProgressBar();

    const launcher = document.getElementById("Launcher");
    const answerContainer = document.getElementById("answerContainer");
    const getAnswerButton = launcher
      ? launcher.querySelector("#getAnswerButton")
      : null;

    if (!launcher || !answerContainer) {
      console.error(
        "AssessmentHelper: UI elements not found during event listener setup. Aborting listener setup."
      );
      return;
    }

    const closeButton = launcher.querySelector("#closeButton");
    const closeAnswerButton =
      answerContainer.querySelector("#closeAnswerButton");

    if (!document.getElementById("assessment-helper-styles")) {
      const style = document.createElement("style");
      style.id = "assessment-helper-styles";
      style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        #closeButton:hover, #closeAnswerButton:hover { color: #ff6b6b; opacity: 1 !important; }
        #closeButton:active, #closeAnswerButton:active { color: #e05252; transform: scale(0.95); }
        #getAnswerButton:hover { background: #3c3e4b; }
        #getAnswerButton:active { background: #4c4e5b; transform: scale(0.98); }
        #getAnswerButton:disabled { opacity: 0.6; cursor: not-allowed; }
        .answerLauncher.show { opacity: 1; visibility: visible; transform: translateY(-50%) scale(1); }
        #assessment-progress-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background-color: #f0f0f0;
            z-index: 9999;
        }
        #assessment-progress-fill {
            height: 100%;
            width: 0%;
            background-color: #ffffff;
            transition: width 0.3s ease;
        }
      `;
      document.head.appendChild(style);
    }

    if (typeof Draggabilly !== "undefined") {
      try {
        new Draggabilly(launcher, { handle: ".drag-handle", delay: 150 });
        console.log(
          "AssessmentHelper: Draggabilly initialized on #Launcher with handle '.drag-handle' and delay 150ms."
        );
      } catch (error) {
        console.error("AssessmentHelper: Failed to initialize Draggabilly:", error);
      }
    } else {
      console.error(
        "AssessmentHelper: Draggabilly is not defined. Cannot initialize dragging for the main UI."
      );
    }

    const answerDragHandle = answerContainer.querySelector(".answer-drag-handle");
    if (answerDragHandle) {
      answerDragHandle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this.answerIsDragging = true;
        const rect = answerContainer.getBoundingClientRect();
        this.answerInitialX = e.clientX - rect.left;
        this.answerInitialY = e.clientY - rect.top;
        answerContainer.style.position = "fixed";
      });
    } else {
      console.warn("AssessmentHelper: Answer drag handle (.answer-drag-handle) not found.");
    }

    document.addEventListener("mousemove", (e) => {
      if (this.answerIsDragging && answerContainer) {
        e.preventDefault();
        let newX = e.clientX - this.answerInitialX;
        let newY = e.clientY - this.answerInitialY;
        answerContainer.style.left = `${newX}px`;
        answerContainer.style.top = `${newY}px`;
        answerContainer.style.right = null;
        answerContainer.style.bottom = null;
        answerContainer.style.transform = "none";
      }
    });

    document.addEventListener("mouseup", () => { this.answerIsDragging = false; });
    document.addEventListener("mouseleave", () => { this.answerIsDragging = false; });

    if (closeButton) {
      closeButton.addEventListener("click", () => {
        launcher.style.opacity = 0;
        launcher.addEventListener("transitionend", function handler() {
          if (parseFloat(launcher.style.opacity) === 0) {
            launcher.style.visibility = "hidden";
            launcher.removeEventListener("transitionend", handler);
          }
        });
      });
      closeButton.addEventListener("mousedown", () => { closeButton.style.transform = "scale(0.95)"; });
      closeButton.addEventListener("mouseup", () => { closeButton.style.transform = "scale(1)"; });
    } else {
      console.warn("AssessmentHelper: Close button (#closeButton) not found on main UI.");
    }

    if (closeAnswerButton) {
      closeAnswerButton.addEventListener("click", () => {
        answerContainer.style.opacity = 0;
        answerContainer.style.transform = "translateY(-50%) scale(0.8)";
        answerContainer.addEventListener("transitionend", function handler() {
          if (parseFloat(answerContainer.style.opacity) === 0) {
            answerContainer.style.display = "none";
            answerContainer.style.visibility = "hidden";
            answerContainer.style.transform = "translateY(-50%) scale(1)";
            answerContainer.removeEventListener("transitionend", handler);
          }
        });
      });
      closeAnswerButton.addEventListener("mousedown", () => { closeAnswerButton.style.transform = "scale(0.95)"; });
      closeAnswerButton.addEventListener("mouseup", () => { closeAnswerButton.style.transform = "scale(1)"; });
    } else {
      console.warn("AssessmentHelper: Close button (#closeAnswerButton) not found on answer UI.");
    }

    // Periodically check for and close any pop-ups that have a specific close icon
    setInterval(() => {
      const closeIcon = document.querySelector('[data-testid="CloseIcon"]');
      if (closeIcon) {
        const button = closeIcon.closest('button');
        if (button) {
          console.log('AssessmentHelper: Found and clicked a close button (likely a popup).');
          button.click();

          // After closing popup, check if we need to proceed to the next step
          setTimeout(() => {
            // Check if we're on the Ready tab and the popup was just closed
            const activeStep = this.getActiveStep();
            const currentTab = activeStep?.stepLabel?.toLowerCase() || '';

            if (currentTab === 'ready') {
              console.log('AssessmentHelper: Popup closed, attempting to proceed to next step...');
              // Try to find and click the Next button
              const nextButton = Array.from(document.querySelectorAll('button.MuiButton-containedPrimary, button.MuiButton-root, button')).find(btn =>
                btn.textContent?.toLowerCase().includes('next') ||
                btn.textContent?.toLowerCase().includes('continue')
              );

              if (nextButton) {
                console.log('AssessmentHelper: Found and clicking Next button after popup close');
                nextButton.click();
              } else {
                // If no Next button, try to find and click the second tab
                const tabs = document.querySelectorAll('.MuiStepLabel-label');
                if (tabs.length > 1) {
                  console.log('AssessmentHelper: Clicking on the next tab after popup close');
                  tabs[1].click();
                }
              }
            }
          }, 500); // Small delay to allow popup close to complete
        }
      }
    }, 2000); // Check every 2 seconds

    if (getAnswerButton) {
      getAnswerButton.addEventListener("mouseenter", () => { getAnswerButton.style.background = "#3c3e4b"; });
      getAnswerButton.addEventListener("mouseleave", () => { getAnswerButton.style.background = "#2c2e3b"; });
      getAnswerButton.addEventListener("mousedown", () => { getAnswerButton.style.transform = "scale(0.98)"; });
      getAnswerButton.addEventListener("mouseup", () => { getAnswerButton.style.transform = "scale(1)"; });

      getAnswerButton.addEventListener("click", async () => {
        console.log("AssessmentHelper: Get Answer button clicked.");
        const answerContent = document.getElementById("answerContent");

        try {
          // First check which tab we're on
          const activeStep = this.getActiveStep();
          const currentTab = activeStep?.stepLabel?.toLowerCase() || '';

          // Handle Ready tab (polls)
          if (currentTab === 'ready') {
            console.log('AssessmentHelper: On Ready tab, processing poll...');
            const pollOptions = document.querySelectorAll('.MuiFormGroup-root input[type="radio"]');
            if (pollOptions.length > 0) {
              // Select a random option for the poll
              const randomOption = pollOptions[Math.floor(Math.random() * pollOptions.length)];
              randomOption.click();
              console.log('AssessmentHelper: Selected a poll option');

              // Find and click the submit button if it exists
              const submitButton = Array.from(document.querySelectorAll('button')).find(btn =>
                btn.textContent?.toLowerCase().includes('submit') ||
                btn.textContent?.toLowerCase().includes('next')
              );

              if (submitButton) {
                console.log('AssessmentHelper: Submitting poll');
                submitButton.click();
              }
            }
            return;
          }

          // Handle Read tab
          if (currentTab === 'read') {
            console.log('AssessmentHelper: On Read tab, attempting to auto-progress...');
            // Try to find and click the Next button
            const nextButton = Array.from(document.querySelectorAll('button.MuiButton-containedPrimary, button.MuiButton-root')).find(btn =>
              btn.textContent && btn.textContent.trim().toLowerCase() === 'next'
            );

            if (nextButton) {
              console.log('AssessmentHelper: Found and clicking Next button on Read tab');
              nextButton.click();
              return;
            } else {
              console.log('AssessmentHelper: No Next button found on Read tab');
              // If no Next button, try to find and click the second tab
              const tabs = document.querySelectorAll('.MuiStepLabel-label');
              if (tabs.length > 1) {
                console.log('AssessmentHelper: Clicking on the next tab');
                tabs[1].click(); // Click the second tab (index 1)
              }
              return;
            }
          }

          // Debug logging to see what currentTab contains
          console.log(`AssessmentHelper: Debug - currentTab = "${currentTab}", isQuestionTabActive = ${this.isQuestionTabActive()}`);
          
          // If not on Ready, Read, Respond, or question tab, ignore click
          if (!this.isQuestionTabActive() && currentTab !== 'respond' && currentTab !== 'ready') {
            console.log("AssessmentHelper: Not on a question tab, ignoring click.");
            if (answerContent) {
              answerContent.textContent = "Please navigate to a question tab first.";
              answerContent.style.color = "#ff6b6b";
              setTimeout(() => {
                answerContent.textContent = "";
              }, 3000);
            }
            return;
          }

          if (this.isFetchingAnswer) {
            console.log("AssessmentHelper: Already fetching answer, ignoring click.");
            return;
          }

          this.isFetchingAnswer = true;
          const buttonTextSpan = document.getElementById('getAnswerButtonText');
          const loadingIndicator = document.getElementById('loadingIndicator');

          if (getAnswerButton) getAnswerButton.disabled = true;
          if (buttonTextSpan) buttonTextSpan.style.display = "none";
          if (loadingIndicator) loadingIndicator.style.display = "block";

          // Handle Ready tab differently - directly process without API call
          if (currentTab === 'ready') {
            console.log('AssessmentHelper: Processing Ready tab question directly...');
            await this.processQuestion();
            
            // Reset UI state
            if (getAnswerButton) getAnswerButton.disabled = false;
            if (buttonTextSpan) buttonTextSpan.style.display = "block";
            if (loadingIndicator) loadingIndicator.style.display = "none";
            this.isFetchingAnswer = false;
            return;
          }

          // Handle Respond tab - directly process without API call
          if (currentTab === 'respond') {
            console.log('AssessmentHelper: Processing Respond tab question directly...');
            await this.processQuestion();
            
            // Reset UI state
            if (getAnswerButton) getAnswerButton.disabled = false;
            if (buttonTextSpan) buttonTextSpan.style.display = "block";
            if (loadingIndicator) loadingIndicator.style.display = "none";
            this.isFetchingAnswer = false;
            return;
          }

          let questionContent = await this.fetchArticleContent();
          if (!questionContent) throw new Error('Could not fetch question content');

          const answer = await this.fetchAnswer(questionContent);
          console.log(`AssessmentHelper: Received answer from API: "${answer}"`);

          if (!answerContainer || !answerContent) throw new Error('Answer UI elements not found');

          answerContent.textContent = answer;
          answerContainer.style.display = "flex";
          answerContainer.style.visibility = "visible";
          answerContainer.classList.add("show");

          const isPollQuestion = Array.from(document.querySelectorAll('.MuiFormControlLabel-label')).some(label => {
            const text = label.textContent.toLowerCase();
            return text.includes('agree') || text.includes('disagree') || text.includes('yes') || text.includes('no');
          });
          const isValidAnswer = answer && ["A", "B", "C", "D"].includes(answer.trim());

          if (isValidAnswer) {
            const trimmedAnswer = answer.trim();
            console.log(`AssessmentHelper: Answer "${trimmedAnswer}" is valid. Attempting to select option.`);

            let targetOption = null;
            const options = document.querySelectorAll('input[type="radio"], [role="radio"]');

            if (isPollQuestion) {
                // For polls, find the options and click one, often they are not standard A/B/C
                const pollOptions = document.querySelectorAll('.MuiFormGroup-root input[type="radio"]');
                if (pollOptions.length > 0) {
                    // Find the option that matches 'Agree' or 'Disagree' based on API response
                    const targetValue = (trimmedAnswer === 'A') ? 'Agree' : 'Disagree';
                    let selected = false;
                    for (const option of pollOptions) {
                        const label = option.closest('label')?.textContent.trim();
                        if (label && label.includes(targetValue)) {
                            option.click();
                            targetOption = option;
                            console.log(`AssessmentHelper: Selected poll option: ${label}`);
                            selected = true;
                            break;
                        }
                    }
                    if (!selected) {
                        console.warn("AssessmentHelper: Could not find specific poll option, selecting randomly.");
                        const randomOption = pollOptions[Math.floor(Math.random() * pollOptions.length)];
                        randomOption.click();
                        targetOption = randomOption;
                    }
                } else {
                    console.error("No poll radios found.");
                }
            } else {
                // For standard multiple choice
                console.log(`AssessmentHelper: Looking for option matching answer '${trimmedAnswer}'`);

                // First try: Look for options with data-value or value attributes
                const optionByValue = Array.from(options).find(opt => {
                    const value = opt.getAttribute('data-value') || opt.getAttribute('value') || '';
                    return value.trim().toUpperCase() === trimmedAnswer;
                });

                if (optionByValue) {
                    targetOption = optionByValue;
                    console.log(`Found option by value: ${optionByValue.outerHTML}`);
                } else {
                    // Second try: Look for options where the label starts with the answer letter
                    for (const option of options) {
                        let labelText = '';
                        // Try to find label in various ways
                        const label = option.closest('label') ||
                                    (option.id && document.querySelector(`label[for="${option.id}"]`)) ||
                                    option.closest('[role="radio"]')?.querySelector('span') ||
                                    option.parentElement;

                        if (label) {
                            labelText = label.textContent?.trim().toUpperCase() || '';
                            console.log(`Option label text: '${labelText}'`);

                            // Check if label starts with answer (A, B, C, D) followed by punctuation
                            const answerRegex = new RegExp(`^${trimmedAnswer}[\s\.\)\-]`);
                            if (answerRegex.test(labelText)) {
                                targetOption = option;
                                console.log(`Matched option by label start: ${labelText}`);
                                break;
                            }

                            // Check if label contains the answer in a span with a specific class
                            const answerSpan = label.querySelector(`span[data-answer="${trimmedAnswer}"]`);
                            if (answerSpan) {
                                targetOption = option;
                                console.log('Matched option by data-answer attribute');
                                break;
                            }
                        }
                    }
                }

                // Third try: If still no match, try to find by position (A=0, B=1, etc.)
                if (!targetOption && options.length > 0) {
                    const optionIndex = trimmedAnswer.charCodeAt(0) - 65; // A=0, B=1, etc.
                    if (optionIndex >= 0 && optionIndex < options.length) {
                        console.log(`Falling back to option by index: ${optionIndex}`);
                        targetOption = options[optionIndex];
                    } else {
                        // If we still don't have a match, try to find any unchecked option
                        const uncheckedOption = Array.from(options).find(opt => !opt.checked && !opt.getAttribute('aria-checked'));
                        if (uncheckedOption) {
                            console.log('No exact match found, selecting first unchecked option');
                            targetOption = uncheckedOption;
                        }
                    }
                }
            }

            if (targetOption) {
                console.log(`AssessmentHelper: Clicking option for "${trimmedAnswer}".`);
                targetOption.click();

                // Store the selected poll answer text to use in the written response prompt
                if (isPollQuestion) {
                    const label = targetOption.closest('label')?.querySelector('.MuiFormControlLabel-label');
                    if (label) {
                        const pollAnswerText = label.textContent.trim();
                        questionContent += `\n\nI voted '${pollAnswerText}'. Please provide a written explanation for this choice.`;
                    }
                }
            } else {
                console.warn(`AssessmentHelper: Option for "${trimmedAnswer}" not found.`);
                answerContent.textContent = `Error: Option ${trimmedAnswer} not found.`;
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            const possibleSubmitTexts = ["Submit", "Check Answer", "Submit Response"];
            const submitBtn = Array.from(document.querySelectorAll("button")).find(button =>
                possibleSubmitTexts.some(text => button.textContent?.trim().toLowerCase() === text.toLowerCase())
            );

            if (submitBtn) {
                console.log("AssessmentHelper: Submit button found, clicking...");
                submitBtn.click();

                await new Promise(resolve => setTimeout(resolve, 1000));

                // Check for pagination after poll submission
                if (isPollQuestion) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for editor to appear
                    console.log("AssessmentHelper: Fetching written response for poll...");
                    const writtenResponse = await this.fetchAnswer(questionContent); // Use the modified questionContent
                    console.log(`AssessmentHelper: Received written response: "${writtenResponse}".`);
                    this.writeTinyMCE(writtenResponse);

                    // Check for pagination after poll submission
                    const pagination = document.querySelector('[aria-label*="Amount of Pages"]');
                    if (pagination && pagination.getAttribute('aria-label').includes('2')) {
                        const page2Button = Array.from(pagination.querySelectorAll('button'))
                            .find(btn => btn.getAttribute('aria-label') === 'Go to page 2');
                        if (page2Button) {
                            console.log("AssessmentHelper: Navigating to page 2 of poll response.");
                            page2Button.click();
                            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for page 2 to load
                        }
                    }
                    const nextBtn = Array.from(document.querySelectorAll("button"))
                        .find(btn => btn.textContent?.trim() === 'Next');
                    if (nextBtn) {
                        console.log("AssessmentHelper: Clicking 'Next' button after poll response.");
                        nextBtn.click();
                        return; // End the process here for polls
                    }
                }

                // Handle the next question or submission
                const handleNextQuestion = async () => {
                    // Wait for UI to update
                    await new Promise(resolve => setTimeout(resolve, 1500));

                    if (this.isQuestionTabActive()) {
                        console.log("AssessmentHelper: Processing next question...");
                        answerContainer.style.display = "none";
                        answerContainer.classList.remove("show");
                        this.isFetchingAnswer = false;
                        await this.processQuestion();
                        return true;
                    }
                    return false;
                };

                // Find all relevant buttons
                const allButtons = Array.from(document.querySelectorAll('button'));
                const nextQuestionButton = allButtons.find(btn =>
                    btn.textContent.trim().toLowerCase().includes('next question') ||
                    btn.textContent.trim() === 'Next' ||
                    btn.textContent.trim() === 'Continue'
                );

                const submitButton = allButtons.find(btn =>
                    btn.textContent.trim().toLowerCase().includes('submit') ||
                    btn.textContent.trim().toLowerCase().includes('check answer')
                );

                // Handle next question button
                if (nextQuestionButton) {
                    console.log("AssessmentHelper: Next question button found, clicking...");
                    const currentQuestionId = document.getElementById('question-text')?.textContent.trim();

                    // Store the current question before clicking next
                    const previousQuestion = this.currentQuestionText;

                    nextQuestionButton.click();

                    // Reset state for next question
                    answerContainer.style.display = "none";
                    answerContainer.classList.remove("show");
                    this.isFetchingAnswer = false;

                    // Wait for the next question to load
                    console.log("AssessmentHelper: Waiting for next question to load...");

                    const checkForNewQuestion = async () => {
                        // Wait for a short delay to allow the page to start loading
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        // Check for the question text element
                        const questionElement = document.getElementById('question-text');
                        if (!questionElement) {
                            console.log('AssessmentHelper: Question element not found yet...');
                            return false;
                        }

                        const newQuestionText = questionElement.textContent.trim();

                        // If we have a new question that's different from the previous one
                        if (newQuestionText && newQuestionText !== previousQuestion) {
                            console.log('AssessmentHelper: New question detected:', newQuestionText.substring(0, 50) + '...');
                            this.currentQuestionText = newQuestionText;
                            return true;
                        }

                        return false;
                    };

                    // Try checking for a new question a few times
                    for (let i = 0; i < 10; i++) {
                        if (await checkForNewQuestion()) {
                            // New question detected, process it
                            await this.processQuestion();
                            return;
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    console.error("AssessmentHelper: Timed out waiting for new question");
                    return;
                }
                // Handle submit button
                else if (submitButton) {
                    console.log("AssessmentHelper: Submit button found, clicking...");
                    submitButton.click();

                    // Wait for submission to process and next question to load
                    console.log("AssessmentHelper: Waiting for submission to process...");
                    await new Promise(resolve => setTimeout(resolve, 2500));

                    // Reset state for next question
                    answerContainer.style.display = "none";
                    answerContainer.classList.remove("show");
                    this.isFetchingAnswer = false;

                    // Process next question if we're still on a question tab
                    if (this.isQuestionTabActive()) {
                        console.log("AssessmentHelper: Processing next question after submission...");
                        await this.processQuestion();
                    } else {
                        // If not on question tab, look for completion buttons
                        try {
                            const allButtons = Array.from(document.querySelectorAll('button'));
                            const nextStepButton = allButtons.find(btn =>
                                (btn.textContent?.trim().toLowerCase().includes('next') ||
                                btn.textContent?.trim().toLowerCase().includes('continue') ||
                                btn.textContent?.trim().toLowerCase().includes('finish')) &&
                                !btn.disabled
                            );

                            if (nextStepButton) {
                                console.log("AssessmentHelper: Found next step button, clicking...");
                                nextStepButton.click();
                                // Check for next question after clicking next step
                                await new Promise(resolve => setTimeout(resolve, 1500));
                                if (this.isQuestionTabActive()) {
                                    await this.processQuestion();
                                }
                            } else {
                                // Check for page 2 button if no next step button found
                                const page2Button = allButtons.find(btn =>
                                    btn.getAttribute('aria-label') === 'Go to page 2' ||
                                    btn.textContent?.trim().toLowerCase().includes('page 2')
                                );

                                if (page2Button) {
                                    if (this.isQuestionTabActive()) {
                                        console.log("AssessmentHelper: Found Page 2 button, but we're on a question tab. Not clicking.");
                                    } else {
                                        console.log("AssessmentHelper: Found Page 2 button, clicking...");
                                        page2Button.click();
                                        await new Promise(resolve => setTimeout(resolve, 1500));
                                        if (this.isQuestionTabActive()) {
                                            await this.processQuestion();
                                        }
                                    }
                                } else {
                                    console.log("AssessmentHelper: No next step or page 2 button found.");

                                    // Final check for any next/continue button
                                    const anyNextButton = allButtons.find(btn =>
                                        (btn.textContent?.trim().toLowerCase().includes('next') ||
                                        btn.textContent?.trim().toLowerCase().includes('continue')) &&
                                        !btn.disabled
                                    );

                                    if (anyNextButton) {
                                        console.log("AssessmentHelper: Found a next/continue button, clicking...");
                                        anyNextButton.click();
                                        await new Promise(resolve => setTimeout(resolve, 1500));
                                        if (this.isQuestionTabActive()) {
                                            await this.processQuestion();
                                        }
                                    } else {
                                        console.log("AssessmentHelper: No further actions to take on this tab.");
                                    }
                                }
                            }
                        } catch (error) {
                            console.error("AssessmentHelper: Error handling next steps:", error);
                        }
                    }
                } else {
                    console.log("AssessmentHelper: No 'Next' or 'Try again' button found.");
                    answerContent.textContent = "Submit processed, but next step not found.";
                }
            } else {
                console.log("AssessmentHelper: Submit button not found after selecting option.");
                answerContent.textContent = "Error: Submit button not found.";
            }
          } else {
            console.log(`AssessmentHelper: Answer "${answer}" is not a valid option.`);
          }
        } catch (error) {
          console.error("Error during question processing:", error);
          if (answerContent) {
            answerContent.textContent = `Error: ${error.message}`;
            answerContent.style.color = "#ff6b6b";
          }
        } finally {
          this.isFetchingAnswer = false;
          const buttonTextSpan = document.getElementById('getAnswerButtonText');
          const loadingIndicator = document.getElementById('loadingIndicator');
          if (getAnswerButton) getAnswerButton.disabled = false;
          if (buttonTextSpan) buttonTextSpan.style.display = "block";
          if (loadingIndicator) loadingIndicator.style.display = "none";
        }
      });
    }
  } // End of setupEventListeners method

  // Add progress bar functionality
  addProgressBar() {
    // Create progress container if it doesn't exist
    let progressContainer = document.getElementById('progressContainer');
    if (!progressContainer) {
      progressContainer = document.createElement('div');
      progressContainer.id = 'progressContainer';
      progressContainer.style.width = '100%';
      progressContainer.style.height = '4px';
      progressContainer.style.background = 'rgba(255, 255, 255, 0.1)';
      progressContainer.style.borderRadius = '0';
      progressContainer.style.margin = '0';
      progressContainer.style.position = 'absolute';
      progressContainer.style.bottom = '0';
      progressContainer.style.left = '0';
      progressContainer.style.width = '100%';
      progressContainer.style.overflow = 'hidden';

      const progressBar = document.createElement('div');
      progressBar.id = 'progressBar';
      progressBar.style.height = '100%';
      progressBar.style.width = '0%';
      progressBar.style.background = '#2196f3'; // Start with blue
      progressBar.style.transition = 'width 0.5s ease-in-out, background 0.5s ease';
      progressBar.style.borderRadius = '2px';

      progressContainer.appendChild(progressBar);

      // Add the progress container to the launcher, before the getAnswerButton
      const launcher = document.getElementById('Launcher');
      const getAnswerButton = document.getElementById('getAnswerButton');
      if (launcher && getAnswerButton) {
        launcher.insertBefore(progressContainer, getAnswerButton);
      } else {
        console.warn('AssessmentHelper: Could not find launcher or getAnswerButton to append progress bar');
      }
    }

    // Initial tab check and progress update
    console.log("AssessmentHelper: Initial tab check on startup...");
    this.logStepperProgress();
    const activeStep = this.getActiveStep();
    if (activeStep) {
      console.log(`AssessmentHelper: Starting on step ${activeStep.stepNumber} (${activeStep.stepLabel})`);
    }

    // Update progress based on current stepper state
    this.updateProgressBar();
  }

  // Update progress bar based on current question and stepper state
  updateProgressBar() {
    const progressBar = document.getElementById('progressBar');
    if (!progressBar) {
      console.warn('AssessmentHelper: Progress bar element not found');
      return;
    }

    // Get stepper progress
    const steps = document.querySelectorAll('.MuiStep-root');
    let completedSteps = 0;
    // Only track first 3 steps for progress
    const maxStepsToTrack = 3;
    let totalSteps = Math.min(steps.length, maxStepsToTrack);
    let currentStep = null;

    steps.forEach((step, i) => {
      // Only count the first 3 steps
      if (i >= maxStepsToTrack) return;
      
      const isCompleted = step.querySelector('.Mui-completed');
      const isActive = step.querySelector('.Mui-active');

      if (isCompleted) completedSteps++;
      if (isActive) currentStep = i + 1;
    });

    // Calculate percentage (add 0.5 to the current step to show partial progress)
    let progressPercentage = 0;
    if (totalSteps > 0) {
      progressPercentage = Math.min(100,
        ((completedSteps + (currentStep ? 0.5 : 0)) / totalSteps) * 100
      );
    }

    // Update progress bar with smooth transition
    progressBar.style.transition = 'width 0.5s ease-in-out';
    progressBar.style.width = `${progressPercentage}%`;

    // Change color based on progress
    if (progressPercentage >= 100) {
      progressBar.style.background = '#4caf50'; // Green when complete
      this.playCompletionAnimation();
    } else if (progressPercentage > 50) {
      progressBar.style.background = '#ff9800'; // Orange when over 50%
    } else {
      progressBar.style.background = '#2196f3'; // Blue when less than 50%
    }

    console.log(`Assessment Progress: ${Math.round(progressPercentage)}% (Step ${currentStep || '?'} of ${totalSteps})`);
  }

  // Play completion animation when all questions are answered
  playCompletionAnimation() {
    if (this.completionAnimationPlayed) return;
    this.completionAnimationPlayed = true;
    
    const progressBar = document.getElementById('progressBar');
    if (!progressBar) return;
    
    // Add celebration effect
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    let currentColor = 0;
    
    // Rainbow color animation
    const colorInterval = setInterval(() => {
      progressBar.style.background = colors[currentColor];
      currentColor = (currentColor + 1) % colors.length;
    }, 200);
    
    // Pulse effect
    const pulseEffect = () => {
      anime({
        targets: progressBar,
        scale: [1, 1.05, 1],
        duration: 1000,
        easing: 'easeInOutQuad',
        loop: true
      });
    };
    
    // Start animations
    pulseEffect();
    
    // Stop animations after 5 seconds
    setTimeout(() => {
      clearInterval(colorInterval);
      anime.remove(progressBar);
      progressBar.style.background = '#4caf50';
      progressBar.style.transform = 'scale(1)';
      this.completionAnimationPlayed = false;
    }, 5000);
  }

  // Set up mutation observer to update progress when stepper changes
  setupStepperObserver() {
    if (!this.stepperObserver) {
      const stepper = document.querySelector('.MuiStepper-root');
      if (stepper) {
        this.stepperObserver = new MutationObserver((mutations) => {
          this.updateProgressBar();

          // Check if we've switched to the Respond tab
          const activeStep = this.getActiveStep();
          const currentTab = activeStep?.stepLabel?.toLowerCase() || '';

          if (currentTab === 'respond' && !this.isProcessingRespond) {
            console.log('AssessmentHelper: Switched to Respond tab, starting question processing...');
            this.isProcessingRespond = true;
            this.processQuestion().catch(error => {
              console.error('AssessmentHelper: Error in processQuestion:', error);
              this.isProcessingRespond = false;
            });
          } else if (currentTab !== 'respond') {
            // Reset the flag if we're not on the Respond tab
            this.isProcessingRespond = false;
          }
        });
        this.stepperObserver.observe(stepper, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class']
        });
      }
    }
    // Observer is already set up above, no need to set it up again
  }

  /**
   * Handles the next question button click and waits for the next question to load
   * @param {HTMLElement} nextQuestionButton - The next question button element
   * @param {HTMLElement} answerContainer - The answer container element to hide
   */
  async handleNextQuestion(nextQuestionButton, answerContainer) {
    if (!nextQuestionButton) return;

    // Get the current question counter state if it exists
    const questionCounter = document.querySelector('p[class*="jss"][aria-hidden="true"]');
    let initialCounterState = questionCounter ? questionCounter.textContent.trim() : null;

    console.log("AssessmentHelper: Next question button found, clicking...");
    nextQuestionButton.click();

    // Wait for the next question to load with a more robust check
    console.log("AssessmentHelper: Waiting for next question to load...");

    // Initial wait
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check for loading indicators, question elements, or counter update
    let attempts = 0;
    const maxAttempts = 10; // 10 attempts * 500ms = max 5 seconds wait
    let nextQuestionLoaded = false;

    while (attempts < maxAttempts && !nextQuestionLoaded) {
      // Check if we can find elements that indicate the next question is loaded
      const questionElements = document.querySelectorAll('.question-text, [role="question"], .question');
      const answerOptions = document.querySelectorAll('.answer-option, [role="option"], .option');

      // Check if the question counter has updated
      const currentCounter = questionCounter ? questionCounter.textContent.trim() : null;
      const counterUpdated = initialCounterState && currentCounter && currentCounter !== initialCounterState;

      if (questionElements.length > 0 || answerOptions.length > 0 || counterUpdated) {
        console.log("AssessmentHelper: Next question loaded successfully");
        nextQuestionLoaded = true;

        // Add a 1-second delay after detecting the new question
        console.log("AssessmentHelper: Waiting 1 second before continuing...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        break;
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    if (!nextQuestionLoaded) {
      console.warn("AssessmentHelper: Next question did not load within expected time");
    }

    // Reset state for next question
    if (answerContainer) {
        answerContainer.style.display = "none";
        answerContainer.classList.remove("show");
    }
    this.isFetchingAnswer = false;

    // Process next question if we're still on a question tab
    if (this.isQuestionTabActive()) {
        console.log("AssessmentHelper: Processing next question...");
        await this.processQuestion();
    }
  }

  // Start the question processing loop
  async startQuestionProcessing() {
    try {
      // Process the current question
      const result = await this.processQuestion();

      // If we're on the Respond tab, set up a mutation observer to detect when the answer is submitted
      // and the next question appears
      const activeStep = this.getActiveStep();
      const currentTab = activeStep?.stepLabel?.toLowerCase() || '';

      if (currentTab === 'respond') {
        console.log('AssessmentHelper: Setting up observer for next question...');

        // Set up a mutation observer to watch for changes in the question container
        const questionContainer = document.querySelector('.question-text, [role="question"], .question')?.parentElement;
        if (questionContainer) {
          const observer = new MutationObserver(async (mutations) => {
            // Check if the question text has changed
            const questionChanged = mutations.some(mutation =>
              mutation.type === 'childList' ||
              (mutation.type === 'characterData' && mutation.target.textContent.trim() !== '')
            );

            if (questionChanged) {
              console.log('AssessmentHelper: Detected question change, processing new question...');
              observer.disconnect(); // Stop observing to avoid multiple triggers
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for UI to update
              await this.startQuestionProcessing(); // Process the new question
            }
          });

          // Start observing the question container for changes
          observer.observe(questionContainer, {
            childList: true,
            subtree: true,
            characterData: true
          });
        }
      }

      return result;
    } catch (error) {
      console.error("Error in question processing loop:", error);
      throw error;
    }
  }

  isQuestionTabActive() {
    const activeStep = this.getActiveStep();
    return activeStep ? activeStep.isQuestionTab() : false;
}

  writeTinyMCE(text, retries = 5) {
    // Wait a moment for the editor to initialize
    setTimeout(() => {
        // 1. Locate the dynamic TinyMCE iframe
        const iframe = document.querySelector('iframe[id*="tiny-react"][id$="_ifr"]');
        if (!iframe) {
            if (retries > 0) {
                console.log(`Retrying to find TinyMCE iframe... (${retries} retries left)`);
                return this.writeTinyMCE(text, retries - 1);
            }
            return console.error("❌ TinyMCE iframe not found after multiple retries.");
        }

        // 2. Access the internal document
        const doc = iframe.contentDocument || iframe.contentWindow.document;

        // 3. Find the editable TinyMCE <body>
        const editorBody =
            doc.querySelector('body#tinymce') ||
            doc.querySelector('body.mce-content-body') ||
            doc.querySelector('body[contenteditable="true"]');

        if (!editorBody) return console.error("❌ TinyMCE editor body not found.");

        // 4. Remove placeholder content if any
        editorBody.removeAttribute("data-mce-placeholder");
        editorBody.removeAttribute("aria-placeholder");

        const bogus = editorBody.querySelector('br[data-mce-bogus]');
        if (bogus) bogus.remove();

        // 5. Focus and insert text
        editorBody.focus();
        const ok = doc.execCommand("insertText", false, text);

        // 6. Fallback if execCommand fails
        if (!ok) {
            editorBody.innerHTML = `<p>${text}</p>`;
        }

        console.log("✅ Text inserted and placeholder removed.");
    }, 1000); // Initial 1-second delay
  }

  async handleRespondTab() {
    try {
      console.log('AssessmentHelper: Starting to process response tab...');

      // Get the question content
      const content = await this.fetchArticleContent();
      if (!content) {
        console.log('AssessmentHelper: No content found');
        return;
      }
      
      console.log('AssessmentHelper: Content fetched successfully');
      // Process the content here...
      
    } catch (error) {
      console.error('AssessmentHelper: Error in handleRespondTab:', error);
    }
  }

  getActiveStep() {
    // Get all step elements
    const steps = Array.from(document.querySelectorAll('.MuiStep-root'));
    
    if (!steps.length) {
      console.log('Active Step: No steps found');
      return null;
    }

    // Find the active step by checking aria-current attribute
    let activeStep = null;
    let activeStepIndex = -1;
    
    steps.forEach((step, index) => {
      const button = step.querySelector('button.MuiStepButton-root');
      const isActive = button?.getAttribute('aria-current') === 'true';
      
      if (isActive) {
        activeStep = step;
        activeStepIndex = index;
      }
    });
    
    if (!activeStep) {
      console.log('Active Step: None');
      return null;
    }

    // Get the step number (1-based index)
    const stepNumber = activeStepIndex + 1;
    
    // Try to get the step label from the step's text content
    let stepLabel = '';
    
    // Method 1: Try to get from the step's text content
    const labelElement = activeStep.querySelector('.MuiStepLabel-label');
    if (labelElement) {
      stepLabel = labelElement.textContent?.trim() || '';
    }
    
    // Method 2: If still empty, try to get from the step button's aria-label
    if (!stepLabel) {
      const button = activeStep.querySelector('button.MuiStepButton-root');
      if (button) {
        const ariaLabel = button.getAttribute('aria-label') || '';
        // Extract just the label part (e.g., "Respond" from "Respond Step 3")
        const match = ariaLabel.match(/^(.+?)\s*step\s*\d+/i);
        if (match) {
          stepLabel = match[1].trim();
        }
      }
    }
    
    // Method 3: If still empty, use the step number as a fallback
    if (!stepLabel) {
      stepLabel = `Step ${stepNumber}`;
    }

    console.log(`Active Step: ${stepNumber} (${stepLabel})`);

    return { 
      stepNumber, 
      stepLabel,
      // Add a helper method to check if this is a question tab
      isQuestionTab: () => ['ready', 'respond'].includes(stepLabel.toLowerCase())
    };
  }

 logStepperProgress() {
  try {
    // Get all steps
    const steps = Array.from(document.querySelectorAll('.MuiStep-root'));
    
    if (!steps.length) {
      console.warn('No stepper steps found on the page');
      return;
    }

    console.group('📊 Stepper Progress');
    console.log(`Found ${steps.length} steps in the stepper`);

    let activeStepIndex = -1;
    const stepStatus = [];
    
    // First pass: Collect all step information
    steps.forEach((step, index) => {
      const button = step.querySelector('button.MuiStepButton-root');
      const isActive = button?.getAttribute('aria-current') === 'true';
      const isDisabled = button?.hasAttribute('disabled');
      const isCompleted = step.querySelector('.MuiStepIcon-root.Mui-completed') !== null;
      
      if (isActive) {
        activeStepIndex = index;
      }
      
      // Get step label
      let label = `Step ${index + 1}`;
      if (button) {
        const ariaLabel = button.getAttribute('aria-label') || '';
        const match = ariaLabel.match(/(.+?)\s*step\s*\d+/i);
        label = match ? match[1].trim() : 
               step.querySelector('.MuiStepLabel-label span')?.textContent?.trim() || 
               label;
      }

      stepStatus.push({
        index,
        label,
        isActive,
        isCompleted,
        isDisabled
      });
    });

    // Log each step's status
    stepStatus.forEach(step => {
      let status;
      if (step.isActive) {
        status = '🟢 Active';
      } else if (step.isCompleted) {
        status = '✅ Completed';
      } else if (step.isDisabled) {
        status = '⛔ Disabled';
      } else {
        status = '⏳ Pending';
      }
      
      console.log(`#${step.index + 1} ${step.label}: ${status}`);
    });

    // Log summary
    if (activeStepIndex !== -1) {
      console.log(`\n🔍 Current active step: #${activeStepIndex + 1} (${stepStatus[activeStepIndex].label})`);
    } else if (stepStatus.every(step => step.isCompleted)) {
      console.log('\n🏁 All steps completed!');
    } else {
      console.log('\nℹ️ No active step detected');
    }

    // Return the step status for programmatic use
    const result = {
      totalSteps: steps.length,
      activeStep: activeStepIndex,
      steps: stepStatus,
      isComplete: stepStatus.every(step => step.isCompleted)
    };

    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error in logStepperProgress:', error);
    console.groupEnd();
    return {
      error: error.message,
      totalSteps: 0,
      activeStep: -1,
      steps: [],
      isComplete: false
    };
  }
}

  async processQuestion() {
    const activeStep = this.getActiveStep();
    const currentTab = activeStep?.stepLabel?.toLowerCase() || '';

    console.log(`AssessmentHelper: Processing question on ${currentTab} tab...`);

    // Special handling for Ready tab (polls and text questions)
    if (currentTab === 'ready') {
      console.log('AssessmentHelper: Processing Ready tab...');
      
      // First check for radio button polls
      const pollOptions = document.querySelectorAll('input[type="radio"], .MuiFormGroup-root input[type="radio"], .MuiRadio-root input[type="radio"]');
      if (pollOptions.length > 0) {
        console.log(`AssessmentHelper: Found ${pollOptions.length} poll options...`);
        
        // Find the first unchecked option
        const uncheckedOption = Array.from(pollOptions).find(opt => !opt.checked);
        if (uncheckedOption) {
          console.log('AssessmentHelper: Selecting a poll option...');
          uncheckedOption.click();
          console.log('AssessmentHelper: Selected a poll option');
          
          // Try to find and click the submit/next button
          setTimeout(() => {
            const submitButton = Array.from(document.querySelectorAll('button, [role="button"]')).find(btn => {
              const btnText = btn.textContent?.toLowerCase() || '';
              return (btnText.includes('submit') || btnText.includes('next')) && 
                     !btn.disabled && 
                     window.getComputedStyle(btn).display !== 'none';
            });
            
            if (submitButton) {
              console.log('AssessmentHelper: Clicking submit/next button...');
              submitButton.click();
            } else {
              console.log('AssessmentHelper: No enabled submit/next button found');
            }
          }, 500); // Small delay to ensure the radio button is registered
        } else {
          console.log('AssessmentHelper: All poll options already selected');
        }
      } 
      // Check for text input questions (TinyMCE editor)
      else {
        const tinyMceIframe = document.querySelector('iframe[id*="tiny-react"][id$="_ifr"], iframe[src*="tinymce"]');
        if (tinyMceIframe) {
          console.log('AssessmentHelper: Found text input question on Ready tab...');
          // Use the writeTinyMCE method to input a response
          this.writeTinyMCE("This could be recycled or repurposed instead of being thrown away.");
          
          // Look for submit button after a longer delay to ensure text is inserted
          setTimeout(() => {
            const submitButton = Array.from(document.querySelectorAll('button, [role="button"]')).find(btn => {
              const btnText = btn.textContent?.toLowerCase() || '';
              return (btnText.includes('submit') || btnText.includes('next')) && 
                     !btn.disabled && 
                     window.getComputedStyle(btn).display !== 'none';
            });
            
            if (submitButton) {
              console.log('AssessmentHelper: Submitting response');
              submitButton.click();
            } else {
              console.log('AssessmentHelper: No submit button found after text input');
            }
          }, 2000); // Increased delay to 2 seconds
        } else {
          console.log('AssessmentHelper: No recognizable input found on Ready tab');
          // Try to find any interactive elements that might be clickable
          const clickableItems = document.querySelectorAll('button, [role="button"], [tabindex="0"]');
          console.log(`AssessmentHelper: Found ${clickableItems.length} potentially clickable items`);
        }
      }
      return;
    }

    // Rest of your existing code for other tabs...
    if (currentTab === 'read') {
      console.log('AssessmentHelper: On Read tab, attempting auto-proceed...');
      
      // First check for pagination and click page 2
      const pagination = document.querySelector('[aria-label*="Amount of Pages"]');
      if (pagination && pagination.getAttribute('aria-label').includes('2')) {
        const page2Button = Array.from(pagination.querySelectorAll('button'))
          .find(btn => btn.getAttribute('aria-label') === 'Go to page 2');
        if (page2Button) {
          console.log('AssessmentHelper: Found pagination, clicking page 2...');
          page2Button.click();
          
          // Wait for page 2 to load, then look for Next button
          setTimeout(() => {
            const nextButton = Array.from(document.querySelectorAll('button.MuiButton-containedPrimary, button.MuiButton-root, button'))
              .find(btn => btn.textContent?.trim().toLowerCase() === 'next');
            if (nextButton) {
              console.log('AssessmentHelper: Found and clicking Next button after page 2');
              nextButton.click();
            } else {
              console.log('AssessmentHelper: No Next button found after page 2');
            }
          }, 1000);
          return;
        }
      }
      
      // Try to find and click the Close button first
      const closeButton = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent?.trim().toLowerCase() === 'close'
      );
      if (closeButton) {
        console.log('AssessmentHelper: Found and clicking Close button');
        closeButton.click();
        // Wait a bit then look for Next button
        setTimeout(() => {
          const nextButton = Array.from(document.querySelectorAll('button.MuiButton-containedPrimary, button.MuiButton-root, button'))
            .find(btn => btn.textContent?.trim().toLowerCase() === 'next');
          if (nextButton) {
            console.log('AssessmentHelper: Found and clicking Next button');
            nextButton.click();
          }
        }, 500);
      } else {
        // Try to find and click the Next button directly
        const nextButton = Array.from(document.querySelectorAll('button.MuiButton-containedPrimary, button.MuiButton-root, button'))
          .find(btn => btn.textContent?.trim().toLowerCase() === 'next');
        if (nextButton) {
          console.log('AssessmentHelper: Found and clicking Next button');
          nextButton.click();
        }
      }
      return;
    }

    // Original question processing for other tabs
    if (this.isQuestionTabActive() || currentTab === 'respond') {
      try {
        const content = await this.fetchArticleContent();
        if (!content) {
          console.log('AssessmentHelper: No question content found');
          return;
        }
        const answer = await this.fetchAnswer(content);

        // Rest of your existing question processing logic
        const answerContent = document.getElementById("answerContent");
        if (answerContent) {
          answerContent.textContent = answer;
          answerContent.style.display = "flex";
          answerContent.style.visibility = "visible";
          answerContent.classList.add("show");
        }

        // Select the answer option
        const trimmedAnswer = answer.trim().toUpperCase();
        const options = document.querySelectorAll('input[type="radio"], [role="radio"]');
        let optionSelected = false;
        console.log(`AssessmentHelper: Looking for option matching answer '${trimmedAnswer}'`);

        for (const option of options) {
          // Use an async IIFE to handle the async operations
          (async () => {
            try {
              // Try multiple ways to get the option text
              let label = '';
              
              // Try different selectors to find the label text
              const labelElement = option.closest('label');
              if (labelElement) {
                // Try common class names and direct text content
                label = labelElement.querySelector('.MuiTypography-body1, .MuiFormControlLabel-label, [data-qa="answer-text"]')?.textContent?.trim() || 
                        labelElement.textContent.trim();
              }
              
              // If we still don't have a label, try looking at sibling elements
              if (!label) {
                const siblingText = option.nextElementSibling?.textContent?.trim() || 
                                  option.previousElementSibling?.textContent?.trim();
                if (siblingText) {
                  label = siblingText;
                }
              }
              
              console.log(`Option label text: '${label}'`);
              
              // Try different matching strategies
              const normalizedLabel = (label || '').toUpperCase().trim();
              const isMatch = 
                normalizedLabel === trimmedAnswer || // Exact match
                normalizedLabel.startsWith(trimmedAnswer + '.') || // Matches "A."
                normalizedLabel.startsWith(trimmedAnswer + ')') || // Matches "A)"
                normalizedLabel.startsWith(trimmedAnswer + ' ') || // Matches "A "
                normalizedLabel.endsWith(' ' + trimmedAnswer) || // Ends with the answer
                normalizedLabel.includes(' ' + trimmedAnswer + ' '); // Contains the answer as a whole word
              
              if (isMatch) {
                console.log(`Matched option by label: ${label}`);
                option.click();
                console.log(`AssessmentHelper: Clicked option for "${trimmedAnswer}"`);
                optionSelected = true;
                
                // Add a small delay to ensure the selection is registered
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Find and click the submit button
                const submitButton = Array.from(document.querySelectorAll('button')).find(btn => {
                  const btnText = btn.textContent?.toLowerCase() || '';
                  return btnText.includes('submit') || btnText.includes('check answer') || btnText.includes('next');
                });

                if (submitButton) {
                  console.log('AssessmentHelper: Found submit button, clicking...');
                  submitButton.click();
                  
                  // Wait for submission to process
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  
                  // Check if we're still on the same page or moved to next question
                  if (this.isQuestionTabActive()) {
                    // Process next question
                    console.log('AssessmentHelper: Processing next question...');
                    await this.processQuestion();
                  }
                } else {
                  console.log('AssessmentHelper: No submit button found after selecting answer');
                }
              }
            } catch (error) {
              console.error('Error processing option:', error);
            }
          })();
        }

        if (!optionSelected) {
          console.log(`AssessmentHelper: Could not find matching option for answer: ${trimmedAnswer}`);
          return null;
        }

        return answer;
      } catch (error) {
        console.error('AssessmentHelper: Error in processQuestion:', error);
        return null;
      }
    } else {
      console.log('AssessmentHelper: Not on a question tab, skipping question processing');
      return null;
    }
  }
}

// Create an instance of the AssessmentHelper to start the UI
const assessmentHelper = new AssessmentHelper();
