/**
 * DeltaMath UI Helper
 * 
 * This script creates a floating UI for the DeltaMath Answer Extractor.
 * It displays extracted answers in a draggable panel with similar styling to achieve.js.
 */

// Function to convert LaTeX mathematical expressions to normal readable text
function convertLatexToReadableText(latex) {
  if (!latex) return '';
  
  let readable = latex;
  
  // Replace common LaTeX math operators and symbols
  const replacements = [
    // Fractions
    { pattern: /\\frac{([^{}]+)}{([^{}]+)}/g, replacement: "$1/$2" },
    
    // Powers and exponents
    { pattern: /\^\{([^{}]+)\}/g, replacement: "^$1" },
    { pattern: /\^(\d)/g, replacement: "^$1" },
    
    // Roots
    { pattern: /\\sqrt{([^{}]+)}/g, replacement: "sqrt($1)" },
    
    // Greek letters
    { pattern: /\\alpha/g, replacement: "alpha" },
    { pattern: /\\beta/g, replacement: "beta" },
    { pattern: /\\gamma/g, replacement: "gamma" },
    { pattern: /\\delta/g, replacement: "delta" },
    { pattern: /\\epsilon/g, replacement: "epsilon" },
    { pattern: /\\theta/g, replacement: "theta" },
    { pattern: /\\pi/g, replacement: "pi" },
    
    // Trigonometric functions
    { pattern: /\\sin/g, replacement: "sin" },
    { pattern: /\\cos/g, replacement: "cos" },
    { pattern: /\\tan/g, replacement: "tan" },
    
    // Other common symbols
    { pattern: /\\times/g, replacement: "×" },
    { pattern: /\\div/g, replacement: "÷" },
    { pattern: /\\pm/g, replacement: "±" },
    { pattern: /\\infty/g, replacement: "∞" },
    { pattern: /\\neq/g, replacement: "≠" },
    { pattern: /\\geq/g, replacement: "≥" },
    { pattern: /\\leq/g, replacement: "≤" }
  ];
  
  // Apply all replacements
  replacements.forEach(({ pattern, replacement }) => {
    readable = readable.replace(pattern, replacement);
  });
  
  return readable;
}

// Function to extract answers from DeltaMath problems
window.extractDeltaMathAnswers = function extractDeltaMathAnswers() {
  // Create an object to store all answers
  const answers = {};
  
  // Try to access DeltaMath's internal data structures first
  try {
    // Method 1: Try to access the problem data directly from DeltaMath's global objects
    if (window.dmProblem && window.dmProblem.problem) {
      answers['problemData'] = window.dmProblem.problem;
      
      // Extract correct answer if available
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
      answers['textInputs'][key] = input.value.replace(/−/g, "-");
    });
  }
  
  // Check for multiple choice answers
  const radioInputs = document.querySelectorAll('input[type="radio"]:checked');
  if (radioInputs.length > 0) {
    answers['multipleChoice'] = {};
    radioInputs.forEach((radio, index) => {
      const key = radio.name || `option${index}`;
      answers['multipleChoice'][key] = radio.value;
    });
  }
  
  // Check for MathQuill fields (math input)
  const mqElements = document.querySelectorAll('.mathquill-editable, .mq-editable-field, .mq-root-block, .mq-math-mode');
  if (mqElements.length > 0) {
    answers['mathInputs'] = {};
    mqElements.forEach((mqEl, index) => {
      try {
        // Try to get MathQuill instance
        let latex = "";
        
        // Try to extract from DOM structure
        latex = mqEl.getAttribute('data-latex') || 
                mqEl.getAttribute('data-math') || 
                mqEl.getAttribute('data-content') ||
                mqEl.textContent.trim();
        
        if (latex) {
          latex = latex.replace(/−/g, "-").trim();
          const key = mqEl.id || `mathInput${index}`;
          answers['mathInputs'][key] = {
            latex: latex,
            readable: convertLatexToReadableText(latex)
          };
        }
      } catch (e) {
        console.warn('Error extracting MathQuill field:', e);
      }
    });
  }
  
  // Get problem statement
  const problemStatement = document.querySelector('.problem-statement, .problem-text, .problem-description, #problemPrompt');
  if (problemStatement) {
    // Extract both text content and any LaTeX math expressions
    const textContent = problemStatement.textContent.trim();
    
    // Check if the element has LaTeX content (KaTeX or MathJax rendered)
    const hasLatex = problemStatement.querySelector('.katex, .MathJax');
    
    if (hasLatex) {
      // Store both the raw text and a note about LaTeX content
      answers['problemStatement'] = {
        text: textContent,
        hasLatex: true,
        html: problemStatement.innerHTML
      };
    } else {
      answers['problemStatement'] = textContent;
    }
  }
  
  // Format the answers for better readability
  const formattedAnswers = {
    problem: {},
    answers: {}
  };
  
  // Add problem statement with proper handling of LaTeX content
  if (answers.problemStatement) {
    if (typeof answers.problemStatement === 'object' && answers.problemStatement.hasLatex) {
      formattedAnswers.problem = {
        text: answers.problemStatement.text || "Problem statement not found",
        hasLatex: true,
        html: answers.problemStatement.html
      };
    } else {
      formattedAnswers.problem = {
        text: answers.problemStatement || "Problem statement not found",
        hasLatex: false
      };
    }
  } else {
    formattedAnswers.problem = {
      text: "Problem statement not found",
      hasLatex: false
    };
  }
  
  // Add detected answers to the formatted object
  if (answers.correctAnswer) {
    formattedAnswers.answers.correct = answers.correctAnswer;
  }
  
  if (answers.textInputs && Object.keys(answers.textInputs).length > 0) {
    formattedAnswers.answers.text = answers.textInputs;
  }
  
  if (answers.multipleChoice && Object.keys(answers.multipleChoice).length > 0) {
    formattedAnswers.answers.multipleChoice = answers.multipleChoice;
  }
  
  if (answers.mathInputs && Object.keys(answers.mathInputs).length > 0) {
    formattedAnswers.answers.math = answers.mathInputs;
  }
  
  return formattedAnswers;
}

import interact from 'interactjs';

class DeltaMathUI {
    constructor() {
        this.isDragging = false;
        this.currentX = 0;
        this.currentY = 0;
        this.initialX = 0;
        this.initialY = 0;
        this.xOffset = 0;
        this.yOffset = 0;
        
        // Store reference to the extractDeltaMathAnswers function
        this.extractAnswers = window.extractDeltaMathAnswers || extractDeltaMathAnswers;

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
        launcher.style.cssText = "outline: none;min-height: 160px;transform: translateX(0px) translateY(0);opacity: 1;font-family: 'Nunito', sans-serif;width: 180px;height: 240px;background: #1c1e2b;position: fixed;border-radius: 12px;display: flex;flex-direction: column;align-items: center;color: white;font-size: 16px;top: 50%;right: 20px;transform: translateY(-50%);z-index: 99999;padding: 16px;box-shadow: 0 4px 8px rgba(0,0,0,0.2);overflow: hidden;white-space: nowrap;";

        const dragHandle = document.createElement("div");
        dragHandle.className = "drag-handle";
        dragHandle.style.cssText = "width: 100%;height: 24px;cursor: move;background: rgba(255,255,255,0.05);position: absolute;top: 0;left: 0;border-top-left-radius: 12px;border-top-right-radius: 12px;display: flex;justify-content: center;align-items: center;";
        
        // Add visual indicator for drag handle
        const dragIndicator = document.createElement("div");
        dragIndicator.style.cssText = "width: 40px;height: 4px;background: rgba(255,255,255,0.3);border-radius: 2px;margin-top: 4px;";
        dragHandle.appendChild(dragIndicator);

        const img = document.createElement("img");
        img.src = "https://diverse-observations-vbulletin-occasional.trycloudflare.com/static/images/example.png";
        img.style.cssText = "width: 90px;height: 90px;margin-top: 32px;border-radius: 50%;";

        const closeButton = document.createElement("button");
        closeButton.id = "closeButton";
        closeButton.style.cssText = "position: absolute;top: 8px;right: 8px;background: none;border: none;color: white;font-size: 18px;cursor: pointer;padding: 2px 8px;";
        closeButton.textContent = "×";

        const getAnswerButton = document.createElement("button");
        getAnswerButton.id = "getAnswerButton";
        getAnswerButton.style.cssText = "background: #2c2e3b;border: none;color: white;padding: 12px 20px;border-radius: 8px;cursor: pointer;margin-top: 24px;width: 120px;height: 44px;font-size: 16px;transition: background 0.2s ease;";
        getAnswerButton.textContent = "Get Answers";

        const version = document.createElement("div");
        version.style.cssText = "position: absolute;bottom: 8px;right: 8px;font-size: 12px;opacity: 0.5;";
        version.textContent = "1.0";

        launcher.appendChild(dragHandle);
        launcher.appendChild(img);
        launcher.appendChild(closeButton);
        launcher.appendChild(getAnswerButton);
        launcher.appendChild(version);
        container.appendChild(launcher);

        return container;
    }

    createAnswerUI() {
        const container = document.createElement("div");
        const answerContainer = document.createElement("div");
        answerContainer.id = "answerContainer";
        answerContainer.className = "answerLauncher";
        answerContainer.style.cssText = "outline: none;min-height: 60px;transform: translateX(0px) translateY(0);opacity: 1;font-family: 'Nunito', sans-serif;width: 60px;height: 60px;background: #1c1e2b;position: fixed;border-radius: 8px;display: flex;justify-content: center;align-items: center;color: white;font-size: 24px;top: 50%;right: 220px;transform: translateY(-50%);z-index: 99998;padding: 8px;box-shadow: 0 4px 8px rgba(0,0,0,0.2);overflow: hidden;white-space: normal;display: none;";

        const answerDragHandle = document.createElement("div");
        answerDragHandle.className = "answer-drag-handle";
        answerDragHandle.style.cssText = "width: 100%;height: 24px;cursor: move;background: rgba(255,255,255,0.05);position: absolute;top: 0;left: 0;border-top-left-radius: 8px;border-top-right-radius: 8px;display: flex;justify-content: center;align-items: center;";
        
        // Add visual indicator for drag handle
        const answerDragIndicator = document.createElement("div");
        answerDragIndicator.style.cssText = "width: 30px;height: 3px;background: rgba(255,255,255,0.3);border-radius: 2px;margin-top: 4px;";
        answerDragHandle.appendChild(answerDragIndicator);

        const dragHandle = document.createElement("div");
dragHandle.className = "answer-drag-handle";
dragHandle.style.cssText = "width: 100%;height: 24px;cursor: move;background: rgba(255,255,255,0.05);position: absolute;top: 0;left: 0;border-top-left-radius: 8px;border-top-right-radius: 8px;display: flex;justify-content: center;align-items: center;";

// Add visual indicator for drag handle
const dragIndicator = document.createElement("div");
dragIndicator.style.cssText = "width: 30px;height: 3px;background: rgba(255,255,255,0.3);border-radius: 2px;margin-top: 4px;";
dragHandle.appendChild(dragIndicator);

answerContainer.appendChild(dragHandle);
        const closeButton = document.createElement("button");
        closeButton.id = "closeAnswerButton";
        closeButton.style.cssText = "position: absolute;top: 8px;right: 8px;background: none;border: none;color: white;font-size: 18px;cursor: pointer;padding: 2px 8px;";
        closeButton.textContent = "×";

        const answerContent = document.createElement("div");
        answerContent.id = "answerContent";
        answerContent.style.cssText = "padding: 0;margin: 0;word-wrap: break-word;font-size: 24px;font-weight: bold;display: flex;justify-content: center;align-items: center;width: 100%;height: 100%;";

        answerContainer.appendChild(dragHandle);
        answerContainer.appendChild(closeButton);
        answerContainer.appendChild(answerContent);
        container.appendChild(answerContainer);

        return container;
    }

    initializeUI() {
        document.body.appendChild(this.itemMetadata.UI);
        document.body.appendChild(this.itemMetadata.answerUI);
        
        // Ensure elements are mounted before setting up event listeners
        setTimeout(() => {
            if (this.itemMetadata.UI && this.itemMetadata.answerUI) {
                this.setupEventListeners();
            }
        }, 0);
    }

    setupEventListeners() {
        setTimeout(() => {
            const launcher = document.getElementById('Launcher');
            if (!launcher) return;
            
            const closeButton = launcher.querySelector('#closeButton');
            const getAnswerButton = launcher.querySelector('#getAnswerButton');
            const answerContainer = document.getElementById('answerContainer');
            if (!answerContainer) return;

            // Initialize position properly
            const initPosition = () => {
             const rect = launcher.getBoundingClientRect();
             launcher.style.right = null;
             launcher.style.transform = 'none';
             launcher.style.left = `${rect.left}px`;
             launcher.style.top = `${rect.top}px`;
             this.xOffset = rect.left;
             this.yOffset = rect.top;
            };
            
            // Initialize position on first load
            initPosition();

            // Use interact.js for dragging
            interact(launcher).draggable({
                listeners: {
                    start(event) {
                        this.isDragging = true;
                        launcher.style.position = 'fixed';
                        document.body.style.userSelect = 'none'; // Disable text selection
                    },
                    move(event) {
                        const deltaX = event.dx;
                        const deltaY = event.dy;
                        this.xOffset += deltaX;
                        this.yOffset += deltaY;
                        launcher.style.transform = `translate(${this.xOffset}px, ${this.yOffset}px)`;
                    },
                    end(event) {
                        this.isDragging = false;
                        document.body.style.userSelect = ''; // Re-enable text selection
                    }
                }
            });

            closeButton.addEventListener('click', () => {
                launcher.style.display = 'none';
            });

            const answerDragHandle = answerContainer.querySelector('.answer-drag-handle');
            const closeAnswerButton = answerContainer.querySelector('#closeAnswerButton');
            const answerContent = answerContainer.querySelector('#answerContent');

            // Add event listeners for dragging the answer UI
            interact(answerContainer).draggable({
                listeners: {
                    start(event) {
                        answerIsDragging = true;
                    },
                    move(event) {
                        answerCurrentX = event.dx;
                        answerCurrentY = event.dy;
                        answerContainer.style.transform = `translate(${answerCurrentX}px, ${answerCurrentY}px)`;
                    },
                    end(event) {
                        answerIsDragging = false;
                    }
                }
            });

            closeAnswerButton.addEventListener('click', () => {
                answerContainer.style.display = 'none';
            });

            // Add hover effect to button
            getAnswerButton.addEventListener('mouseover', () => {
                getAnswerButton.style.background = '#3c3e4b';
            });
            getAnswerButton.addEventListener('mouseout', () => {
                getAnswerButton.style.background = '#2c2e3b';
            });
            
            // Add click effect and answer extraction
            // Preserve 'this' context for the click handler
            const self = this;
            getAnswerButton.addEventListener('click', function() {
                // Visual feedback for click
                getAnswerButton.style.background = '#4c4e5b';
                setTimeout(() => getAnswerButton.style.background = '#2c2e3b', 200);
                
                console.log('Getting DeltaMath answers...');
                try {
                    // Use the stored reference to the function
                    const extractFn = self.extractAnswers || window.extractDeltaMathAnswers || extractDeltaMathAnswers;
                    
                    const answers = extractFn();
                    console.log('Extracted Answers:', answers);
                    
                    // Display answers in the answer UI
                    answerContent.textContent = JSON.stringify(answers, null, 2);
                    answerContainer.style.display = 'flex';
                } catch (e) {
                    console.error('Error extracting answers:', e);
                }
            });
        }, 0);
    }
}

// Initialize the UI
const deltaUI = new DeltaMathUI();
answerContainer.style.overflow = 'hidden';
answerContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    answerContainer.scrollTop += e.deltaY;
});