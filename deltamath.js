/**
 * DeltaMath UI Helper (KaTeX Version)
 *
 * This script creates a floating UI for the DeltaMath Answer Extractor.
 * It displays extracted answers, rendered using KaTeX, in a draggable panel.
 * It dynamically loads KaTeX if not already present.
 */

// --- KaTeX Loader ---
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
      // KaTeX is generally ready once the script is loaded, but rendering is done via its API
    };
    script.onerror = () => {
      console.error('Failed to load KaTeX script.');
      // Optionally, inform the user in the UI later if math fails to render
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

// --- Data Extraction ---
// Function to extract answers from DeltaMath problems
// REMOVED: convertLatexToReadableText function is gone.
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

        // Load KaTeX script and CSS asynchronously
        loadKaTeXScript();

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
        // Using more manageable CSS via classes would be better, but sticking to original inline style approach
        launcher.style.cssText = "outline: none;min-height: 160px;transform: translateX(0px) translateY(0);opacity: 1;font-family: 'Nunito', sans-serif;width: 180px;height: 240px;background: #1c1e2b;position: fixed;border-radius: 12px;display: flex;flex-direction: column;align-items: center;color: white;font-size: 16px;top: 50%;right: 20px;transform: translateY(-50%);z-index: 99999;padding: 16px;box-shadow: 0 4px 8px rgba(0,0,0,0.2);overflow: hidden;white-space: nowrap;";

        const dragHandle = document.createElement("div");
        dragHandle.className = "drag-handle";
        dragHandle.style.cssText = "width: 100%;height: 24px;cursor: move;background: rgba(255,255,255,0.05);position: absolute;top: 0;left: 0;border-top-left-radius: 12px;border-top-right-radius: 12px;display: flex;justify-content: center;align-items: center;";

        const dragIndicator = document.createElement("div");
        dragIndicator.style.cssText = "width: 40px;height: 4px;background: rgba(255,255,255,0.3);border-radius: 2px;margin-top: 4px;";
        dragHandle.appendChild(dragIndicator);

        const img = document.createElement("img");
        // Placeholder image - replace with a real one or remove if not needed
        img.src = "https://diverse-observations-vbulletin-occasional.trycloudflare.com/static/images/example.png";
        img.alt = "DeltaMath Helper";
        img.style.cssText = "width: 90px;height: 90px;margin-top: 32px;border-radius: 50%;";
        // Add error handler for image
          img.onerror = () => { img.src = 'https://placehold.co/90x90/1c1e2b/ffffff?text=Error'; };


        const closeButton = document.createElement("button");
        closeButton.id = "closeButton";
        closeButton.style.cssText = "position: absolute;top: 8px;right: 8px;background: none;border: none;color: white;font-size: 18px;cursor: pointer;padding: 2px 8px;";
        closeButton.textContent = "×";
        closeButton.setAttribute('aria-label', 'Close Launcher');


        const combinedButton = document.createElement("button");
        combinedButton.id = "combinedButton";
        combinedButton.style.cssText = "background: #2c2e3b;border: none;color: white;padding: 12px 20px;border-radius: 8px;cursor: pointer;margin-top: 24px;width: 120px;height: 44px;font-size: 16px;transition: background 0.2s ease;";
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
        answerContainer.style.cssText = "outline: none;min-height: 60px;transform: translateX(0px) translateY(0);opacity: 1;font-family: 'Nunito', sans-serif;width: 250px;height: auto;max-height: 300px;background: #1c1e2b;position: fixed;border-radius: 8px;display: flex;justify-content: center;align-items: center;color: white;font-size: 16px;top: 50%;right: 220px;transform: translateY(-50%);z-index: 99998;padding: 8px;box-shadow: 0 4px 8px rgba(0,0,0,0.2);overflow: auto;white-space: normal;display: none;"; // Initially hidden

        const answerDragHandle = document.createElement("div");
        answerDragHandle.className = "answer-drag-handle";
        answerDragHandle.style.cssText = "width: 100%;height: 24px;cursor: move;background: rgba(255,255,255,0.05);position: absolute;top: 0;left: 0;border-top-left-radius: 8px;border-top-right-radius: 8px;display: flex;justify-content: center;align-items: center;";

        const answerDragIndicator = document.createElement("div");
        answerDragIndicator.style.cssText = "width: 30px;height: 3px;background: rgba(255,255,255,0.3);border-radius: 2px;margin-top: 4px;";
        answerDragHandle.appendChild(answerDragIndicator);

        const closeAnswerButton = document.createElement("button");
        closeAnswerButton.id = "closeAnswerButton";
        closeAnswerButton.style.cssText = "position: absolute;top: 8px;right: 8px;background: none;border: none;color: white;font-size: 18px;cursor: pointer;padding: 2px 8px;";
        closeAnswerButton.textContent = "×";
        closeAnswerButton.setAttribute('aria-label', 'Close Answer Panel');


        const answerContent = document.createElement("div");
        answerContent.id = "answerContent";
        // Padding top adjusted for drag handle and buttons
        answerContent.style.cssText = "padding: 36px 12px 12px 12px; margin: 0;word-wrap: break-word;font-size: 14px;display: block; width: 100%;height: 100%;text-align: left;overflow-y: auto;user-select: text;-webkit-user-select: text;-moz-user-select: text;-ms-user-select: text;cursor: text;";

        // Add copy button (using modern clipboard API if available)
        const copyButton = document.createElement("button");
        copyButton.id = "copyAnswerButton";
        copyButton.style.cssText = "position: absolute;top: 8px;right: 36px;background: none;border: none;color: white;font-size: 14px;cursor: pointer;padding: 2px 8px;";
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
            existingLauncher.remove(); // More modern way to remove element
        }

        const existingAnswerContainer = document.getElementById('answerContainer');
        if (existingAnswerContainer) {
            existingAnswerContainer.remove();
        }
        // Note: Event listeners on document/body added by drag handlers might persist
        // if not explicitly removed. A more robust cleanup would involve tracking
        // and removing those specific listeners.
    }

    initializeUI() {
        document.body.appendChild(this.itemMetadata.UI);
        document.body.appendChild(this.itemMetadata.answerUI);

        // Ensure elements are mounted before setting up event listeners
        // Use requestAnimationFrame for better timing after DOM updates
        requestAnimationFrame(() => {
            if (this.itemMetadata.UI && this.itemMetadata.answerUI) {
                this.setupEventListeners();
            } else {
                console.error("UI elements not found after appending.");
            }
        });
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


    // Consolidated Drag Handler Logic
    makeDraggable(containerElement, handleElement) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        const onMouseDown = (e) => {
            // Prevent dragging if clicking on buttons/interactive elements within the handle
            if (e.target !== handleElement && e.target.parentNode !== handleElement) return;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = containerElement.getBoundingClientRect();

            // Ensure position is calculated relative to the viewport
            // Use computed style to get accurate left/top if transform is used
            const styles = window.getComputedStyle(containerElement);
            initialX = parseFloat(styles.left) || rect.left;
            initialY = parseFloat(styles.top) || rect.top;


            // Set position explicitly if not already set, to allow dragging
            if (styles.position === 'static') {
                containerElement.style.position = 'fixed'; // Or 'absolute' depending on context
            }
            containerElement.style.right = 'auto'; // Disable right positioning if used
            containerElement.style.bottom = 'auto'; // Disable bottom positioning
            containerElement.style.transform = 'none'; // Disable transform positioning


            containerElement.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none'; // Prevent text selection during drag

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            // Boundary checks (optional: prevent dragging off-screen)
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;
            // const vpWidth = window.innerWidth;
            // const vpHeight = window.innerHeight;
            // const elWidth = containerElement.offsetWidth;
            // const elHeight = containerElement.offsetHeight;
            // newX = Math.max(0, Math.min(newX, vpWidth - elWidth));
            // newY = Math.max(0, Math.min(newY, vpHeight - elHeight));


            containerElement.style.left = `${newX}px`;
            containerElement.style.top = `${newY}px`;
        };

        const onMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            containerElement.style.cursor = 'move'; // Reset cursor
            document.body.style.userSelect = ''; // Re-enable text selection

            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        handleElement.addEventListener('mousedown', onMouseDown);
        handleElement.style.cursor = 'move'; // Set cursor on the handle

        // Return a cleanup function (optional)
        return () => {
            handleElement.removeEventListener('mousedown', onMouseDown);
            // Ensure mousemove/mouseup are removed if drag was interrupted
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
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


        // --- Dragging ---
        const launcherDragHandle = launcher.querySelector('.drag-handle');
        const answerDragHandle = answerContainer.querySelector('.answer-drag-handle');

        if (launcherDragHandle) {
            this.makeDraggable(launcher, launcherDragHandle);
        } else {
            console.warn("Launcher drag handle not found.");
        }
        if (answerDragHandle) {
            this.makeDraggable(answerContainer, answerDragHandle);
        } else {
            console.warn("Answer drag handle not found.");
        }


        // --- Button Clicks ---
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                launcher.style.display = 'none';
                answerContainer.style.display = 'none'; // Close answer panel too
            });
        }

        if (closeAnswerButton) {
            closeAnswerButton.addEventListener('click', () => {
                answerContainer.style.display = 'none';
            });
        }

        // --- Get Answer Button ---
        if (combinedButton) {
            combinedButton.addEventListener('click', async () => {
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
            });
        } else {
             console.error("Combined button not found during event listener setup.");
        }
    }
}

// Instantiate the UI helper
// Initialize UI as soon as possible, KaTeX loading is now asynchronous and non-blocking for UI init.
new DeltaMathUI();
