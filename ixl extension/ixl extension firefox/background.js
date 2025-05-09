chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture') {
    captureAndProcessHtml();
  } else if (request.action === 'crispButtonClicked') {
    console.log('Crisp button clicked');
  }
});

async function captureAndProcessHtml() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Inject script to extract the HTML of the target element
  const [{ result: html }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const el = document.querySelector('.practice.example-view.recommendations-visible');
      return el ? el.outerHTML : null;
    }
  });

  if (!html) {
    alert('No element with class "practice example-view recommendations-visible" found.');
    return;
  }

  // Show processing message
  await showOverlayMessage(tab.id, 'Processing...');

  try {
    const response = await fetch('https://diverse-observations-vbulletin-occasional.trycloudflare.com/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        html,
        prompt: "Give me the answer, only the answer, nothing else. Dont use latex, express it normally."
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    await showOverlayMessage(tab.id, data.response || 'No answer available');
  } catch (error) {
    console.error(error.toString());
    const errorMessage = error.message || 'Unknown error occurred';
    // Display error in the overlay, now using the helper function
    await showOverlayMessage(tab.id, 'Error: ' + errorMessage, true);
    // alert('Failed to process HTML: ' + errorMessage + '\nPlease try again or contact support if the issue persists.');
  }
}

// Helper function to show messages in an overlay on the current tab
async function showOverlayMessage(tabId, message, isError = false) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (msg, errorFlag) => {
      let responseDiv = document.getElementById('ai-response');
      const closeButtonId = 'ai-response-close-button';

      if (!responseDiv) {
        responseDiv = document.createElement('div');
        responseDiv.id = 'ai-response';
        responseDiv.style.position = 'fixed'; // Use fixed for better positioning relative to viewport
        responseDiv.style.left = '20px';
        responseDiv.style.top = '20px';
        responseDiv.style.minWidth = '200px';
        responseDiv.style.maxWidth = '400px';
        responseDiv.style.padding = '15px';
        responseDiv.style.paddingTop = '30px'; // Extra padding at top for close button
        responseDiv.style.color = 'white';
        responseDiv.style.borderRadius = '8px';
        responseDiv.style.zIndex = '2147483647'; // Max z-index
        responseDiv.style.cursor = 'move';
        responseDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        responseDiv.style.fontFamily = 'Arial, sans-serif';
        responseDiv.style.fontSize = '14px';
        responseDiv.style.lineHeight = '1.6';
        responseDiv.style.overflowWrap = 'break-word'; // Ensure long words break

        // Draggable functionality
        responseDiv.onmousedown = function(event) {
          if (event.target.id === closeButtonId) return;

          let shiftX = event.clientX - responseDiv.getBoundingClientRect().left;
          let shiftY = event.clientY - responseDiv.getBoundingClientRect().top;

          responseDiv.style.userSelect = 'none';

          function moveAt(pageX, pageY) {
            let newLeft = pageX - shiftX;
            let newTop = pageY - shiftY;

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const divWidth = responseDiv.offsetWidth;
            const divHeight = responseDiv.offsetHeight;

            if (newLeft < 0) newLeft = 0;
            if (newTop < 0) newTop = 0;
            if (newLeft + divWidth > viewportWidth) newLeft = viewportWidth - divWidth;
            if (newTop + divHeight > viewportHeight) newTop = viewportHeight - divHeight;

            responseDiv.style.left = newLeft + 'px';
            responseDiv.style.top = newTop + 'px';
          }

          function onMouseMove(event) {
            moveAt(event.pageX, event.pageY);
          }

          document.addEventListener('mousemove', onMouseMove);

          responseDiv.onmouseup = function() {
            document.removeEventListener('mousemove', onMouseMove);
            responseDiv.onmouseup = null;
            responseDiv.style.userSelect = '';
          };
        };

        responseDiv.ondragstart = function() {
          return false;
        };

        // Close button
        let closeButton = document.createElement('button');
        closeButton.id = closeButtonId;
        closeButton.textContent = '×';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '8px';
        closeButton.style.right = '10px';
        closeButton.style.background = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.color = 'rgba(255, 255, 255, 0.7)';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '24px';
        closeButton.style.fontWeight = 'bold';
        closeButton.style.lineHeight = '1';
        closeButton.style.padding = '0';
        closeButton.onmouseover = function() { this.style.color = 'white'; };
        closeButton.onmouseout = function() { this.style.color = 'rgba(255, 255, 255, 0.7)'; };
        closeButton.onclick = function(e) {
          e.stopPropagation();
          responseDiv.remove();
        };
        responseDiv.appendChild(closeButton);

        document.body.appendChild(responseDiv);
      }

      // Update content and style
      responseDiv.style.backgroundColor = errorFlag ? '#e74c3c' : '#34495e'; // Red for error, dark blue/grey otherwise

      // Clear previous message content (but keep the close button)
      while (responseDiv.firstChild && responseDiv.firstChild.id !== closeButtonId) {
        responseDiv.removeChild(responseDiv.firstChild);
      }
      
      const messageNode = document.createElement('span');
      messageNode.textContent = msg;
      // Insert message content before the close button
      const closeBtn = responseDiv.querySelector(`#${closeButtonId}`);
      if (closeBtn) {
        responseDiv.insertBefore(messageNode, closeBtn);
      } else {
        // Should not happen if logic is correct, but as a fallback
        responseDiv.appendChild(messageNode);
      }
      
      // Ensure close button is visible and correctly styled
      let existingCloseButton = responseDiv.querySelector(`#${closeButtonId}`);
      if (existingCloseButton) {
         existingCloseButton.style.display = 'block';
         // Re-apply styles that might be important if div was re-created or for consistency
         existingCloseButton.style.color = 'rgba(255, 255, 255, 0.7)';
      }
    },
    args: [message, isError]
  });
}