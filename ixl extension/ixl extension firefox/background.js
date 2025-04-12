chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture') {
    captureAndProcessImage();
  } else if (request.action === 'crispButtonClicked') {
    console.log('Crisp button clicked');
  }
});

async function captureAndProcessImage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Step 1: Inject content script to get element bounding box
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      console.log('Looking for element with class "practice recommendations-visible"');
      const el = document.querySelector('.practice.recommendations-visible');
      if (!el) {
        console.log('Element not found');
        return null;
      }
      console.log('Element found:', el);
      const padding = 20;
      const rect = el.getBoundingClientRect();
      return {
        x: Math.max(0, rect.left - padding),
        y: Math.max(0, rect.top - padding),
        width: rect.width + (padding * 2),
        height: rect.height + (padding * 2),
        devicePixelRatio: window.devicePixelRatio
      };
    }
  });

  if (!result) {
    alert("No practice recommendations element found.");
    return;
  }

  // Step 2: Capture screenshot of the visible tab
  const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });

  const img = new Image();
  img.onload = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = result.width * result.devicePixelRatio;
    canvas.height = result.height * result.devicePixelRatio;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      img,
      result.x * result.devicePixelRatio,
      result.y * result.devicePixelRatio,
      result.width * result.devicePixelRatio,
      result.height * result.devicePixelRatio,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedDataUrl = canvas.toDataURL('image/png');
    const base64Data = croppedDataUrl.split(',')[1];

    // Send the image to the AI endpoint
    try {
      const response = await fetch('https://diverse-observations-vbulletin-occasional.trycloudflare.com/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          image: base64Data,
          prompt: "Give me the answer, only the answer, nothing else. Dont use latex, express it normally."
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (responseText) => {
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

          responseDiv.textContent = responseText || 'No answer available';
        },
        args: [data.response]
      });

    } catch (error) {
      console.error(error.toString());
      const errorMessage = error.message || 'Unknown error occurred';
      alert('Failed to process image: ' + errorMessage + '\nPlease try again or contact support if the issue persists.');
    }
  };
  img.src = dataUrl;
}