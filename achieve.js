class AssessmentHelper {
    constructor() {
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
      container.innerHTML = `
        <div id="Launcher" class="Launcher" style="outline: none;min-height: 160px;transform: translateX(0px) translateY(0);opacity: 1;font-family: 'Nunito', sans-serif;width: 180px;height: 240px;background: #1c1e2b;position: fixed;border-radius: 12px;display: flex;flex-direction: column;align-items: center;color: white;font-size: 16px;top: 50%;right: 20px;transform: translateY(-50%);z-index: 99999;padding: 16px;box-shadow: 0 4px 8px rgba(0,0,0,0.2);overflow: hidden;white-space: nowrap;">
          <div class="drag-handle" style="width: 100%;height: 24px;cursor: move;background: transparent;position: absolute;top: 0;"></div>
          <img src="https://photowebsite-bigjaguar.us2.pitunnel.net/static/images/example.png" style="width: 90px;height: 90px;margin-top: 32px;border-radius: 50%;">
          <button id="closeButton" style="position: absolute;top: 8px;right: 8px;background: none;border: none;color: white;font-size: 18px;cursor: pointer;padding: 2px 8px;">×</button>
          <button id="getAnswerButton" style="background: #2c2e3b;border: none;color: white;padding: 12px 20px;border-radius: 8px;cursor: pointer;margin-top: 24px;width: 120px;height: 44px;font-size: 16px;transition: background 0.2s ease;">Get Answer</button>
          <div style="position: absolute;bottom: 8px;right: 8px;font-size: 12px;opacity: 0.5;">1.0</div>
        </div>`;
      return container;
    }

    createAnswerUI() {
      const container = document.createElement("div");
      container.innerHTML = `
        <div id="answerContainer" class="answerLauncher" style="outline: none;min-height: 60px;transform: translateX(0px) translateY(0);opacity: 1;font-family: 'Nunito', sans-serif;width: 60px;height: 60px;background: #1c1e2b;position: fixed;border-radius: 8px;display: flex;justify-content: center;align-items: center;color: white;font-size: 24px;top: 50%;right: 220px;transform: translateY(-50%);z-index: 99998;padding: 8px;box-shadow: 0 4px 8px rgba(0,0,0,0.2);overflow: hidden;white-space: normal;display: none;">
          <div class="answer-drag-handle" style="width: 100%;height: 24px;cursor: move;background: transparent;position: absolute;top: 0;"></div>
          <button id="closeAnswerButton" style="position: absolute;top: 8px;right: 8px;background: none;border: none;color: white;font-size: 18px;cursor: pointer;padding: 2px 8px;">×</button>
          <div id="answerContent" style="padding: 0;margin: 0;word-wrap: break-word;font-size: 24px;font-weight: bold;display: flex;justify-content: center;align-items: center;width: 100%;height: 100%;"></div>
        </div>`;
      return container;
    }

    initializeUI() {
      document.body.appendChild(this.itemMetadata.UI);
      document.body.appendChild(this.itemMetadata.answerUI);
      
      // Ensure elements are mounted before setting up event listeners
      setTimeout(() => {
        this.setupEventListeners();
      }, 0);
    }

    async fetchAnswer(includeQuestion = false) {
      try {
        // Get the article content from the specified XPath element
        const startReading = document.evaluate('//*[@id="start-reading"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (!startReading) {
          throw new Error('Could not find article content');
        }

        // Extract only paragraph elements and their text content
        const paragraphs = startReading.getElementsByTagName('p');
        const content = Array.from(paragraphs)
          .map(p => p.textContent.trim())
          .filter(text => text.length > 0)
          .join('\n\n');

        let queryContent = content;

        if (includeQuestion) {
          // Find the question container using MuiPaper base classes that don't change
          const questionContainer = document.querySelector('.MuiPaper-root.MuiPaper-elevation.MuiPaper-rounded.MuiPaper-elevation1.MuiCard-root');
          
          if (questionContainer) {
            // Find the question text
            const questionText = questionContainer.querySelector('#question-text')?.textContent.trim();
            
            // Find all answer options using role attribute and MUI base classes
            const options = Array.from(questionContainer.querySelectorAll('[role="radio"]')).map(option => {
              // Look for elements with MuiTypography classes for letter and text
              const letter = option.querySelector('.MuiTypography-root')?.textContent.trim();
              const text = option.querySelectorAll('.MuiTypography-root')[1]?.textContent.trim();
              return `${letter} ${text}`;
            }).filter(option => option !== ' undefined' && option !== 'undefined undefined').join('\n');

            if (questionText) {
              queryContent = `Question: ${questionText}\n\nOptions:\n${options}\n\nArticle: ${content}\n\nPROVIDE ONLY A ONE-LETTER ANSWER THATS IT NOTHING ELSE (A, B, C, or D).`;
            }
          }
        }

        // Send content to HTTPS API endpoint with proper query parameter
        const response = await fetch(`https://photowebsite-bigjaguar.us2.pitunnel.net/ask?q=${encodeURIComponent(queryContent)}`);

        if (!response.ok) {
          throw new Error('Failed to fetch answer from API');
        }

        const data = await response.json();
        return data.response || 'No answer available';
      } catch (error) {
        console.error('Error:', error);
        return `Error: ${error.message}`;
      }
    }

    setupEventListeners() {
      // Wait for elements to be mounted
      setTimeout(() => {
        const launcher = document.getElementById('Launcher');
        if (!launcher) return;
        
        const closeButton = launcher.querySelector('#closeButton');
        const dragHandle = launcher.querySelector('.drag-handle');
        const sendArticleButton = launcher.querySelector('#sendArticleButton');
        const getAnswerButton = launcher.querySelector('#getAnswerButton');
        const answerContainer = document.getElementById('answerContainer');
        if (!answerContainer) return;

      let isDragging = false;
      let currentX;
      let currentY;
      let initialX;
      let initialY;
      let xOffset = 0;
      let yOffset = 0;

      dragHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
      });

      document.addEventListener('mousemove', (e) => {
        if (isDragging) {
          e.preventDefault();
          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;
          xOffset = currentX;
          yOffset = currentY;
          launcher.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        }
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
      });

      closeButton.addEventListener('click', () => {
        launcher.style.display = 'none';
      });

      let answerIsDragging = false;
      let answerCurrentX;
      let answerCurrentY;
      let answerInitialX;
      let answerInitialY;

      const answerDragHandle = answerContainer.querySelector('.answer-drag-handle');
      const closeAnswerButton = answerContainer.querySelector('#closeAnswerButton');
      const answerContent = answerContainer.querySelector('#answerContent');

      answerDragHandle.addEventListener('mousedown', (e) => {
        answerIsDragging = true;
        answerInitialX = e.clientX - answerContainer.offsetLeft;
        answerInitialY = e.clientY - answerContainer.offsetTop;
      });

      document.addEventListener('mousemove', (e) => {
        if (answerIsDragging) {
          answerCurrentX = e.clientX - answerInitialX;
          answerCurrentY = e.clientY - answerInitialY;
          answerContainer.style.left = `${answerCurrentX}px`;
          answerContainer.style.top = `${answerCurrentY}px`;
        }
      });

      document.addEventListener('mouseup', () => {
        answerIsDragging = false;
      });

      closeAnswerButton.addEventListener('click', () => {
        answerContainer.style.display = 'none';
      });

      getAnswerButton.addEventListener('click', async () => {
        const processQuestion = async () => {
          const answer = await this.fetchAnswer(true);
          answerContent.textContent = answer;
          answerContainer.style.display = 'block';
      
          if (answer && ['A', 'B', 'C', 'D'].includes(answer.trim())) {
            const options = document.querySelectorAll('[role="radio"]');
            const index = answer.trim().charCodeAt(0) - 'A'.charCodeAt(0);
            if (options[index]) {
              options[index].click();
              
              await new Promise(resolve => setTimeout(async () => {
                // Find submit button by text content instead of class
                const submitButton = Array.from(document.querySelectorAll('button'))
                  .find(button => button.textContent.trim() === 'Submit');
                
                if (submitButton) {
                  submitButton.click();
                
                  await new Promise(resolve => setTimeout(async () => {
                    const nextButton = document.getElementById('feedbackActivityFormBtn');
                    if (nextButton) {
                      nextButton.click();
                    
                      await new Promise(resolve => setTimeout(async () => {
                        // Find new submit button by text content
                        const newSubmitButton = Array.from(document.querySelectorAll('button'))
                          .find(button => button.textContent.trim() === 'Submit');
                        const newQuestion = document.querySelector('[role="radio"]');
                        
                        if (newSubmitButton && newQuestion) {
                          await processQuestion();
                        }
                        resolve();
                      }, 1000));
                    }
                    resolve();
                  }, 500));
                }
                resolve();
              }, 500));
            }
          }
        };

        await processQuestion();
      });
    }, 0);
    }
}

// Initialize the helper
const helper = new AssessmentHelper();