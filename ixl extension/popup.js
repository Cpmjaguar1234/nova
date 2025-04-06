document.getElementById('capture').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log('Active tab:', tab);

  // Step 1: Inject content script to get element bounding box
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const el = document.querySelector('.math.section');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        devicePixelRatio: window.devicePixelRatio
      };
    }
  });

  console.log('Element bounding box result:', result);

  if (!result) {
    alert("No element with class 'math section' found.");
    return;
  }

  // Step 2: Capture screenshot of the visible tab
  chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
    console.log('Captured data URL:', dataUrl);

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
      console.log('Cropped data URL:', croppedDataUrl);

      const base64Data = croppedDataUrl.split(',')[1];
      console.log('Base64 data:', base64Data);

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

        console.log('AI response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response text:', errorText);
          throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('AI response data:', data);

        // Inject the AI response into the active tab
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (responseText) => {
            let responseDiv = document.getElementById('ai-response');
            if (!responseDiv) {
              responseDiv = document.createElement('div');
              responseDiv.id = 'ai-response'; // Assign an ID for easy access
              responseDiv.style.position = 'absolute'; // Change to absolute positioning
              responseDiv.style.left = '10px'; // Set initial left position
              responseDiv.style.top = '10px'; // Set initial top position
              responseDiv.style.width = 'auto';
              responseDiv.style.height = 'auto';
              responseDiv.style.padding = '10px';
              responseDiv.style.backgroundColor = '#2c2e3b';
              responseDiv.style.color = 'white';
              responseDiv.style.borderRadius = '5px';
              responseDiv.style.zIndex = '10000';
              responseDiv.style.cursor = 'move'; // Change cursor to indicate draggable

              // Make the responseDiv draggable
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

            // Update the content of the responseDiv
            responseDiv.textContent = responseText || 'No answer available';
          },
          args: [data.response]
        });

      } catch (error) {
        console.error('Error processing image:', error);
        const errorMessage = error.message || 'Unknown error occurred';
        alert(`Failed to process image: ${errorMessage}\nPlease try again or contact support if the issue persists.`);
      }
    };
    img.src = dataUrl;
  });
});

// Add click handler to the crisp-button
document.querySelector('.crisp-button')?.addEventListener('click', async () => {
  console.log('Crisp button clicked');
  // Trigger the same process as the capture button
  document.getElementById('capture').click();
});
  