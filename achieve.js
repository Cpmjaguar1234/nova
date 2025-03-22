class AssessmentHelper {
    constructor() {
        this.isDragging = false;
        this.currentX = 0;
        this.currentY = 0;
        this.initialX = 0;
        this.initialY = 0;
        this.xOffset = 0;
        this.yOffset = 0;

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
          <img src="https://achievesite-yyumwafd.us2.pitunnel.net/static/images/example.png" style="width: 90px;height: 90px;margin-top: 32px;border-radius: 50%;">
          <button id="closeButton" style="position: absolute;top: 8px;right: 8px;background: none;border: none;color: white;font-size: 18px;cursor: pointer;padding: 2px 8px;">×</button>
          <button id="getAnswerButton" style="background: #2c2e3b;border: none;color: white;padding: 12px 20px;border-radius: 8px;cursor: pointer;margin-top: 24px;width: 120px;height: 44px;font-size: 16px;transition: background 0.2s ease;">Skip Article</button>
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

    async fetchAnswer(queryContent) {
        try {
            console.log(`Sending POST request with queryContent: ${queryContent}`);
            
            const response = await fetch('https://achievesite-yyumwafd.us2.pitunnel.net/ask', {
                method: 'POST',
                cache: 'no-cache',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ q: queryContent })
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

    async fetchArticleContent() {
        // Select the container with the ID 'start-reading'
        const articleContainer = document.querySelector('#start-reading');
        let articleContent = '';
        if (articleContainer) {
            // Select all <p> elements within the container
            const paragraphs = articleContainer.querySelectorAll('p');
            // Extract and join the text content of each <p> element
            articleContent = Array.from(paragraphs).map(p => p.textContent.trim()).join(' ');
            console.log(`Fetched article content: ${articleContent}`);
        } else {
            console.error('Article content container not found');
        }
    
        // Select the container with the ID 'activity-component-react'
        const questionContainer = document.querySelector('#activity-component-react');
        let questionContent = '';
        if (questionContainer) {
            // Extract the text content of the container
            questionContent = questionContainer.textContent.trim();
            console.log(`Fetched question content: ${questionContent}`);
        } else {
            console.error('Question content container not found');
        }
    
        // Combine article and question content
        const combinedContent = `${articleContent}\n\n${questionContent}`;
        return combinedContent;
    }

    setupEventListeners() {
        setTimeout(() => {
            const launcher = document.getElementById('Launcher');
            if (!launcher) return;
            
            const closeButton = launcher.querySelector('#closeButton');
            const dragHandle = launcher.querySelector('.drag-handle');
            const sendArticleButton = launcher.querySelector('#sendArticleButton');
            const getAnswerButton = launcher.querySelector('#getAnswerButton');
            const answerContainer = document.getElementById('answerContainer');
            if (!answerContainer) return;

            // Only start drag on handle
            dragHandle.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent text selection
                this.isDragging = true;
                launcher.style.position = 'fixed';
                const rect = launcher.getBoundingClientRect();
                launcher.style.right = null;
                launcher.style.transform = 'none';
                launcher.style.left = `${rect.left}px`;
                launcher.style.top = `${rect.top}px`;
                
                this.initialX = e.clientX;
                this.initialY = e.clientY;
                this.xOffset = rect.left;
                this.yOffset = rect.top;
            });

            // Keep mousemove on document for smooth tracking
            document.addEventListener('mousemove', (e) => {
                if (this.isDragging) {
                    e.preventDefault();
                    const deltaX = e.clientX - this.initialX;
                    const deltaY = e.clientY - this.initialY;
                    const newX = this.xOffset + deltaX;
                    const newY = this.yOffset + deltaY;
                    launcher.style.left = `${newX}px`;
                    launcher.style.top = `${newY}px`;
                }
            });

            // Keep mouseup on document
            document.addEventListener('mouseup', () => {
                this.isDragging = false;
                console.log('Drag ended');
            });

            // Cleanup drag if mouse leaves the window
            document.addEventListener('mouseleave', () => {
                this.isDragging = false;
            });

            document.addEventListener('mouseup', () => {
                this.isDragging = false;
                console.log('Drag ended');
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
                console.log('Skip Article button clicked');
    
                const processQuestion = async (excludedAnswers = []) => {
                    try {
                        let queryContent = await this.fetchArticleContent();
                        console.log(`Fetched article content: ${queryContent}`);
                        
                        queryContent += "\n\nPROVIDE ONLY A ONE-LETTER ANSWER THAT'S IT NOTHING ELSE (A, B, C, or D).";
    
                        // Add prompt to avoid excluded answers
                        if (excludedAnswers.length > 0) {
                            queryContent += `\n\nDon't pick letter ${excludedAnswers.join(', ')}.`;
                        }
    
                        const answer = await this.fetchAnswer(queryContent);
                        console.log(`Received answer: ${answer}`);
                        answerContent.textContent = answer;
                        answerContainer.style.display = 'block';
    
                        if (answer && ['A', 'B', 'C', 'D'].includes(answer.trim()) && !excludedAnswers.includes(answer.trim())) {
                            const options = document.querySelectorAll('[role="radio"]');
                            const index = answer.trim().charCodeAt(0) - 'A'.charCodeAt(0);
    
                            if (options[index]) {
                                options[index].click();
    
                                await new Promise(resolve => setTimeout(async () => {
                                    const submitButton = Array.from(document.querySelectorAll('button'))
                                        .find(button => button.textContent.trim() === 'Submit');
    
                                    if (submitButton) {
                                        submitButton.click();
    
                                        await new Promise(resolve => setTimeout(async () => {
                                            const feedbackText = document.evaluate('//*[@id="feedbackActivityFormlive"]/p/text()[1]', document, null, XPathResult.STRING_TYPE, null).stringValue;
                                            
                                            const nextButton = document.getElementById('feedbackActivityFormBtn');
                                            if (nextButton) {
                                                nextButton.click();
    
                                                await new Promise(resolve => setTimeout(async () => {
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
                    } catch (error) {
                        console.error('Error:', error);
                    }
                };
    
                await processQuestion();
            });
        }, 0);
    }
}

// Initialize the helper
const helper = new AssessmentHelper();
