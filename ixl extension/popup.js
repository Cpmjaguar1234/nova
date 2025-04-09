document.addEventListener('DOMContentLoaded', () => {
  const captureButton = document.getElementById('capture');
  if (!captureButton) {
    console.error('Capture button not found');
    return;
  }

  captureButton.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // Inject a logging function into the webpage
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (message) => {
        console.log(message);
      },
      args: ['Active tab: ' + JSON.stringify(tab)]
    });

    // Step 1: Inject content script to get element bounding box
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const el = document.querySelector('.ixl-practice-crate');
        if (!el) return null;
        // Add padding to ensure clarity
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

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (message) => {
        console.log(message);
      },
      args: ['Element bounding box result: ' + JSON.stringify(result)]
    });

    if (!result) {
      alert("No practice question element found.");
      return;
    }

    // Step 2: Capture screenshot of the visible tab
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (message) => {
          console.log(message);
        },
        args: ['Captured data URL: ' + dataUrl.substring(0, 100) + '...']
      });

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
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (message) => {
            console.log(message);
          },
          args: ['Cropped data URL: ' + croppedDataUrl.substring(0, 100) + '...']
        });

        const base64Data = croppedDataUrl.split(',')[1];
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (message) => {
            console.log(message);
          },
          args: ['Base64 data: ' + base64Data.substring(0, 100) + '...']
        });

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

          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (message) => {
              console.log(message);
            },
            args: ['AI response status: ' + response.status]
          });

          if (!response.ok) {
            const errorText = await response.text();
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (message) => {
                console.error(message);
              },
              args: ['Error response text: ' + errorText]
            });
            throw new Error(`Server responded with ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (message) => {
              console.log(message);
            },
            args: ['AI response data: ' + JSON.stringify(data)]
          });

          // Inject the AI response into the active tab
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

              responseDiv.textContent = responseText || 'No answer available';

              // Inject script to handle submit button clicks
              const script = document.createElement('script');
              script.textContent = `
                document.querySelectorAll('button.crisp-button').forEach(button => {
                  if (button.textContent.trim() === 'Submit') {
                    button.addEventListener('click', () => {
                      console.log('Submit button clicked, waiting 2 seconds...');
                      setTimeout(() => {
                        console.log('Capturing next question...');
                        document.getElementById('capture').click();
                      }, 2000);
                    });
                    console.log("✅ Added listener to a 'Submit' button.");
                  }
                });
              `;
              document.head.appendChild(script);
            },
            args: [data.response]
          });

        } catch (error) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (message) => {
              console.error(message);
            },
            args: ['Error processing image: ' + error.toString()]
          });
          const errorMessage = error.message || 'Unknown error occurred';
          alert(`Failed to process image: ${errorMessage}\nPlease try again or contact support if the issue persists.`);
        }
      };
      img.src = dataUrl;
    });
  });

  // Add click handler to the crisp-button if it exists
  const crispButton = document.querySelector('.crisp-button');
  if (crispButton) {
    crispButton.addEventListener('click', async () => {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (message) => {
          console.log(message);
        },
        args: ['Crisp button clicked']
      });
      captureButton.click();
    });
  }
});
  