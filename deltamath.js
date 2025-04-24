/**
 * DeltaMath UI Helper (KaTeX + jQuery UI Draggable + Animations)
 *
 * This script creates a floating UI for the DeltaMath Answer Extractor.
 * It displays extracted answers, rendered using KaTeX, in a draggable panel.
 * It dynamically loads KaTeX, jQuery, and jQuery UI (Draggable) if not already present.
 * Includes enhanced dragging using jQuery UI Draggable and UI animations.
 */

// --- Library Loaders ---
// Function to load KaTeX if it's not already loaded
function loadKaTeXScript() {
    if (typeof window.katex === 'undefined') {
      console.log('KaTeX not found. Loading from CDN...');
  
      // Load KaTeX CSS
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
      document.head.appendChild(cssLink);
  
      // Load KaTeX JS
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
      script.async = true;
      script.onload = () => {
        console.log('KaTeX script loaded.');
      };
      script.onerror = () => {
        console.error('Failed to load KaTeX script.');
      };
      document.head.appendChild(script);
  
       // Load KaTeX auto-render extension (optional, but helpful for rendering delimiters automatically)
       // This script needs to load AFTER the main katex.js
       const autoRenderScript = document.createElement('script');
       autoRenderScript.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js';
       autoRenderScript.async = true;
       autoRenderScript.onload = () => {
           console.log('KaTeX auto-render loaded.');
       };
       autoRenderScript.onerror = () => {
           console.warn('Failed to load KaTeX auto-render script. Automatic rendering of delimiters might not work.');
       };
       script.parentNode.insertBefore(autoRenderScript, script.nextSibling); // Insert after katex.js
  
    } else {
      console.log('KaTeX already loaded.');
    }
  }
  
  // Function to load jQuery if it's not already loaded
  function loadJQueryScript() {
      if (typeof window.jQuery === 'undefined') {
          console.log('jQuery not found. Loading from CDN...');
          const script = document.createElement('script');
          script.src = 'https://code.jquery.com/jquery-3.6.0.min.js'; // Use a recent version
          script.async = true;
          script.onload = () => {
              console.log('jQuery script loaded.');
              // Load jQuery UI after jQuery is loaded
              loadJQueryUIScript();
          };
          script.onerror = () => {
              console.error('Failed to load jQuery script.');
          };
          document.head.appendChild(script);
      } else {
          console.log('jQuery already loaded.');
          // If jQuery is already loaded, check and load jQuery UI
          loadJQueryUIScript();
      }
  }
  
  // Function to load jQuery UI (Draggable) if it's not already loaded
  function loadJQueryUIScript() {
      // Check for a jQuery UI component that indicates Draggable is available
      if (typeof $.ui === 'undefined' || typeof $.ui.draggable === 'undefined') {
          console.log('jQuery UI Draggable not found. Loading from CDN...');
          const script = document.createElement('script');
          script.src = 'https://code.jquery.com/ui/1.13.2/jquery-ui.min.js'; // Use a recent version
          script.async = true;
          script.onload = () => {
              console.log('jQuery UI script loaded.');
          };
          script.onerror = () => {
              console.error('Failed to load jQuery UI script.');
          };
           // Load jQuery UI CSS (optional but recommended for default styling)
          const cssLink = document.createElement('link');
          cssLink.rel = 'stylesheet';
          cssLink.href = 'https://code.jquery.com/ui/1.13.2/themes/base/jquery-ui.css'; // Use a basic theme
          document.head.appendChild(cssLink);
  
          document.head.appendChild(script);
      } else {
          console.log('jQuery UI Draggable already loaded.');
      }
  }
  
  
  // --- Data Extraction ---
  // Function to extract answers from DeltaMath problems
  window.extractDeltaMathAnswers = function extractDeltaMathAnswers() {
    // Create an object to store all answers
    const answers = {};
  
    // Try to access DeltaMath's internal data structures first
    try {
      // Method 1: Try to access the problem data directly from DeltaMath's global objects
      if (window.dmProblem && window.dmProblem.problem) {
        answers['problemData'] = window.dmProblem.problem;
  
        // Extract correct answer if available (might be LaTeX or plain text)
        if (window.dmProblem.problem.correctAnswer) {
          answers['correctAnswer'] = window.dmProblem.problem.correctAnswer;
        }
  
        // Extract problem ID and other metadata
        if (window.dmProblem.problem.id) {
          answers['problemId'] = window.dmProblem.problem.id;
        }
      }
    } catch (e) {
      console.warn('Error accessing DeltaMath internal data:', e);
    }
  
    // Check for text answers in standard input fields
    const textInputs = document.querySelectorAll('input[type="text"]');
    if (textInputs.length > 0) {
      answers['textInputs'] = {};
      textInputs.forEach((input, index) => {
        const key = input.id || input.name || `textInput${index}`;
        // Keep original value, replace unicode minus if needed
        answers['textInputs'][key] = input.value.replace(/−/g, "-");
      });
    }
  
    // Check for multiple choice answers
    const radioInputs = document.querySelectorAll('input[type="radio"]:checked');
    if (radioInputs.length > 0) {
      answers['multipleChoice'] = {};
      radioInputs.forEach((radio, index) => {
        const key = radio.name || `option${index}`;
        answers['multipleChoice'][key] = radio.value; // Usually plain text value
      });
    }
  
    // Check for KaTeX display elements (specifically looking for the katex-display class)
    const katexDisplayElements = document.querySelectorAll('.katex-display');
    if (katexDisplayElements.length > 0) {
      answers['katexDisplays'] = {};
      katexDisplayElements.forEach((katexEl, index) => {
        try {
          // Try to extract LaTeX content
          let latex = "";
  
          // Look for annotation element which contains the original LaTeX
          const annotation = katexEl.querySelector('annotation[encoding="application/x-tex"]');
          if (annotation) {
            latex = annotation.textContent.trim();
          } else {
            // Fallback: try to get from the rendered content - less reliable for pure LaTeX
            // This might capture the visually rendered text, not the source LaTeX
            // Consider if a data-attribute or other source is available if annotation fails
            console.warn('KaTeX annotation not found, attempting to extract from textContent for:', katexEl);
            latex = katexEl.textContent.trim(); // Less ideal, might not be pure LaTeX
          }
  
          if (latex) {
            const key = `katexDisplay${index}`;
            // Store ONLY the LaTeX source
            answers['katexDisplays'][key] = {
              latex: latex
            };
          }
        } catch (e) {
          console.warn('Error extracting KaTeX display:', e);
        }
      });
    }
  
    // Check for MathQuill fields (math input)
    const mqElements = document.querySelectorAll('.mathquill-editable, .mq-editable-field, .mq-root-block, .mq-math-mode');
    if (mqElements.length > 0) {
      answers['mathInputs'] = {};
      mqElements.forEach((mqEl, index) => {
        try {
          let latex = "";
  
          // --- Improved MathQuill Extraction Logic ---
          // Prioritize data attributes which are often set directly
          if (mqEl.dataset && mqEl.dataset.latex) {
              latex = mqEl.dataset.latex;
          } else if (mqEl.dataset && mqEl.dataset.math) {
               latex = mqEl.dataset.math;
          } else if (mqEl.dataset && mqEl.dataset.content) {
               latex = mqEl.dataset.content;
          }
          // Check for jQuery and its data method safely
          else if (typeof $ !== 'undefined' && $(mqEl).data('mathquill-latex')) {
              latex = $(mqEl).data('mathquill-latex');
          }
          // Safely attempt to use the MathQuill API if available and getInterface exists
          else if (window.MathQuill && typeof window.MathQuill.getInterface === 'function') {
              const MQ = window.MathQuill.getInterface(2);
              if (MQ && typeof MQ.data === 'function') {
                  const mathField = MQ.data(mqEl);
                  if (mathField && typeof mathField.latex === 'function') {
                      latex = mathField.latex();
                  }
              }
          }
          // Fallback to text content as a last resort
          else {
              latex = mqEl.textContent.trim();
               if (latex) {
                   console.warn('MathQuill data attributes and API failed, falling back to textContent for:', mqEl);
               }
          }
          // --- End of Improved Logic ---
  
  
          if (latex) {
            latex = latex.replace(/−/g, "-").trim(); // Clean up unicode minus
            const key = mqEl.id || `mathInput${index}`;
            // Store ONLY the LaTeX source
            answers['mathInputs'][key] = {
              latex: latex
            };
          }
        } catch (e) {
          console.warn('Error extracting MathQuill field:', e);
          // Log the element to help diagnose issues
          console.warn('Element causing error:', mqEl);
        }
      });
    }
  
      // Check for select dropdowns
      const selectElements = document.querySelectorAll('select');
      if (selectElements.length > 0) {
          answers['selectInputs'] = {};
          selectElements.forEach((select, index) => {
              const key = select.id || select.name || `selectInput${index}`;
              // Store the value of the selected option
              answers['selectInputs'][key] = select.value;
          });
      }
  
  
    // Get problem statement
    const problemStatement = document.querySelector('.problem-statement, .problem-text, .problem-description, #problemPrompt');
    if (problemStatement) {
      // Extract raw innerHTML to preserve potential embedded math elements (KaTeX/MathJax)
      const rawHTML = problemStatement.innerHTML;
      const textContent = problemStatement.textContent.trim(); // Also get plain text
  
      answers['problemStatement'] = {
        html: rawHTML, // Store HTML to render math correctly
        text: textContent // Store plain text as fallback/reference
      };
    }
  
    // Format the answers for better structure
    const formattedAnswers = {
      problem: {},
      answers: {}
    };
  
    // Add problem statement
    if (answers.problemStatement) {
      formattedAnswers.problem = answers.problemStatement; // Keep both html and text
    } else {
      formattedAnswers.problem = {
        html: "Problem statement not found",
        text: "Problem statement not found"
      };
    }
  
    // Add detected answers to the formatted object
    // Store the raw value, which might be LaTeX or plain text
    if (answers.correctAnswer) {
      formattedAnswers.answers.correct = answers.correctAnswer;
    }
  
    if (answers.textInputs && Object.keys(answers.textInputs).length > 0) {
      formattedAnswers.answers.text = answers.textInputs;
    }
  
    if (answers.multipleChoice && Object.keys(answers.multipleChoice).length > 0) {
      formattedAnswers.answers.multipleChoice = answers.multipleChoice;
    }
  
    // Store only the LaTeX from math inputs
    if (answers.mathInputs && Object.keys(answers.mathInputs).length > 0) {
      formattedAnswers.answers.math = {};
        for (const [key, value] of Object.entries(answers.mathInputs)) {
            if (value.latex) {
              formattedAnswers.answers.math[key] = value.latex; // Store raw LaTeX string
            }
        }
    }
  
    // Store only the LaTeX from KaTeX displays
    if (answers.katexDisplays && Object.keys(answers.katexDisplays).length > 0) {
        formattedAnswers.answers.katexDisplays = {};
        for (const [key, value] of Object.entries(answers.katexDisplays)) {
            if (value.latex) {
              formattedAnswers.answers.katexDisplays[key] = value.latex; // Store raw LaTeX string
            }
            }
    }
  
      // Add select input values
      if (answers.selectInputs && Object.keys(answers.selectInputs).length > 0) {
          formattedAnswers.answers.select = answers.selectInputs;
      }
  
  
    return formattedAnswers;
  }
  
  
  // --- UI Class ---
  // Global variable to track UI instance
  window.deltaUIInstance = null;
  
  class DeltaMathUI {
      constructor() {
          // Check if an instance already exists and remove it
          if (window.deltaUIInstance) {
              console.log('Existing DeltaMathUI instance found. Removing it before creating a new one.');
              this.cleanupExistingUI();
          }
  
          this.isDragging = false;
          this.currentX = 0;
          this.currentY = 0;
          this.initialX = 0;
          this.initialY = 0;
          this.xOffset = 0;
          this.yOffset = 0;
          this.cachedArticle = null; // To store formatted problem for API
  
          // Store reference to the extractDeltaMathAnswers function
          this.extractAnswers = window.extractDeltaMathAnswers || extractDeltaMathAnswers;
  
          // Register this instance as the current one
          window.deltaUIInstance = this;
  
          // Load KaTeX, jQuery, and jQuery UI scripts asynchronously
          loadKaTeXScript();
          loadJQueryScript(); // Load jQuery and then jQuery UI
  
          // Initialize UI after the DOM is ready
          if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', () => this.init());
          } else {
              this.init();
          }
      }
  
      init() {
          this.itemMetadata = {
              UI: this.createUI(),
              answerUI: this.createAnswerUI()
          };
          this.initializeUI();
      }
  
      createUI() {
          const container = document.createElement("div");
          const launcher = document.createElement("div");
          launcher.id = "Launcher";
          launcher.className = "Launcher";
          // Initial positioning uses top and left calculated later by setInitialPositions
          // Added box-sizing for consistency
          launcher.style.cssText = "outline: none;min-height: 160px;opacity: 1;font-family: 'Nunito', sans-serif;width: 180px;height: 240px;background: #1c1e2b;position: fixed;border-radius: 12px;display: flex;flex-direction: column;align-items: center;color: white;font-size: 16px;z-index: 99999;padding: 16px;box-shadow: 0 4px 8px rgba(0,0,0,0.2);overflow: hidden;white-space: nowrap; transition: transform 0.3s ease-out, opacity 0.3s ease-out, box-shadow 0.3s ease-out; box-sizing: border-box;";
  
          const dragHandle = document.createElement("div");
          dragHandle.className = "drag-handle";
          dragHandle.style.cssText = "width: 100%;height: 24px;cursor: move;background: rgba(255,255,255,0.05);position: absolute;top: 0;left: 0;border-top-left-radius: 12px;border-top-right-radius: 12px;display: flex;justify-content: center;align-items: center;";
  
          const dragIndicator = document.createElement("div");
          dragIndicator.style.cssText = "width: 40px;height: 4px;background: rgba(255,255,255,0.3);border-radius: 2px;margin-top: 4px;";
          dragHandle.appendChild(dragIndicator);
  
          const img = document.createElement("img");
          // Use the provided image URL
          img.src = "https://diverse-observations-vbulletin-occasional.trycloudflare.com/static/images/example.png";
          img.alt = "DeltaMath Helper";
          img.style.cssText = "width: 90px;height: 90px;margin-top: 32px;border-radius: 50%;";
          // Add error handler for image
            img.onerror = () => { img.src = 'https://placehold.co/90x90/1c1e2b/ffffff?text=Error'; };
  
  
          const closeButton = document.createElement("button");
          closeButton.id = "closeButton";
          // Added hover effect
          closeButton.style.cssText = "position: absolute;top: 8px;right: 8px;background: none;border: none;color: white;font-size: 18px;cursor: pointer;padding: 2px 8px; transition: color 0.2s ease-in-out;";
           closeButton.onmouseover = function() { this.style.color = '#ff6b6b'; };
           closeButton.onmouseout = function() { this.style.color = 'white'; };
          closeButton.textContent = "×";
          closeButton.setAttribute('aria-label', 'Close Launcher');
  
  
          const combinedButton = document.createElement("button");
          combinedButton.id = "combinedButton";
          // Added hover and active effects
          combinedButton.style.cssText = "background: #2c2e3b;border: none;color: white;padding: 12px 20px;border-radius: 8px;cursor: pointer;margin-top: 24px;width: 120px;height: 44px;font-size: 16px;transition: background 0.2s ease, transform 0.1s ease-out;";
          combinedButton.onmouseover = function() { this.style.background = '#3a3d4d'; };
          combinedButton.onmouseout = function() { this.style.background = '#2c2e3b'; };
          combinedButton.onmousedown = function() { this.style.transform = 'scale(0.98)'; };
          combinedButton.onmouseup = function() { this.style.transform = 'scale(1)'; };
          combinedButton.textContent = "Get Answer";
  
  
          const version = document.createElement("div");
          version.style.cssText = "position: absolute;bottom: 8px;right: 8px;font-size: 12px;opacity: 0.5;";
          version.textContent = "1.1-KTX"; // Indicate KaTeX version
  
          launcher.appendChild(dragHandle);
          launcher.appendChild(img);
          launcher.appendChild(closeButton);
          launcher.appendChild(combinedButton);
          launcher.appendChild(version);
          container.appendChild(launcher);
  
          return container;
      }
  
      createAnswerUI() {
          const container = document.createElement("div");
          const answerContainer = document.createElement("div");
          answerContainer.id = "answerContainer";
          answerContainer.className = "answerLauncher";
           // Initial positioning uses top and left calculated later by setInitialPositions
           // Added box-sizing for consistency
          answerContainer.style.cssText = "outline: none;min-height: 60px;opacity: 1;font-family: 'Nunito', sans-serif;width: 250px;height: auto;max-height: 300px;background: #1c1e2b;position: fixed;border-radius: 8px;color: white;font-size: 16px;z-index: 99998;padding: 8px;box-shadow: 0 4px 8px rgba(0,0,0,0.2);overflow: auto;white-space: normal;display: none; flex-direction: column; align-items: center; transition: transform 0.3s ease-out, opacity 0.3s ease-out, box-shadow 0.3s ease-out; box-sizing: border-box;"; // Initially hidden
  
          const answerDragHandle = document.createElement("div");
          answerDragHandle.className = "answer-drag-handle";
          answerDragHandle.style.cssText = "width: 100%;height: 24px;cursor: move;background: rgba(255,255,255,0.05);position: absolute;top: 0;left: 0;border-top-left-radius: 8px;border-top-right-radius: 8px;display: flex;justify-content: center;align-items: center;";
  
  
          const answerDragIndicator = document.createElement("div");
          answerDragIndicator.style.cssText = "width: 30px;height: 3px;background: rgba(255,255,255,0.3);border-radius: 2px;margin-top: 4px;";
          answerDragHandle.appendChild(answerDragIndicator);
  
          const closeAnswerButton = document.createElement("button");
          closeAnswerButton.id = "closeAnswerButton";
          // Added hover effect
          closeAnswerButton.style.cssText = "position: absolute;top: 8px;right: 8px;background: none;border: none;color: white;font-size: 18px;cursor: pointer;padding: 2px 8px; transition: color 0.2s ease-in-out;";
          closeAnswerButton.onmouseover = function() { this.style.color = '#ff6b6b'; };
          closeAnswerButton.onmouseout = function() { this.style.color = 'white'; };
          closeAnswerButton.textContent = "×";
          closeAnswerButton.setAttribute('aria-label', 'Close Answer Panel');
  
  
          const answerContent = document.createElement("div");
          answerContent.id = "answerContent";
          // Padding top adjusted for drag handle and buttons
          answerContent.style.cssText = "padding: 36px 12px 12px 12px; margin: 0;word-wrap: break-word;font-size: 14px;display: block; width: 100%;height: 100%;text-align: left;overflow-y: auto;user-select: text;-webkit-user-select: text;-moz-user-select: text;-ms-user-select: text;cursor: text;";
  
          // Add copy button (using modern clipboard API if available)
          const copyButton = document.createElement("button");
          copyButton.id = "copyAnswerButton";
           // Added hover and active effects
          copyButton.style.cssText = "position: absolute;top: 8px;right: 36px;background: none;border: none;color: white;font-size: 14px;cursor: pointer;padding: 2px 8px; transition: color 0.2s ease-in-out, transform 0.1s ease-out;";
          copyButton.onmouseover = function() { this.style.color = '#cccccc'; };
          copyButton.onmouseout = function() { this.style.color = 'white'; };
          copyButton.onmousedown = function() { this.style.transform = 'scale(0.98)'; };
          copyButton.onmouseup = function() { this.style.transform = 'scale(1)'; };
          copyButton.textContent = "Copy";
          copyButton.setAttribute('aria-label', 'Copy Answer');
  
          copyButton.addEventListener('click', () => {
              const contentElement = document.getElementById('answerContent');
              if (contentElement) {
                  const textToCopy = contentElement.innerText || contentElement.textContent; // Get text content
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(textToCopy).then(() => {
                          copyButton.textContent = "Copied!";
                          setTimeout(() => { copyButton.textContent = "Copy"; }, 1500);
                      }).catch(err => {
                          console.error('Failed to copy using navigator.clipboard:', err);
                          // Fallback to execCommand if necessary
                          this.fallbackCopyTextToClipboard(textToCopy, copyButton);
                      });
                  } else {
                      // Fallback for older browsers
                      this.fallbackCopyTextToClipboard(textToCopy, copyButton);
                  }
              }
          });
  
          answerContainer.appendChild(answerDragHandle);
          answerContainer.appendChild(closeAnswerButton);
          answerContainer.appendChild(copyButton); // Add copy button
          answerContainer.appendChild(answerContent);
          container.appendChild(answerContainer);
  
          return container;
      }
  
      // Fallback copy method using execCommand
      fallbackCopyTextToClipboard(text, buttonElement) {
          const textArea = document.createElement("textarea");
          textArea.value = text;
          // Avoid scrolling to bottom
          textArea.style.top = "0";
          textArea.style.left = "0";
          textArea.style.position = "fixed";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
              const successful = document.execCommand('copy');
              if (successful) {
                  buttonElement.textContent = "Copied!";
                  setTimeout(() => { buttonElement.textContent = "Copy"; }, 1500);
              } else {
                  console.error('Fallback copy: execCommand failed');
                  buttonElement.textContent = "Failed";
                  setTimeout(() => { buttonElement.textContent = "Copy"; }, 1500);
              }
          } catch (err) {
              console.error('Fallback copy: Error', err);
              buttonElement.textContent = "Error";
              setTimeout(() => { buttonElement.textContent = "Copy"; }, 1500);
          }
          document.body.removeChild(textArea);
      }
  
  
      cleanupExistingUI() {
          // Remove existing UI elements if they exist
          const existingLauncher = document.getElementById('Launcher');
          if (existingLauncher) {
              // If jQuery UI Draggable was initialized, destroy it before removing
              if (typeof $(existingLauncher).draggable === 'function') {
                   $(existingLauncher).draggable('destroy');
              }
              existingLauncher.remove(); // More modern way to remove element
          }
  
          const existingAnswerContainer = document.getElementById('answerContainer');
          if (existingAnswerContainer) {
               // If jQuery UI Draggable was initialized, destroy it before removing
              if (typeof $(existingAnswerContainer).draggable === 'function') {
                   $(existingAnswerContainer).draggable('destroy');
              }
              existingAnswerContainer.remove();
          }
          // Note: Event listeners on document/body added by drag handlers might persist
          // if not explicitly removed. A more robust cleanup would involve tracking
          // and removing those specific listeners.
      }
  
      initializeUI() {
          document.body.appendChild(this.itemMetadata.UI);
          document.body.appendChild(this.itemMetadata.answerUI);
  
          // Use requestAnimationFrame to ensure elements are in the DOM and rendered
          requestAnimationFrame(() => {
              if (this.itemMetadata.UI && this.itemMetadata.answerUI) {
                  // Calculate and set initial positions using top/left
                  this.setInitialPositions();
                  this.setupEventListeners();
                  this.setupDragging(); // New method to set up jQuery UI Draggable
              } else {
                  console.error("UI elements not found after appending.");
              }
          });
      }
  
      // Method to calculate and set initial top/left positions
      setInitialPositions() {
          const launcher = document.getElementById('Launcher');
          const answerContainer = document.getElementById('answerContainer');
  
          if (!launcher || !answerContainer) {
               console.error("UI elements not found for initial positioning.");
               return;
          }
  
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;
  
          // Calculate initial position for the Launcher (centered vertically, 20px from right)
          const launcherHeight = launcher.offsetHeight;
          const launcherWidth = launcher.offsetWidth;
          const initialLauncherTop = (viewportHeight / 2) - (launcherHeight / 2);
          const initialLauncherLeft = viewportWidth - launcherWidth - 20;
  
          launcher.style.position = 'fixed';
          launcher.style.top = initialLauncherTop + 'px';
          launcher.style.left = initialLauncherLeft + 'px';
          launcher.style.right = 'auto'; // Ensure right is not set
          launcher.style.transform = 'none'; // Ensure transform is not set
  
          // Calculate initial position for the Answer Container (centered vertically, 220px from right)
          const answerContainerHeight = answerContainer.offsetHeight;
          const answerContainerWidth = answerContainer.offsetWidth;
          const initialAnswerContainerTop = (viewportHeight / 2) - (answerContainerHeight / 2);
          const initialAnswerContainerLeft = viewportWidth - answerContainerWidth - 220;
  
          answerContainer.style.position = 'fixed';
          answerContainer.style.top = initialAnswerContainerTop + 'px';
          answerContainer.style.left = initialAnswerContainerLeft + 'px';
          answerContainer.style.right = 'auto'; // Ensure right is not set
          answerContainer.style.transform = 'none'; // Ensure transform is not set
  
          console.log("Initial UI positions set using top/left.");
      }
  
      // Method to set up jQuery UI Draggable
      setupDragging() {
           // Poll for jQuery and jQuery UI Draggable to be loaded before initializing
          const checkAndInitDraggable = (retriesLeft = 50) => { // Poll up to 5 seconds
              // Check if jQuery and jQuery UI Draggable are available
              if (typeof window.jQuery !== 'undefined' && typeof $.ui !== 'undefined' && typeof $.ui.draggable === 'function') {
                  console.log('jQuery UI Draggable loaded. Initializing dragging...');
                  try {
                      const launcher = document.getElementById('Launcher');
                      const answerContainer = document.getElementById('answerContainer');
                      const launcherDragHandle = launcher ? launcher.querySelector('.drag-handle') : null;
                      const answerDragHandle = answerContainer ? answerContainer.querySelector('.answer-drag-handle') : null;
  
                      if (launcher && launcherDragHandle) {
                          // Initialize jQuery UI Draggable for the launcher
                          $(launcher).draggable({
                              handle: launcherDragHandle,
                              containment: 'window', // Keep within the viewport
                               // Use drag events to manage user-select
                               start: function(event, ui) {
                                   document.body.style.userSelect = 'none';
                                   document.body.style.cursor = 'grabbing';
                               },
                               stop: function(event, ui) {
                                   document.body.style.userSelect = '';
                                   document.body.style.cursor = '';
                               }
                          });
                           console.log('jQuery UI Draggable initialized for Launcher.');
                      } else {
                          console.warn("Launcher or drag handle not found. Cannot initialize jQuery UI Draggable for Launcher.");
                      }
  
                      if (answerContainer && answerDragHandle) {
                          // Initialize jQuery UI Draggable for the answer container
                           $(answerContainer).draggable({
                              handle: answerDragHandle,
                              containment: 'window', // Keep within the viewport
                               // Use drag events to manage user-select
                               start: function(event, ui) {
                                   document.body.style.userSelect = 'none';
                                   document.body.style.cursor = 'grabbing';
                               },
                               stop: function(event, ui) {
                                   document.body.style.userSelect = '';
                                   document.body.style.cursor = '';
                               }
                          });
                          console.log('jQuery UI Draggable initialized for Answer Container.');
                      } else {
                          console.warn("Answer Container or drag handle not found. Cannot initialize jQuery UI Draggable for Answer Container.");
                      }
  
                  } catch (err) {
                      console.error('Error initializing jQuery UI Draggable:', err);
                  }
              } else if (retriesLeft > 0) {
                  console.log(`jQuery or jQuery UI Draggable not yet available, retrying initialization... (${retriesLeft} retries left)`);
                  setTimeout(() => checkAndInitDraggable(retriesLeft - 1), 100); // Check every 100ms
              } else {
                  console.warn('jQuery UI Draggable not available after multiple retries. Dragging will not be enabled.');
              }
          };
  
          // Start the polling for jQuery UI Draggable initialization
          checkAndInitDraggable();
      }
  
  
      async fetchAnswer(queryContent) {
          // Display loading state in answer panel
          const answerContent = document.getElementById('answerContent');
          const answerContainer = document.getElementById('answerContainer');
          if (answerContent && answerContainer) {
              answerContent.innerHTML = '<div>Loading answer...</div>';
              answerContainer.style.display = 'flex'; // Show panel while loading
          }
  
          try {
              console.log(`Sending POST request...`); // Avoid logging potentially sensitive queryContent directly
  
              const response = await fetch('https://diverse-observations-vbulletin-occasional.trycloudflare.com/ask', {
                  method: 'POST',
                  cache: 'no-cache',
                  headers: {
                      'Accept': 'application/json',
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                      // The prompt now asks for MathJax format
                      q: `${queryContent} Please format the answer ONLY using MathJax delimiters like $$...$$ or $...$ for mathematical expressions.`,
                      article: this.cachedArticle || null // Send formatted problem context
                  })
              });
  
              console.log(`Received response with status: ${response.status}`);
  
              if (!response.ok) {
                  const errorText = await response.text(); // Get error details if possible
                  console.error('API Error:', response.status, errorText);
                  throw new Error(`API request failed with status ${response.status}`);
              }
  
              const data = await response.json();
              console.log(`Received data.`); // Avoid logging potentially large/sensitive data
              return data.response || 'No answer provided by API.';
  
          } catch (error) {
              console.error('Error fetching answer:', error);
              // Display error in the answer panel
              if (answerContent) {
                  answerContent.innerHTML = `<div style="color: #ffcccc;">Error: ${error.message}</div>`;
              }
              return null; // Indicate failure
          }
      }
  
      // Function to process AI response (ensure MathJax delimiters if needed)
      // This might be less necessary if the AI consistently follows the prompt,
      // but good as a fallback.
      processAIResponse(response) {
          if (!response) return '';
  
          const trimmedResponse = response.trim();
  
          // Basic check if it looks like it contains MathJax delimiters
          // Keep this check as the AI is prompted to use MathJax delimiters
          const hasDelimiters = /(\$\$[\s\S]+\$\$|\$[\s\S]+\$)/.test(trimmedResponse);
  
          // If it doesn't seem to have delimiters but contains math-like characters,
          // wrap the whole thing in $$...$$ as a guess. This is risky.
          // A better approach relies on the AI correctly formatting the output.
          const likelyMath = /\\|frac|sqrt|sum|int|\^|_/.test(trimmedResponse);
          if (!hasDelimiters && likelyMath) {
              console.warn("AI response didn't seem to contain delimiters, wrapping in $$...$$ as a fallback for KaTeX.");
              return `$$${trimmedResponse}$$`; // Wrap in $$...$$ for KaTeX display math
          }
  
          // Return the response, assuming the AI formatted it correctly with delimiters.
          return trimmedResponse;
      }
  
  
      async formatProblemForAI(problemData) {
          // Format the problem data for the AI, prioritizing raw LaTeX/HTML
          let formattedContent = '';
  
          // Add problem statement (use HTML to preserve embedded math)
          if (problemData.problem && problemData.problem.html) {
              // Basic sanitization/simplification could be added here if needed
              formattedContent += `Problem HTML: ${problemData.problem.html}\n\n`;
          } else if (problemData.problem && problemData.problem.text) {
              formattedContent += `Problem Text: ${problemData.problem.text}\n\n`;
          }
  
          // Add KaTeX display elements (send raw LaTeX)
          if (problemData.answers && problemData.answers.katexDisplays && Object.keys(problemData.answers.katexDisplays).length > 0) {
              formattedContent += 'Mathematical Expressions (KaTeX - LaTeX Source):\n';
              for (const [key, latex] of Object.entries(problemData.answers.katexDisplays)) {
                  formattedContent += `${key}: ${latex}\n`;
              }
              formattedContent += '\n';
          }
  
          // Add any math inputs (send raw LaTeX)
          if (problemData.answers && problemData.answers.math && Object.keys(problemData.answers.math).length > 0) {
              formattedContent += 'Math Inputs (LaTeX Source):\n';
              for (const [key, latex] of Object.entries(problemData.answers.math)) {
                  formattedContent += `${key}: ${latex}\n`;
              }
              formattedContent += '\n';
          }
  
          // Add any text inputs
          if (problemData.answers && problemData.answers.text && Object.keys(problemData.answers.text).length > 0) {
              formattedContent += 'Text Inputs:\n';
              for (const [key, value] of Object.entries(problemData.answers.text)) {
                  formattedContent += `${key}: ${value}\n`;
              }
              formattedContent += '\n';
          }
  
          // Add any multiple choice selections
          if (problemData.answers && problemData.answers.multipleChoice && Object.keys(problemData.answers.multipleChoice).length > 0) {
              formattedContent += 'Multiple Choice Selections:\n';
              for (const [key, value] of Object.entries(problemData.answers.multipleChoice)) {
                  formattedContent += `${key}: ${value}\n`;
              }
              formattedContent += '\n';
          }
  
          // Add prompt for AI - explicitly ask for MathJax output
          formattedContent += 'IMPORTANT: Please solve this DeltaMath problem and provide ONLY THE ANSWER. DO NOT include any explanations, steps, or additional text. Format any mathematical parts of the answer using MathJax delimiters ($$...$$ for display math, $...$ for inline math). Return only the final answer.';
  
          // Cache the formatted problem content
          this.cachedArticle = formattedContent;
  
          return formattedContent; // Return the text part for the 'q' parameter
      }
  
  
      // Dedicated method for the Get Answer button click
      async handleGetAnswerClick() {
          console.log('Get Answer button clicked.');
          const answerContentElement = document.getElementById('answerContent');
          const answerContainerElement = document.getElementById('answerContainer');
  
          if (!answerContentElement || !answerContainerElement) {
              console.error("Answer content or container element not found.");
              return;
          }
  
          answerContentElement.innerHTML = '<div>Extracting problem data...</div>';
          answerContainerElement.style.display = 'flex'; // Show panel while processing
  
          try {
              // 'this' should refer to the DeltaMathUI instance here
              const problemData = this.extractAnswers();
              console.log('Problem data extracted.'); // Avoid logging sensitive data
  
              const formattedProblem = await this.formatProblemForAI(problemData);
              console.log('Problem formatted for AI.'); // Avoid logging sensitive data
  
              answerContentElement.innerHTML = '<div>Fetching answer from API...</div>';
  
              const apiResponse = await this.fetchAnswer(formattedProblem);
  
              if (apiResponse !== null) { // Check if fetchAnswer returned a response (not null due to error)
                  console.log('API response received. Processing...');
                  const processedAnswer = this.processAIResponse(apiResponse);
  
                  // Display the processed answer
                  answerContentElement.innerHTML = processedAnswer;
  
                  // --- Render Math using KaTeX if available ---
                  const checkAndRenderKaTeX = (retriesLeft = 50) => { // Poll up to 5 seconds (50 retries * 100ms delay)
                      // Check for window.katex and the auto-render function
                      if (window.katex && typeof window.renderMathInElement === 'function') {
                          console.log('KaTeX and auto-render available. Rendering...');
                          try {
                               // Use auto-render to process the content with delimiters
                               window.renderMathInElement(answerContentElement, {
                                   // KaTeX requires displayMode for $$...$$ and inlineMode for $...$
                                   delimiters: [
                                       {left: "$$", right: "$$", display: true},
                                       {left: "$", right: "$", display: false},
                                       {left: "\\(", right: "\\)", display: false}, // Add common delimiters
                                       {left: "\\[", right: "\\]", display: true}
                                   ],
                                   throwOnError : false // Don't throw errors on invalid math, just show the raw text
                               });
                               console.log('KaTeX rendering complete.');
                          } catch (err) {
                              console.error('KaTeX rendering failed:', err);
                              answerContentElement.innerHTML += `<div style="color: #ffcccc;">Error rendering math with KaTeX: ${err.message}</div>`;
                          }
                      } else if (retriesLeft > 0) {
                          console.log(`KaTeX or auto-render not yet available, retrying rendering... (${retriesLeft} retries left)`);
                          setTimeout(() => checkAndRenderKaTeX(retriesLeft - 1), 100); // Check every 100ms
                      } else {
                          console.warn('KaTeX or auto-render not available after multiple retries for rendering.');
                          answerContentElement.innerHTML += '<div style="color: #ffffcc;">Math rendering unavailable. KaTeX or auto-render function not found.</div>';
                      }
                  };
  
                  // Start the polling for KaTeX rendering
                  checkAndRenderKaTeX();
                  // --- End of Rendering ---
  
              } else {
                   console.error('API fetch failed, check console for details.');
                   // Error message is already displayed by fetchAnswer
              }
  
          } catch (error) {
              console.error('Error during Get Answer process:', error);
              answerContentElement.innerHTML = `<div style="color: #ffcccc;">An error occurred: ${error.message}</div>`;
          }
      }
  
  
      setupEventListeners() {
          const launcher = document.getElementById('Launcher');
          const answerContainer = document.getElementById('answerContainer');
  
          if (!launcher || !answerContainer) {
              console.error("Launcher or AnswerContainer not found during event listener setup.");
              return;
          }
  
          const closeButton = launcher.querySelector('#closeButton');
          const combinedButton = launcher.querySelector('#combinedButton');
          const closeAnswerButton = answerContainer.querySelector('#closeAnswerButton');
          const answerContent = answerContainer.querySelector('#answerContent');
  
  
          // --- Button Clicks ---
          if (closeButton) {
              closeButton.addEventListener('click', () => {
                  // Add a fade-out and slide-out animation effect
                   launcher.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
                   launcher.style.transform = 'translateX(100px)'; // Slide out to the right
                   launcher.style.opacity = '0';
                   answerContainer.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
                   answerContainer.style.transform = 'translateX(100px)'; // Slide out to the right
                   answerContainer.style.opacity = '0';
  
                   // Remove elements from display after animation
                   setTimeout(() => {
                       launcher.style.display = 'none';
                       answerContainer.style.display = 'none';
                       // Reset styles for next time it's shown
                       launcher.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out, box-shadow 0.3s ease-out';
                       launcher.style.transform = 'translateX(0px)';
                       launcher.style.opacity = '1';
                        answerContainer.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out, box-shadow 0.3s ease-out';
                       answerContainer.style.transform = 'translateX(0px)';
                       answerContainer.style.opacity = '1';
                   }, 300); // Match the transition duration
              });
          }
  
          if (closeAnswerButton) {
              closeAnswerButton.addEventListener('click', () => {
                  // Add a fade-out and slide-out animation effect
                   answerContainer.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
                   answerContainer.style.transform = 'translateX(100px)'; // Slide out to the right
                   answerContainer.style.opacity = '0';
  
                   // Remove element from display after animation
                   setTimeout(() => {
                       answerContainer.style.display = 'none';
                        // Reset styles for next time it's shown
                       answerContainer.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out, box-shadow 0.3s ease-out';
                       answerContainer.style.transform = 'translateX(0px)';
                       answerContainer.style.opacity = '1';
                   }, 300); // Match the transition duration
              });
          }
  
          // --- Get Answer Button ---
          if (combinedButton) {
              // Attach the class method directly. 'this' should be bound to the instance.
              combinedButton.addEventListener('click', this.handleGetAnswerClick.bind(this));
          } else {
               console.error("Combined button not found during event listener setup.");
          }
      }
  }
  
  // Instantiate the UI helper
  // Initialize UI as soon as possible, library loading is now asynchronous and non-blocking for UI init.
  new DeltaMathUI();
  