/**
 * DeltaMath Answer Extractor
 * 
 * This script extracts answers from DeltaMath problems and displays them in the console.
 * It can be run in the browser console when on a DeltaMath problem page.
 */

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
          if (el.classList.contains('answer') || el.id.includes('answer')) {
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

/**
 * Copy the extracted answers to clipboard
 */
function copyAnswersToClipboard(answers) {
  const answersText = JSON.stringify(answers, null, 2);
  navigator.clipboard.writeText(answersText)
    .then(() => {
      console.log('Answers copied to clipboard!');
    })
    .catch(err => {
      console.error('Failed to copy answers:', err);
    });
}

/**
 * Display answers in a more readable format
 */
function displayAnswers(answers) {
  console.log('%c DeltaMath Answers ', 'background: #4CAF50; color: white; font-size: 14px; font-weight: bold; padding: 5px;');
  
  if (Object.keys(answers).length === 0) {
    console.log('%c No answers found! ', 'background: #F44336; color: white; font-size: 12px; padding: 3px;');
    console.log('%c Try refreshing the page or make sure you\'re on a DeltaMath problem page. ', 'color: #FF9800; font-size: 12px;');
    return;
  }
  
  // Group answers by type for better organization
  const mathInputs = {};
  const otherInputs = {};
  
  Object.entries(answers).forEach(([key, value]) => {
    if (key.includes('math') || key.includes('mq-')) {
      mathInputs[key] = value;
    } else {
      otherInputs[key] = value;
    }
  });
  
  // Display math inputs first (these are usually the most important)
  if (Object.keys(mathInputs).length > 0) {
    console.log('%c Math Inputs ', 'background: #2196F3; color: white; font-size: 12px; padding: 3px;');
    Object.entries(mathInputs).forEach(([key, value]) => {
      console.log(
        `%c ${key}: %c ${value}`, 
        'color: #2196F3; font-weight: bold;', 
        'color: #000; font-weight: normal;'
      );
    });
  }
  
  // Display other inputs
  if (Object.keys(otherInputs).length > 0) {
    console.log('%c Other Inputs ', 'background: #FF9800; color: white; font-size: 12px; padding: 3px;');
    Object.entries(otherInputs).forEach(([key, value]) => {
      console.log(
        `%c ${key}: %c ${value}`, 
        'color: #FF9800; font-weight: bold;', 
        'color: #000; font-weight: normal;'
      );
    });
  }
  
  console.log('%c End of answers ', 'background: #4CAF50; color: white; font-size: 12px; padding: 3px;');
}

// Execute and log the results
const extractedAnswers = extractDeltaMathAnswers();
displayAnswers(extractedAnswers);
copyAnswersToClipboard(extractedAnswers);

// Return the answers for use in the console
extractedAnswers;