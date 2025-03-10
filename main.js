class AssessmentHelper {
  constructor() {
    this.itemMetadata = {
      questions: LearnosityAssess.getCurrentItem().questions,
      UI: this.createUI(),
      answerUI: this.createAnswerUI()
    };
    this.processedQuestions = new Map();
    this.initializeUI();
  }

  createUI() {
    const container = document.createElement("div");
    container.innerHTML = `
      <div id="Launcher" class="Launcher" style="outline: none;min-height: 160px;transform: 
      translateX(0px) translateY(-32px);opacity: 0.95;font-family: 'Nunito', sans-serif;width: 140px;height: 180px;background: 
      #1c1e2b;position: absolute;border-radius: 16px;display: grid;place-items: center;color: white;font-size: larger;top: 213px;left: 1141px; position:absolute; z-index: 99999;padding: 10px;box-shadow: 0 8px 16px rgba(0,0,0,0.3);resize: both;overflow: hidden;white-space: nowrap;">
        <div class="drag-handle" style="width: 100%; height: 20px; cursor: move; background: transparent;"></div>
        <button id="closeButton" style="position: absolute; top: 5px; right: 5px; background: none; border: none; color: white; font-size: 16px; cursor: pointer;">×</button>
        <svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="24" height="18.6" viewBox="0 0 300.000000 233.000000" class="center" style="margin: 2px;">
            <g transform="translate(0.000000,233.000000) scale(0.100000,-0.100000)" fill="white" stroke="none">
              <path d="M710 2280 c-16 -16 -20 -33 -20 -80 l0 -60 -64 0 c-56 0 -67 -3 -80 -22 -21 -30 -20 -50 4 -76 17 -18 32 -22 80 -22 l60 0 0 -53 c0 -62 20 -97 56 -97 53 0 64 15 64 85 l0 65 60 0 c87 0 124 42 84 98 -13 19 -24 22 -80 22 l-64 0 0 64 c0 56 -3 67 -22 80 -30 21 -54 20 -78 -4z m63 -47 c2 -10 5 -31 6 -47 2 -40 27 -76 54 -78 12 0 35 -2 50 -3 69 -5 51 -41 -23 -46 -54 -4 -80 -31 -80 -82 0 -36 -24 -72 -41 -62 -5 4 -9 24 -9 46 0 55 -41 97 -94 97 -21 0 -43 5 -49 11 -16 16 21 40 64 41 44 0 65 22 74 75 4 22 8 46 10 53 6 18 33 15 38 -5z"/>
            <path d="M2680 2210 c-277 -5 -296 -9 -356 -68 -28 -29 -84 -106 -84 -117 0 -4 -8 -19 -18 -33 -11 -15 -41 -67 -67 -117 -26 -49 -58 -106 -70 -125 -20 -33 -53 -91 -113 -201 l-25 -47 118 -182 c65 -100 129 -189 142 -197 13 -9 40 -21 61 -28 32 -11 37 -18 38 -45 1 -40 18 -58 42 -43 14 9 17 25 16 89 -2 89 -10 92 79 -30 78 -106 99 -89 95 75 l-3 114 -25 0 c-25 0 -25 -1 -21 -74 2 -47 0 -72 -7 -70 -6 2 -27 29 -47 59 l-37 55 21 40 c22 42 53 98 86 153 22 36 50 41 106 18 41 -17 69 -41 93 -78 31 -47 96 -34 96 20 0 38 -95 125 -160 147 -30 10 -57 19 -59 21 -2 2 4 16 14 31 31 47 365 631 365 638 0 3 -6 4 -12 3 -7 -1 -128 -5 -268 -8z m93 -39 c68 -1 107 -5 107 -12 0 -6 -61 -117 -137 -247 -146 -255 -193 -343 -193 -365 0 -8 7 -20 15 -27 23 -19 18 -30 -14 -30 -22 0 -38 -10 -63 -39 -49 -57 -119 -189 -120 -225 -1 -17 -9 -42 -19 -55 -11 -13 -19 -30 -19 -37 0 -20 -18 -17 -70 9 -42 22 -64 48 -155 190 -5 8 -31 46 -57 85 -27 38 -48 77 -48 86 0 8 8 30 18 48 102 181 230 412 249 449 30 58 88 120 134 145 30 17 167 32 244 28 11 -1 68 -2 128 -3z"/>
            <path d="M1355 2194 c-79 -21 -205 -89 -260 -140 -27 -25 -41 -42 -30 -39 150 52 295 45 432 -21 32 -15 61 -30 64 -31 4 -2 10 8 13 22 7 29 59 65 94 65 55 0 104 -44 121 -107 14 -52 41 -70 81 -53 49 20 47 77 -4 164 -37 63 -100 101 -237 145 -47 15 -211 12 -274 -5z m39 -36 c-6 -10 -5 -10 7 -1 9 7 52 11 112 11 164 0 286 -61 335 -167 20 -44 22 -55 11 -62 -21 -13 -29 -11 -29 10 0 11 -4 22 -10 26 -5 3 -6 13 -3 23 3 9 3 14 -2 10 -4 -4 -19 7 -32 24 -12 18 -23 29 -23 24 0 -4 -10 0 -22 8 -45 32 -126 18 -176 -31 -18 -17 -29 -16 -78 6 -55 25 -133 41 -199 41 -30 0 -56 4 -59 9 -4 5 13 18 36 29 65 30 81 35 100 33 9 -1 19 3 23 9 3 5 8 10 11 10 3 0 2 -6 -2 -12z"/>
            <path d="M1053 1829 c-81 -10 -186 -61 -243 -119 -38 -38 -82 -103 -156 -235 -12 -21 -92 -151 -137 -222 -41 -64 -16 -52 40 20 152 192 224 237 382 237 87 0 126 -12 199 -58 78 -50 93 -71 342 -472 263 -423 275 -439 373 -491 144 -77 285 -78 432 -4 85 44 135 100 232 266 49 85 111 189 138 232 26 42 46 79 43 82 -2 3 -37 -35 -76 -84 -39 -48 -90 -105 -113 -126 -157 -142 -411 -121 -536 44 -19 25 -91 136 -160 246 -359 571 -353 562 -437 617 -93 60 -200 82 -323 67z m199 -49 c127 -42 182 -94 283 -262 59 -98 109 -179 162 -261 36 -54 74 -115 86 -137 116 -206 206 -314 304 -362 56 -28 79 -33 158 -36 81 -4 98 -1 159 23 37 15 69 25 71 23 9 -8 -81 -145 -120 -183 -77 -75 -210 -122 -314 -112 -163 16 -249 83 -388 303 -7 10 -40 64 -74 119 -34 55 -69 111 -78 125 -8 14 -16 28 -16 32 0 3 -12 19 -26 35 -14 16 -28 36 -31 44 -4 9 -44 74 -91 145 -112 171 -177 227 -296 258 -72 18 -139 20 -196 5 -22 -6 -48 -11 -57 -12 -10 -1 -18 -4 -18 -8 0 -4 -14 -12 -30 -18 l-31 -10 33 62 c64 119 200 233 276 231 12 -1 22 2 22 7 0 15 158 7 212 -11z"/>
            <path d="M1632 1808 c-7 -7 -12 -27 -12 -45 0 -31 -2 -33 -34 -33 -38 0 -60 -19 -50 -44 6 -17 40 -29 65 -24 10 2 15 -8 17 -34 2 -27 9 -39 24 -44 27 -8 42 9 42 48 1 29 4 33 26 30 36 -4 64 19 56 46 -6 18 -15 22 -48 22 -40 0 -40 0 -34 31 4 24 2 35 -11 45 -22 17 -26 17 -41 2z m36 -95 c11 -22 5 -43 -13 -43 -21 0 -35 31 -21 46 15 18 24 17 34 -3z"/>
            <path d="M2756 1648 c-21 -30 -20 -44 4 -68 38 -38 90 -15 90 40 0 50 -66 69 -94 28z"/>
            <path d="M702 1194 c-60 -30 -99 -72 -156 -171 -23 -39 -148 -248 -278 -466 l-238 -395 0 -61 0 -62 273 3 c390 4 354 -22 623 445 32 56 62 102 66 103 4 0 24 -28 44 -62 108 -178 186 -288 242 -339 165 -153 411 -192 632 -99 80 34 241 152 226 167 -3 3 -11 1 -18 -4 -49 -37 -200 -43 -316 -12 -163 44 -271 131 -376 306 -21 35 -39 63 -41 63 -3 0 -19 -9 -37 -20 -67 -41 -155 -13 -185 57 -23 56 -12 101 36 144 l39 35 -103 156 c-135 203 -180 238 -313 238 -53 0 -79 -6 -120 -26z m224 -32 c21 -11 48 -28 59 -39 32 -29 104 -130 98 -137 -3 -3 2 -8 11 -12 9 -3 16 -12 16 -20 0 -8 5 -14 10 -14 6 0 10 -5 10 -11 0 -6 9 -24 21 -40 21 -30 33 -69 20 -69 -4 0 -17 -17 -29 -39 -27 -48 -28 -112 -2 -166 11 -22 19 -36 20 -32 0 4 10 -1 21 -12 17 -15 20 -27 16 -50 -8 -40 35 -95 68 -89 20 4 21 3 10 -19 -17 -32 -9 -59 26 -84 29 -20 30 -20 61 -2 17 10 35 29 40 42 7 20 3 29 -28 57 -19 19 -39 32 -43 30 -3 -2 -6 15 -6 39 0 37 3 45 23 50 26 6 38 -3 72 -60 33 -54 38 -60 90 -114 108 -113 223 -170 371 -186 65 -8 79 -12 79 -24 0 -9 -15 -16 -133 -57 -131 -46 -301 -27 -436 49 -59 33 -181 149 -181 173 0 8 -4 14 -10 14 -5 0 -10 7 -10 15 0 8 -5 15 -11 15 -5 0 -8 4 -5 9 4 5 3 11 -1 13 -8 3 -27 31 -85 124 -25 38 -84 104 -94 104 -3 0 -12 -6 -20 -14 -7 -8 -18 -16 -23 -18 -11 -4 -161 -254 -161 -268 0 -6 -3 -10 -8 -10 -4 0 -18 -21 -32 -47 -39 -76 -88 -129 -146 -158 -53 -27 -57 -27 -246 -27 -106 -1 -214 0 -240 1 l-48 1 0 36 c0 30 30 105 50 124 3 3 11 16 18 30 7 14 24 43 37 65 14 22 28 47 32 55 7 16 77 127 90 145 5 6 17 28 28 50 11 21 25 43 31 49 5 6 20 31 33 56 12 25 47 83 77 130 30 47 68 111 86 143 17 31 34 57 38 57 4 0 11 11 14 24 10 38 68 94 127 119 64 29 137 28 195 -1z m359 -642 c18 -20 18 -21 -3 -42 -17 -18 -23 -19 -36 -8 -19 15 -21 41 -4 58 16 16 22 15 43 -8z"/>
          </g>
        </svg>
        <h1 class="title" style="font-size: 22px; margin: 5px 0;">Nova</h1>
        <h1 class="bottomTitle" style="font-size: 12px; margin: 3px 0;">1.0</h1>
        <button id="answer" class="button" style="font-size: 12px; padding: 8px 16px; background: #2c2f3f; border: none; color: white; border-radius: 6px; cursor: pointer; margin-bottom: 8px;">Get Answer</button>
        <div class="watermark" style="position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); font-size: 10px; color: rgba(255, 255, 255, 0.5); white-space: nowrap;">2025 - cpmjaguar1234</div>
      </div>
    `;
    return container;
  }

  createAnswerUI() {
    const answerContainer = document.createElement("div");
    answerContainer.innerHTML = `
      <div id="AnswerLauncher" class="AnswerLauncher" style="outline: none;min-height: 100px;transform: 
      translateX(0px) translateY(-32px);opacity: 0.95;font-family: 'Nunito', sans-serif;width: 200px;height: auto;background: 
      #1c1e2b;position: absolute;border-radius: 16px;display: grid;place-items: center;color: white;font-size: larger;top: 300px;left: 21px; position:absolute; z-index: 99999;padding: 10px;box-shadow: 0 8px 16px rgba(0,0,0,0.3);resize: both;overflow: hidden;">
        <div class="drag-handle" style="width: 100%; height: 20px; cursor: move; background: transparent;"></div>
        <div id="answerSection" style="color: white; font-size: 14px; background: #2c2f3f; padding: 5px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); width: 100%; overflow: auto; max-height: 100px;"></div>
      </div>
    `;
    return answerContainer;
  }

  initializeUI() {
    document.body.appendChild(this.itemMetadata.UI);
    document.body.appendChild(this.itemMetadata.answerUI);
    this.makeDraggable(this.itemMetadata.UI.firstElementChild);
    this.makeDraggable(this.itemMetadata.answerUI.firstElementChild); // Make the answer UI draggable
    this.makeResizable(this.itemMetadata.UI.firstElementChild);
    this.setupAnswerButton();
    this.setupToggleVisibility();
    
    // Setup close button functionality
    const closeButton = document.getElementById('closeButton');
    if (closeButton) {
      closeButton.onclick = () => {
        document.body.removeChild(this.itemMetadata.UI);
        document.body.removeChild(this.itemMetadata.answerUI);
      };
    }
  }

  setupToggleVisibility() {
    document.addEventListener('keydown', (event) => {
      if (event.altKey && event.code === 'KeyC') {
        const launcher = document.getElementById('Launcher');
        const answerLauncher = document.getElementById('AnswerLauncher');
        const newDisplay = launcher.style.display === 'none' ? 'block' : 'none';
        launcher.style.display = newDisplay;
        answerLauncher.style.display = newDisplay;
      }
      // Handle both Alt + X and Ctrl + V for getting answers
      else if ((event.altKey && event.code === 'KeyX') || (event.ctrlKey && event.code === 'KeyV')) {
        this.getQuestionAnswers();
      }
    });
  }

  makeResizable(element) {
    const minWidth = 200;
    const minHeight = 200;
  
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        

  
        if (width < minWidth) element.style.width = minWidth + 'px';
        if (height < minHeight) element.style.height = minHeight + 'px';
  
        // Scale the title and button appropriately
        const scale = Math.min(width / minWidth, height / minHeight, 2); // max scale of 2
        const title = element.querySelector('.title');
        const bottomTitle = element.querySelector('.bottomTitle');
        const button = element.querySelector('.button');
        const answerSection = element.querySelector('#answerSection');
        const svg = element.querySelector('svg');
  
        if (title) title.style.fontSize = (28 * scale) + 'px';
        if (bottomTitle) bottomTitle.style.fontSize = (14 * scale) + 'px';
        if (button) {
          button.style.width = (Math.min(width - 40, 360)) + 'px';
          button.style.fontSize = (14 * scale) + 'px';
          button.style.padding = (10 * scale) + 'px ' + (20 * scale) + 'px';
        }
        if (answerSection) {
          answerSection.style.width = button.style.width;
          answerSection.style.fontSize = (14 * scale) + 'px';
          answerSection.style.maxHeight = (height - 200) + 'px';
        }
        if (svg) {
          const svgSize = Math.min(width, height) * 0.32; // SVG size will be 20% of the smaller container dimension
          svg.style.width = svgSize + 'px';
          svg.style.height = svgSize + 'px';
          svg.setAttribute('width', svgSize);
          svg.setAttribute('height', svgSize);
        }
      }
    });
  
    resizeObserver.observe(element);
  }

  setupAnswerButton() {
    const answerButtons = document.querySelectorAll('.button');
    answerButtons.forEach(button => {
      button.onclick = () => this.getQuestionAnswers();
    });
  }

  getQuestionAnswers() {
    const currentQuestions = LearnosityAssess.getCurrentItem().questions;
    const answerSection = document.getElementById('answerSection');
    answerSection.innerHTML = ''; // Clear previous answers
    
    let allAnswers = [];
  
    for (let i = 0; i < currentQuestions.length; i++) {
      const question = currentQuestions[i];
      const type = question.type;
      
      let answers = [];
  
      if (type === "clozeassociation") {
        const validResponse = question.validation.valid_response;
        for (let j = 0; j < validResponse.value.length; j++) {
          answers.push(validResponse.value[j].toString());
        }
      } 
      else if (type === "clozeformula") {
        const validResponse = question.validation.valid_response;
        for (let j = 0; j < validResponse.value.length; j++) {
          answers.push(validResponse.value[j][0].value.toString());
        }
      } 
      else if (type === "longtypeV2" || type === 'longtextV2') {
        answers.push("Since this is a long answer, it can't be solved using the api. Instead, use Gemini or Google.");
      } 
      else if (type === "mcq") {
        const validResponse = question.validation.valid_response;
        for (let j = 0; j < validResponse.value.length; j++) {
          const answerIndex = validResponse.value[j];
          answers.push(answerIndex.toString());
        }
      } 
      else if (type === "clozedropdown") {
        const validResponse = question.validation.valid_response;
        for (let j = 0; j < validResponse.value.length; j++) {
          answers.push(validResponse.value[j].toString());
        }
      } 
      else if (type === "graphplotting") {
        const validResponse = question.validation.valid_response;
        for (let j = 0; j < validResponse.value.length; j++) {
          if (validResponse.value[j].type === "point") {
            const coords = JSON.stringify(validResponse.value[j].coords);
            answers.push(coords);
          }
        }
      }
  
      // Display answers in the answer section
      const answerText = answers.join(', ');
      answerSection.innerHTML += `<p>${answerText}</p>`;
      allAnswers.push(answerText);
    }

    // Copy all answers to clipboard
    const clipboardText = allAnswers.join('\n');
    navigator.clipboard.writeText(clipboardText).catch(err => {
      console.error('Failed to copy answers to clipboard:', err);
    });
  }

  getAnswerHandler(type) {
    const handlers = {
      clozeassociation: (q) => this.handleClozeAssociation(q),
      clozeformula: (q) => this.handleClozeFormula(q),
      longtypeV2: () => this.handleLongText(),
      longtextV2: () => this.handleLongText(),
      mcq: (q) => this.handleMCQ(q),
      clozedropdown: (q) => this.handleClozeDropdown(q),
      graphplotting: (q) => this.handleGraphPlotting(q)
    };
    return handlers[type];
  }

  handleClozeAssociation(question) {
    return question.validation.valid_response.value[0];
  }

  handleClozeFormula(question) {
    return question.validation.valid_response.value[0][0].value;
  }

  handleLongText() {
    return null;
  }

  handleMCQ(question) {
    const mcqMap = { 0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F', 6: 'G', 7: 'H', 8: 'I', 9: 'J' };
    const validResponses = question.validation.valid_response.value;
    const answers = validResponses.map(answerIndex => mcqMap[answerIndex]);
    return answers.join(', ');
  }

  handleClozeDropdown(question) {
    return question.validation.valid_response.value[0];
  }

  handleGraphPlotting(question) {
    const value = question.validation.valid_response.value[0];
    if (value.type === "point") {
      return JSON.stringify(value.coords);
    }
    return null;
  }

  makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
    const dragMouseDown = (e) => {
      e = e || window.event;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    };
  
    const elementDrag = (e) => {
      e = e || window.event;
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = (element.offsetTop - pos2) + 'px';
      element.style.left = (element.offsetLeft - pos1) + 'px';
      

    };
  
    const closeDragElement = () => {
      document.onmouseup = null;
      document.onmousemove = null;
    };
  
    // Enable dragging only when clicking on a specific part of the UI
    const dragHandle = element.querySelector('.drag-handle');
    if (dragHandle) {
      dragHandle.onmousedown = dragMouseDown;
    }
  }
}

// Initialize the helper when the script loads
const assessmentHelper = new AssessmentHelper();