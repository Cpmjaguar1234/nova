// Create and inject the UI
function createUI() {
  const uiHTML = `
    <div id="launcher" style="
      font-family: 'Nunito', sans-serif;
      position: fixed;
      top: 20px;
      right: 20px;
      width: 180px;
      height: 240px;
      background: #1c1e2b;
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      border-radius: 12px;
      padding: 16px;
      z-index: 10000;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    ">
      <div id="drag-handle" style="
        width: 100%;
        height: 24px;
        cursor: move;
        background: transparent;
        position: absolute;
        top: 0;
      "></div>
      <img src="https://diverse-observations-vbulletin-occasional.trycloudflare.com/static/images/example.png" 
           style="width: 90px; height: 90px; margin-top: 32px; border-radius: 50%;">
      <button id="capture" style="
        background: #2c2e3b;
        border: none;
        color: white;
        border-radius: 8px;
        cursor: pointer;
        margin-top: 24px;
        width: 120px;
        height: 44px;
        font-size: 16px;
        line-height: 44px;
        text-align: center;
      ">Skip Math</button>
      <div id="preview" style="
        margin-top: 16px;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
      "></div>
    </div>
  `;

  // Create a container for the UI
  const container = document.createElement('div');
  container.innerHTML = uiHTML;
  document.body.appendChild(container.firstElementChild);

  // Add MathJax script
  const mathJaxScript = document.createElement('script');
  mathJaxScript.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
  document.head.appendChild(mathJaxScript);

  // Add Nunito font
  const fontLink = document.createElement('link');
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;700&display=swap';
  fontLink.rel = 'stylesheet';
  document.head.appendChild(fontLink);

  // Make the UI draggable
  const launcher = document.getElementById('launcher');
  const dragHandle = document.getElementById('drag-handle');

  dragHandle.onmousedown = function(event) {
    const shiftX = event.clientX - launcher.getBoundingClientRect().left;
    const shiftY = event.clientY - launcher.getBoundingClientRect().top;

    function moveAt(pageX, pageY) {
      launcher.style.left = pageX - shiftX + 'px';
      launcher.style.top = pageY - shiftY + 'px';
    }

    function onMouseMove(event) {
      moveAt(event.pageX, event.pageY);
    }

    document.addEventListener('mousemove', onMouseMove);

    document.onmouseup = function() {
      document.removeEventListener('mousemove', onMouseMove);
      document.onmouseup = null;
    };
  };

  dragHandle.ondragstart = function() {
    return false;
  };

  // Add click handler for the capture button
  document.getElementById('capture').onclick = captureMathSection;
}

// Initialize the UI when the content script loads
document.addEventListener('DOMContentLoaded', () => {
  createUI();
});

// Listen for messages from the popup with connection check
chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((request) => {
    if (request.action === 'captureMath') {
      const el = document.querySelector('.math.section');
      if (!el) {
        port.postMessage({ error: "No element with class 'math section' found." });
        return;
      }
      const rect = el.getBoundingClientRect();
      port.postMessage({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        devicePixelRatio: window.devicePixelRatio
      });
    }
  });
});

// Function to create or update the response display
function updateResponseDisplay(text) {
  let responseDiv = document.getElementById('ai-response');
  if (!responseDiv) {
    responseDiv = document.createElement('div');
    responseDiv.id = 'ai-response';
    responseDiv.style.position = 'absolute';
    responseDiv.style.left = '10px';
    responseDiv.style.top = '10px';
    responseDiv.style.width = 'auto';
    responseDiv.style.height = 'auto';
    responseDiv.style.padding = '10px';
    responseDiv.style.backgroundColor = '#2c2e3b';
    responseDiv.style.color = 'white';
    responseDiv.style.borderRadius = '5px';
    responseDiv.style.zIndex = '10000';
    responseDiv.style.cursor = 'move';

    // Make the response div draggable
    responseDiv.onmousedown = function(event) {
      let shiftX = event.clientX - responseDiv.getBoundingClientRect().left;
      let shiftY = event.clientY - responseDiv.getBoundingClientRect().top;

      function moveAt(pageX, pageY) {
        responseDiv.style.left = pageX - shiftX + 'px';
        responseDiv.style.top = pageY - shiftY + 'px';
      }

      function onMouseMove(event) {
        moveAt(event.pageX, event.pageY);
      }

      document.addEventListener('mousemove', onMouseMove);

      document.onmouseup = function() {
        document.removeEventListener('mousemove', onMouseMove);
        document.onmouseup = null;
      };
    };

    responseDiv.ondragstart = function() {
      return false;
    };

    document.body.appendChild(responseDiv);
  }

  responseDiv.innerHTML = `\\(${text}\\)`; // Use MathJax syntax for inline math

  // Trigger MathJax to render the LaTeX
  MathJax.typesetPromise([responseDiv]).catch((err) => console.log('MathJax error: ', err));
}

// Listen for response update messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateResponse') {
    updateResponseDisplay(request.text);
  }
});

// Function to capture and process math section
async function captureMathSection() {
  const el = document.querySelector('.math.section');
  if (!el) {
    alert("No element with class 'math section' found.");
    return;
  }

  const rect = el.getBoundingClientRect();
  console.log('Element bounding box:', rect);

  const captureData = {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    devicePixelRatio: window.devicePixelRatio
  };
  console.log('Capture data:', captureData);

  // Establish connection before sending message
  const port = chrome.runtime.connect({ name: 'math-capture' });
  port.postMessage({ action: 'captureTab' });
  
  port.onMessage.addListener(async (dataUrl) => {
    console.log('Captured data URL:', dataUrl);

    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = captureData.width * captureData.devicePixelRatio;
      canvas.height = captureData.height * captureData.devicePixelRatio;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        img,
        captureData.x * captureData.devicePixelRatio,
        captureData.y * captureData.devicePixelRatio,
        captureData.width * captureData.devicePixelRatio,
        captureData.height * captureData.devicePixelRatio,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const croppedDataUrl = canvas.toDataURL('image/png');
      console.log('Cropped data URL:', croppedDataUrl);

      const base64Data = croppedDataUrl.split(',')[1];
      console.log('Base64 data:', base64Data);

      try {
        const response = await fetch('https://diverse-observations-vbulletin-occasional.trycloudflare.com/ask', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            image: base64Data,
            prompt: "Give me the answer in LaTeX format, only the answer, nothing else."
          })
        });

        console.log('AI response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response text:', errorText);
          throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('AI response data:', data);

        updateResponseDisplay(data.response); // Ensure the response is in LaTeX
      } catch (error) {
        console.error('Error processing image:', error);
        const errorMessage = error.message || 'Unknown error occurred';
        alert(`Failed to process image: ${errorMessage}\nPlease try again or contact support if the issue persists.`);
      }
    };
    img.src = dataUrl;
  });
}

// Add click handler to the crisp-button
document.querySelector('.crisp-button')?.addEventListener('click', captureMathSection);