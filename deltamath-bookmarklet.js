/**
 * DeltaMath Answer Extractor Bookmarklet
 * 
 * To use this as a bookmarklet:
 * 1. Create a new bookmark in your browser
 * 2. Name it "DeltaMath Answers"
 * 3. Copy the entire code below (starting with javascript:) as the URL
 * 4. When on a DeltaMath problem page, click the bookmark to extract answers
 */

javascript:(function() {
  // Create a styled container for displaying answers
  function createAnswerDisplay() {
    // Remove any existing display
    const existingDisplay = document.getElementById('dm-answer-display');
    if (existingDisplay) {
      existingDisplay.remove();
    }
    
    // Create new display container
    const display = document.createElement('div');
    display.id = 'dm-answer-display';
    display.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      max-height: 80vh;
      background: #fff;
      border: 2px solid #4CAF50;
      border-radius: 8px;
      padding: 10px;
      z-index: 9999;
      font-family: Arial, sans-serif;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      overflow-y: auto;
    `;
    
    // Add header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #eee;
      padding-bottom: 8px;
      margin-bottom: 10px;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'DeltaMath Answers';
    title.style.margin = '0';
    title.style.color = '#4CAF50';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #555;
    `;
    closeBtn.onclick = () => display.remove();
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    display.appendChild(header);
    
    // Add content container
    const content = document.createElement('div');
    content.id = 'dm-answer-content';
    display.appendChild(content);
    
    // Add copy button
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy All Answers';
    copyBtn.style.cssText = `
      background: #4CAF50;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      margin-top: 10px;
      cursor: pointer;
      width: 100%;
    `;
    display.appendChild(copyBtn);
    
    document.body.appendChild(display);
    
    return { display, content, copyBtn };
  }
  
  // Extract answers from DeltaMath
  function extractDeltaMathAnswers() {
    // Create an object to store all answers
    const answers = {};
    
    // Check for text answers in standard input fields
    const textInputs = document.querySelectorAll('input[type="text"]');
    textInputs.forEach(input => {
      if (input.id) {
        answers[input.id] = input.value.replace(/−/g, "-");
      } else if (input.name) {
        answers[input.name] = input.value.replace(/−/g, "-");
      }
    });
    
    // Check for multiple choice answers
    const radioInputs = document.querySelectorAll('input[type="radio"]:checked');
    radioInputs.forEach(radio => {
      if (radio.name) {
        answers[radio.name] = radio.value;
      }
    });
    
    // Check for MathQuill fields (math input) - Enhanced version
    const mqElements = document.querySelectorAll('.mathquill-editable, .mq-editable-field, .mq-root-block, .mq-math-mode, [class*="mathquill"], [class*="mq-"]');
    mqElements.forEach((mqEl, index) => {
      try {
        // Try to get MathQuill instance using various methods
        let mq = null;
        let latex = "";
        
        // Method 1: Using MQ API if available
        if (window.MQ) {
          if (mqEl.id && window.MQ.MathField) {
            try { mq = window.MQ.MathField(mqEl); } catch (e) {}
          }
          if (!mq && mqEl.id) {
            try { mq = window.MQ(mqEl); } catch (e) {}
          }
          if (mq && typeof mq.latex === 'function') {
            latex = mq.latex();
          }
        }
        
        // Method 2: Try to extract from DOM structure if MQ API failed
        if (!latex) {
          // Look for LaTeX in data attributes
          latex = mqEl.getAttribute('data-latex') || 
                  mqEl.getAttribute('data-math') || 
                  mqEl.getAttribute('data-content');
                  
          // Look for LaTeX in hidden input fields that might be associated
          if (!latex && mqEl.id) {
            const hiddenInput = document.querySelector(`input[type="hidden"][data-mathquill-id="${mqEl.id}"]`);
            if (hiddenInput) {
              latex = hiddenInput.value;
            }
          }
          
          // Extract from inner text as last resort
          if (!latex) {
            // Get text content but preserve math structure
            const textContent = mqEl.textContent.trim();
            if (textContent) {
              latex = textContent;
            }
          }
        }
        
        // Process and store the LaTeX if found
        if (latex) {
          latex = latex.replace(/−/g, "-")
                       .replace(/[^\x00-\x7F]/g, "")
                       .trim();
          
          // Clean up the LaTeX if dmKAS is available
          const cleanedLatex = window.dmKAS ? window.dmKAS.cleanUpLatex(latex) : latex;
          
          // Store with ID if available, otherwise use a generated ID
          const key = mqEl.id || `math-input-${index + 1}`;
          answers[key] = cleanedLatex;
        }
      } catch (e) {
        console.warn('Error extracting MathQuill field:', e);
      }
    });

    
    // Additional check for DeltaMath-specific math input fields
    const dmMathFields = document.querySelectorAll('.dm-math-input, [data-math-field], .math-field, .math-input');
    dmMathFields.forEach((field, index) => {
      if (!field.classList.contains('mathquill-editable') && !field.classList.contains('mq-editable-field')) {
        try {
          const latex = field.getAttribute('data-latex') || 
                       field.getAttribute('data-math') || 
                       field.getAttribute('data-content') || 
                       field.textContent.trim();
          
          if (latex) {
            const key = field.id || `dm-math-${index + 1}`;
            answers[key] = latex.replace(/−/g, "-").replace(/[^\x00-\x7F]/g, "").trim();
          }
        } catch (e) {
          console.warn('Error extracting DeltaMath math field:', e);
        }
      }
    });
    
    // Check for dropdown selects
    const selectElements = document.querySelectorAll('select');
    selectElements.forEach(select => {
      if (select.id) {
        answers[select.id] = select.value;
      } else if (select.name) {
        answers[select.name] = select.value;
      }
    });
    
    // Check for special answer type selector (common in DeltaMath)
    const ansTypeSelect = document.getElementById('ans-type-select');
    if (ansTypeSelect) {
      answers['answerType'] = ansTypeSelect.value;
    }
    
    // Check for graph points if this is a graphing question
    if (window.mypoints && Array.isArray(window.mypoints)) {
      answers['graphPoints'] = window.mypoints;
    }
    
    // Check for the submit-answer-form field
    const submitAnswerForm = document.querySelector('[name="submit-answer-form"]');
    if (submitAnswerForm) {
      answers['submit-answer-form'] = submitAnswerForm.value || "";
    }
    
    // Handle text area answers (for longer text responses)
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
      if (textarea.id) {
        answers[textarea.id] = textarea.value;
      } else if (textarea.name) {
        answers[textarea.name] = textarea.value;
      }
    });
    
    // Check for DeltaMath specific answer fields
    const dmAnswerFields = document.querySelectorAll('.answer-field, .dm-answer-field, [data-answer]');
    dmAnswerFields.forEach(field => {
      const dataAnswer = field.getAttribute('data-answer');
      if (dataAnswer) {
        answers[field.id || `answer-${Object.keys(answers).length}`] = dataAnswer;
      }
    });
    
    // Check for correct answers in the page (sometimes visible in the DOM)
    const correctAnswerElements = document.querySelectorAll('.correct-answer, [data-correct-answer]');
    correctAnswerElements.forEach(el => {
      const correctAnswer = el.getAttribute('data-correct-answer') || el.textContent.trim();
      if (correctAnswer) {
        answers[el.id || `correct-${Object.keys(answers).length}`] = correctAnswer;
      }
    });
    
    // If we didn't find any answers, try to get all form elements with IDs
    if (Object.keys(answers).length === 0) {
      const allElements = document.querySelectorAll('[id]');
      allElements.forEach(el => {
        let value = "";
        if (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA") {
          const inputEl = el;
          value = inputEl.value;
        } else {
          const valueAttr = el.getAttribute('value');
          if (valueAttr !== null) {
            value = valueAttr;
          } else {
            // Try to get inner text for elements that might contain answers
            if (el.classList.contains('answer') || (el.id && el.id.includes('answer'))) {
              value = el.textContent.trim();
            }
          }
        }
        if (value) {
          answers[el.id] = value;
        }
      });
    }
    
    return answers;
  }
  
  // Display answers in the UI
  function displayAnswers(answers) {
    const { display, content, copyBtn } = createAnswerDisplay();
    
    if (Object.keys(answers).length === 0) {
      content.innerHTML = '<p style="color: #F44336;">No answers found!</p>';
      return;
    }
    
    // Create a table for the answers
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    
    // Add each answer to the table
    Object.entries(answers).forEach(([key, value]) => {
      const row = document.createElement('tr');
      
      const keyCell = document.createElement('td');
      keyCell.textContent = key;
      keyCell.style.padding = '5px';
      keyCell.style.borderBottom = '1px solid #eee';
      keyCell.style.fontWeight = 'bold';
      keyCell.style.color = '#2196F3';
      
      const valueCell = document.createElement('td');
      valueCell.textContent = value;
      valueCell.style.padding = '5px';
      valueCell.style.borderBottom = '1px solid #eee';
      
      row.appendChild(keyCell);
      row.appendChild(valueCell);
      table.appendChild(row);
    });
    
    content.appendChild(table);
    
    // Set up copy button functionality
    copyBtn.onclick = () => {
      const answersText = JSON.stringify(answers, null, 2);
      navigator.clipboard.writeText(answersText)
        .then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.textContent = 'Copy All Answers';
          }, 2000);
        })
        .catch(err => {
          copyBtn.textContent = 'Copy Failed';
          console.error('Failed to copy answers:', err);
        });
    };
  }
  
  // Main execution
  const extractedAnswers = extractDeltaMathAnswers();
  displayAnswers(extractedAnswers);
  console.log('DeltaMath Answers:', extractedAnswers);
})();