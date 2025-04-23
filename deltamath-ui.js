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
    
    // Parentheses expressions (like (3x+3)(2x+9))
    { pattern: /\(([^()]+)\)\(([^()]+)\)/g, replacement: "($1)($2)" },
    
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
          // Fallback: try to get from the rendered content
          latex = katexEl.textContent.trim();
        }
        
        if (latex) {
          const key = `katexDisplay${index}`;
          answers['katexDisplays'][key] = {
            latex: latex,
            readable: convertLatexToReadableText(latex)
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
  
  // Add KaTeX display elements to formatted answers
  if (answers.katexDisplays && Object.keys(answers.katexDisplays).length > 0) {
    formattedAnswers.answers.katexDisplays = answers.katexDisplays;
  }
  
  return formattedAnswers;
}

class DeltaMathUI {
    constructor() {
        this.isDragging = false;
        this.currentX = 0;
        this.currentY = 0;
        this.initialX = 0;
        this.initialY = 0;
        this.xOffset = 0;
        this.yOffset = 0;
        this.cachedArticle = null;
        
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

        const combinedButton = document.createElement("button");
        combinedButton.id = "combinedButton";
        combinedButton.style.cssText = "background: #2c2e3b;border: none;color: white;padding: 12px 20px;border-radius: 8px;cursor: pointer;margin-top: 24px;width: 120px;height: 44px;font-size: 16px;transition: background 0.2s ease;";
        combinedButton.textContent = "Get Answer";
        

        const version = document.createElement("div");
        version.style.cssText = "position: absolute;bottom: 8px;right: 8px;font-size: 12px;opacity: 0.5;";
        version.textContent = "1.0";

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
        answerContainer.style.cssText = "outline: none;min-height: 60px;transform: translateX(0px) translateY(0);opacity: 1;font-family: 'Nunito', sans-serif;width: 250px;height: auto;max-height: 300px;background: #1c1e2b;position: fixed;border-radius: 8px;display: flex;justify-content: center;align-items: center;color: white;font-size: 16px;top: 50%;right: 220px;transform: translateY(-50%);z-index: 99998;padding: 8px;box-shadow: 0 4px 8px rgba(0,0,0,0.2);overflow: auto;white-space: normal;display: none;";

        const answerDragHandle = document.createElement("div");
        answerDragHandle.className = "answer-drag-handle";
        answerDragHandle.style.cssText = "width: 100%;height: 24px;cursor: move;background: rgba(255,255,255,0.05);position: absolute;top: 0;left: 0;border-top-left-radius: 8px;border-top-right-radius: 8px;display: flex;justify-content: center;align-items: center;";
        
        // Add visual indicator for drag handle
        const answerDragIndicator = document.createElement("div");
        answerDragIndicator.style.cssText = "width: 30px;height: 3px;background: rgba(255,255,255,0.3);border-radius: 2px;margin-top: 4px;";
        answerDragHandle.appendChild(answerDragIndicator);

        answerContainer.appendChild(answerDragHandle);
        const closeButton = document.createElement("button");
        closeButton.id = "closeAnswerButton";
        closeButton.style.cssText = "position: absolute;top: 8px;right: 8px;background: none;border: none;color: white;font-size: 18px;cursor: pointer;padding: 2px 8px;";
        closeButton.textContent = "×";

        const answerContent = document.createElement("div");
        answerContent.id = "answerContent";
        answerContent.style.cssText = "padding: 32px 12px 12px 12px;margin: 0;word-wrap: break-word;font-size: 14px;display: flex;justify-content: flex-start;align-items: flex-start;width: 100%;height: 100%;text-align: left;overflow-y: auto;user-select: text;-webkit-user-select: text;-moz-user-select: text;-ms-user-select: text;cursor: text;";

        // Add copy button
        const copyButton = document.createElement("button");
        copyButton.id = "copyAnswerButton";
        copyButton.style.cssText = "position: absolute;top: 8px;right: 36px;background: none;border: none;color: white;font-size: 14px;cursor: pointer;padding: 2px 8px;";
        copyButton.textContent = "Copy";
        copyButton.addEventListener('click', () => {
            const content = document.getElementById('answerContent');
            if (content) {
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(content);
                selection.removeAllRanges();
                selection.addRange(range);
                document.execCommand('copy');
                selection.removeAllRanges();
                // Visual feedback
                copyButton.textContent = "Copied!";
                setTimeout(() => {
                    copyButton.textContent = "Copy";
                }, 1500);
            }
        });
        
        answerContainer.appendChild(answerDragHandle);
        answerContainer.appendChild(closeButton);
        answerContainer.appendChild(copyButton);
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

    async fetchAnswer(queryContent) {
        try {
            console.log(`Sending POST request with queryContent: ${queryContent}`);
            
            const response = await fetch('https://diverse-observations-vbulletin-occasional.trycloudflare.com/ask', {
                method: 'POST',
                cache: 'no-cache',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    q: queryContent,
                    article: this.cachedArticle || null
                })
            });
    
            console.log(`Received response with status: ${response.status}`);
    
            if (!response.ok) {
                console.error('Failed to fetch answer from API');
                throw new Error('Failed to fetch answer from API');
            }
    
            const data = await response.json();
            console.log(`Received data: ${data}`);
            return data.response || 'No answer available';
        } catch (error) {
            console.error('Error:', error);
            return `Error: ${error.message}`;
        }
    }

    // Function to process AI response and convert LaTeX to readable text
    processAIResponse(response) {
        if (!response) return '';
        
        // Check if the response contains LaTeX-like patterns
        const containsLatex = /\\[a-zA-Z]+|\{|\}|\^|_|\\frac|\\sqrt/.test(response);
        
        if (containsLatex) {
            // Convert LaTeX to readable text instead of wrapping with delimiters
            let processed = response;
            
            // Define patterns to convert LaTeX to readable text
            const latexPatterns = [
                // Fractions
                { pattern: /\\frac\{([^{}]+)\}\{([^{}]+)\}/g, replacement: "($1)/($2)" },
                
                // Square roots
                { pattern: /\\sqrt\{([^{}]+)\}/g, replacement: "√($1)" },
                
                // Powers with braces
                { pattern: /([a-zA-Z0-9])\^\{([^{}]+)\}/g, replacement: "$1^($2)" },
                
                // Simple powers
                { pattern: /([a-zA-Z0-9])\^(\d)/g, replacement: "$1^$2" },
                
                // Subscripts with braces
                { pattern: /([a-zA-Z0-9])_\{([^{}]+)\}/g, replacement: "$1_$2" },
                
                // Simple subscripts
                { pattern: /([a-zA-Z0-9])_(\d)/g, replacement: "$1_$2" },
                
                // Greek letters
                { pattern: /\\alpha/g, replacement: "α" },
                { pattern: /\\beta/g, replacement: "β" },
                { pattern: /\\gamma/g, replacement: "γ" },
                { pattern: /\\delta/g, replacement: "δ" },
                { pattern: /\\epsilon/g, replacement: "ε" },
                { pattern: /\\theta/g, replacement: "θ" },
                { pattern: /\\pi/g, replacement: "π" },
                { pattern: /\\sigma/g, replacement: "σ" },
                { pattern: /\\omega/g, replacement: "ω" },
                
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
                { pattern: /\\leq/g, replacement: "≤" },
                
                // Remove unnecessary braces
                { pattern: /\{([^{}]+)\}/g, replacement: "$1" }
            ];
            
            // Apply all replacements
            latexPatterns.forEach(({ pattern, replacement }) => {
                processed = processed.replace(pattern, replacement);
            });
            
            // Handle equations with = signs
            processed = processed.replace(/(\\?[a-zA-Z0-9_{}\\^]+\s*=\s*\\?[a-zA-Z0-9_{}\\^]+)/g, "$1");
            
            return processed;
        }
        
        return response;
    }

    async formatProblemForAI(problemData) {
        // Format the problem data for the AI
        let formattedContent = '';
        
        // Add problem statement
        if (problemData.problem && problemData.problem.text) {
            formattedContent += `Problem: ${problemData.problem.text}\n\n`;
        }
        
        // Add KaTeX display elements (mathematical expressions) - prioritize these for better math handling
        if (problemData.answers && problemData.answers.katexDisplays) {
            formattedContent += 'Mathematical Expressions (KaTeX):\n';
            for (const [key, value] of Object.entries(problemData.answers.katexDisplays)) {
                // Include both LaTeX and readable versions for better AI processing
                formattedContent += `${key}:\n`;
                formattedContent += `  LaTeX: ${value.latex}\n`;
                formattedContent += `  Readable: ${value.readable}\n`;
            }
            formattedContent += '\n';
        }
        
        // Add any math inputs
        if (problemData.answers && problemData.answers.math) {
            formattedContent += 'Math Inputs:\n';
            for (const [key, value] of Object.entries(problemData.answers.math)) {
                formattedContent += `${key}: ${value.readable || value.latex}\n`;
            }
            formattedContent += '\n';
        }
        
        // Add any text inputs
        if (problemData.answers && problemData.answers.text) {
            formattedContent += 'Text Inputs:\n';
            for (const [key, value] of Object.entries(problemData.answers.text)) {
                formattedContent += `${key}: ${value}\n`;
            }
            formattedContent += '\n';
        }
        
        // Add any multiple choice selections
        if (problemData.answers && problemData.answers.multipleChoice) {
            formattedContent += 'Multiple Choice Selections:\n';
            for (const [key, value] of Object.entries(problemData.answers.multipleChoice)) {
                formattedContent += `${key}: ${value}\n`;
            }
            formattedContent += '\n';
        }
        
        // Add prompt for AI with specific instructions to only provide the answer
        formattedContent += 'IMPORTANT: Please solve this DeltaMath problem and provide ONLY THE ANSWER. DO NOT include any explanations, steps, or additional text. Return only the final answer in the most concise form possible.';
        
        // Cache the problem content
        this.cachedArticle = formattedContent;
        
        return formattedContent;
    }

    setupEventListeners() {
        const launcher = document.getElementById('Launcher');
        if (!launcher) return;
        const closeButton = launcher.querySelector('#closeButton');
        const combinedButton = launcher.querySelector('#combinedButton');
        const answerContainer = document.getElementById('answerContainer');
        if (!answerContainer) return;

        const initPosition = () => {
            const rect = launcher.getBoundingClientRect();
            launcher.style.right = null;
            launcher.style.transform = 'none';
            launcher.style.left = `${rect.left}px`;
            launcher.style.top = `${rect.top}px`;
            this.xOffset = rect.left;
            this.yOffset = rect.top;
        };

        initPosition();

        const dragElement = (element, container) => {
            let isDragging = false;
            let startX, startY, initialX, initialY;
            element.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const rect = container.getBoundingClientRect();
                initialX = rect.left;
                initialY = rect.top;
                document.body.style.userSelect = 'none';
            });
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                container.style.left = `${initialX + deltaX}px`;
                container.style.top = `${initialY + deltaY}px`;
            });
            document.addEventListener('mouseup', () => {
                isDragging = false;
                document.body.style.userSelect = '';
            });
        };


        dragElement(launcher.querySelector('.drag-handle'), launcher);
        dragElement(answerContainer.querySelector('.answer-drag-handle'), answerContainer);

        closeButton.addEventListener('click', () => {
            launcher.style.display = 'none';
        });

        const closeAnswerButton = answerContainer.querySelector('#closeAnswerButton');
        const answerContent = answerContainer.querySelector('#answerContent');

        closeAnswerButton.addEventListener('click', () => {
            answerContainer.style.display = 'none';
        });

        combinedButton.addEventListener('mouseover', () => {
            combinedButton.style.background = '#3c3e4b';
        });
        combinedButton.addEventListener('mouseout', () => {
            combinedButton.style.background = '#2c2e3b';
        });

        const self = this;
        combinedButton.addEventListener('click', async function() {
            combinedButton.style.background = '#4c4e5b';
            setTimeout(() => combinedButton.style.background = '#2c2e3b', 200);

            console.log('Getting DeltaMath answers and AI solution...');
            try {
                // First extract the problem data
                const extractFn = self.extractAnswers || window.extractDeltaMathAnswers || extractDeltaMathAnswers;
                const problemData = extractFn();
                console.log('Extracted problem data:', problemData);
                
                // Format the problem data for the AI
                const problemContent = await self.formatProblemForAI(problemData);
                
                // Get AI answer
                const aiAnswer = await self.fetchAnswer(problemContent);
                console.log('AI Answer:', aiAnswer);
                
                // Process the AI answer to properly format LaTeX expressions
                const processedAnswer = self.processAIResponse(aiAnswer);
                
                // Display the processed answer
                answerContent.innerHTML = `<div>${processedAnswer}</div>`;
                
                answerContainer.style.display = 'flex';
                answerContainer.style.width = 'auto';
                answerContainer.style.maxWidth = '400px';
                answerContainer.style.height = 'auto';
                answerContainer.style.maxHeight = '300px';
                answerContainer.style.overflow = 'auto';
                
                // No need to render with KaTeX since we've already converted LaTeX to readable text
                // Apply some basic styling to make the answer visually appealing
                answerContent.style.fontFamily = "'Nunito', 'Arial', sans-serif";
                answerContent.style.fontSize = "16px";
                answerContent.style.lineHeight = "1.5";
                answerContent.style.color = "#ffffff";
                
                // Add some visual enhancements for mathematical symbols
                const enhancedHTML = answerContent.innerHTML
                    .replace(/√\(([^)]+)\)/g, '<span style="font-weight:bold">√</span>($1)')
                    .replace(/(\d+)\^(\d+)/g, '$1<sup>$2</sup>')
                    .replace(/([a-zA-Z])\^(\d+)/g, '$1<sup>$2</sup>')
                    .replace(/\(([^)]+)\)\/\(([^)]+)\)/g, '<span style="display:inline-block;text-align:center"><span style="border-bottom:1px solid #fff">$1</span><br>$2</span>');
                
                answerContent.innerHTML = enhancedHTML;
            } catch (e) {
                console.error('Error getting answers:', e);
                answerContent.textContent = `Error: ${e.message}`;
                answerContainer.style.display = 'flex';
            }
        });
    }
}

// Function to handle dragging of elements
function handleDrag(element) {
    if (!element) return;
    
    let isDragging = false;
    let startX, startY, initialX, initialY;

    element.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = element.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        element.style.left = `${initialX + deltaX}px`;
        element.style.top = `${initialY + deltaY}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.userSelect = '';
    });
}

// Initialize the UI
const deltaUI = new DeltaMathUI();
const answerContainer = document.getElementById('answerContainer');

// Apply drag functionality to UI elements
handleDrag(document.getElementById('Launcher'));
if (answerContainer) {
    handleDrag(answerContainer);
    answerContainer.style.overflow = 'hidden';
    answerContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        answerContainer.scrollTop += e.deltaY;
    });
}