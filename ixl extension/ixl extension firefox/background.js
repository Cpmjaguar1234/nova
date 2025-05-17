chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture') {
    captureAndProcessHtml();
  } else if (request.action === 'crispButtonClicked') {
    console.log('Crisp button clicked');
  }
});

async function captureAndProcessHtml() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Inject script to extract the raw HTML and instructions from the ixl-html-crate element
  const [{ result: extraction }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      let html = '';
      let instructions = '';
      let crateEl = document.querySelector('.ixl-practice-crate');
      if (crateEl) {
        html = crateEl.outerHTML;
        const clone = crateEl.cloneNode(true);
        clone.querySelectorAll('input').forEach(input => input.value = '');
        instructions = clone.innerText || '';
      } else {
        // Fallback: try to find .math.section
        const mathSection = document.querySelector('.math.section');
        if (mathSection) {
          html = mathSection.outerHTML;
          const clone = mathSection.cloneNode(true);
          clone.querySelectorAll('input').forEach(input => input.value = '');
          instructions = clone.innerText || '';
        }
      }
      return { html, instructions };
    }
  });

  if (!extraction || !extraction.html) {
    alert('No .ixl-html-crate or .math.section element found on the page.');
    return;
  }

  await showOverlayMessage(tab.id, 'Processing...');

  try {
    const response = await fetch('https://diverse-observations-vbulletin-occasional.trycloudflare.com/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        html: extraction.html,
        instructions: extraction.instructions,
        prompt: "Given the input, provide the final answer(s) only. Do not include steps or explanations. If there are multiple answers, separate them with a comma."
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    await showOverlayMessage(tab.id, data.response || data.error || JSON.stringify(data) || 'No answer available');
  } catch (error) {
    console.error(error.toString());
    const errorMessage = error.message || 'Unknown error occurred';
    await showOverlayMessage(tab.id, 'Error: ' + errorMessage, true);
  }
}

// Helper function to show messages in an overlay on the current tab
async function showOverlayMessage(tabId, message, isError = false) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (msg, errorFlag) => {
      let responseDiv = document.getElementById('ai-response');
      const closeButtonId = 'ai-response-close-button';
      const messageContentId = 'ai-response-message-content';
      const dragHandleId = 'ai-response-drag-handle';

      if (!responseDiv) {
        responseDiv = document.createElement('div');
        responseDiv.id = 'ai-response';
        // Styles inspired by deltamath.js launcher
        responseDiv.style.cssText = `
          outline: none;
          min-height: 60px; /* Adjusted from deltamath's 160px for answer display */
          opacity: 1;
          font-family: 'Nunito', sans-serif; /* Match deltamath.js font */
          width: 280px; /* Adjusted width */
          height: auto;
          max-height: 350px; /* Max height for content */
          background: #1c1e2b; /* Match deltamath.js background */
          position: fixed;
          left: 20px;
          top: 20px;
          border-radius: 12px; /* Match deltamath.js border-radius */
          color: white;
          font-size: 14px; /* Adjusted font size */
          z-index: 2147483647;
          padding: 16px;
          padding-top: 40px; /* Space for drag handle and close button */
          box-shadow: 0 4px 12px rgba(0,0,0,0.3); /* Match deltamath.js shadow */
          overflow: auto; /* Changed from hidden to auto for content scroll */
          white-space: normal; /* Allow text wrapping */
          display: flex; /* For centering content if needed, or column layout */
          flex-direction: column;
          align-items: flex-start; /* Align text to start */
          transition: transform 0.3s ease-out, opacity 0.3s ease-out, box-shadow 0.3s ease-out;
          box-sizing: border-box;
        `;

        // Create Drag Handle (inspired by deltamath.js)
        const dragHandle = document.createElement("div");
        dragHandle.id = dragHandleId;
        dragHandle.style.cssText = `
          width: 100%;
          height: 24px;
          cursor: move;
          background: rgba(255,255,255,0.05);
          position: absolute;
          top: 0;
          left: 0;
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
          display: flex;
          justify-content: center;
          align-items: center;
        `;

        const dragIndicator = document.createElement("div");
        dragIndicator.style.cssText = `
          width: 40px;
          height: 4px;
          background: rgba(255,255,255,0.3);
          border-radius: 2px;
        `;
        dragHandle.appendChild(dragIndicator);
        responseDiv.appendChild(dragHandle);

        // --- Next Question Button ---
        const nextQuestionButton = document.createElement('button');
        nextQuestionButton.id = 'ai-response-next-question-button';
        nextQuestionButton.textContent = 'Next Question';
        nextQuestionButton.style.cssText = `
          position: absolute;
          bottom: 16px;
          right: 16px;
          background: #2c2e3b;
          border: none;
          color: white;
          padding: 6px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s ease, transform 0.1s ease;
          opacity: 0.85;
          z-index: 2;
        `;
        nextQuestionButton.onmouseover = function() { this.style.background = '#3a3d4d'; };
        nextQuestionButton.onmouseout = function() { this.style.background = '#2c2e3b'; };
        nextQuestionButton.onmousedown = function() { this.style.transform = 'scale(0.98)'; };
        nextQuestionButton.onmouseup = function() { this.style.transform = 'scale(1)'; };
        nextQuestionButton.onclick = function() {
          chrome.runtime.sendMessage({ action: 'capture' });
          // Instead of removing the overlay, show loading and update in place
          const messageContentHolder = document.getElementById('ai-response-message-content');
          if (messageContentHolder) messageContentHolder.textContent = 'Processing...';
        };
        responseDiv.appendChild(nextQuestionButton);
        // --- End Next Question Button ---
        // Draggable functionality (attached to dragHandle)
        dragHandle.onmousedown = function(event) {
          // Prevent dragging if clicking on close button if it were part of handle
          if (event.target.id === closeButtonId) return;

          let shiftX = event.clientX - responseDiv.getBoundingClientRect().left;
          let shiftY = event.clientY - responseDiv.getBoundingClientRect().top;

          responseDiv.style.userSelect = 'none';
          document.body.style.cursor = 'move'; // Change cursor for the whole body

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

          dragHandle.onmouseup = function() {
            document.removeEventListener('mousemove', onMouseMove);
            dragHandle.onmouseup = null;
            responseDiv.style.userSelect = '';
            document.body.style.cursor = 'auto'; // Reset body cursor
          };
          // Also handle mouseup on document in case mouse is released outside handle
          document.onmouseup = function() {
            document.removeEventListener('mousemove', onMouseMove);
            document.onmouseup = null;
            responseDiv.style.userSelect = '';
            document.body.style.cursor = 'auto';
          };
        };

        dragHandle.ondragstart = function() {
          return false;
        };

        // Message content placeholder
        const messageContentElement = document.createElement('div'); // Use div for better block display
        messageContentElement.id = messageContentId;
        messageContentElement.style.padding = '0px'; // Adjusted padding, main padding on responseDiv
        messageContentElement.style.margin = '0';
        messageContentElement.style.wordWrap = 'break-word';
        messageContentElement.style.width = '100%';
        messageContentElement.style.textAlign = 'left';
        messageContentElement.style.overflowY = 'auto'; // Allow content to scroll if it overflows
        messageContentElement.style.maxHeight = 'calc(100% - 40px)'; // Max height considering padding
        responseDiv.appendChild(messageContentElement);

        // Close button (styled like deltamath.js)
        let closeButton = document.createElement('button');
        closeButton.id = closeButtonId;
        closeButton.textContent = '×';
        closeButton.style.cssText = `
          position: absolute;
          top: 8px; /* Adjusted to fit within the new padding-top */
          right: 12px; /* Adjusted for consistency */
          background: none;
          border: none;
          color: white;
          font-size: 20px; /* Slightly larger for better visibility */
          cursor: pointer;
          padding: 2px 8px;
          transition: color 0.2s ease-in-out;
          line-height: 1;
        `;
        closeButton.onmouseover = function() { this.style.color = '#ff6b6b'; }; // deltamath hover color
        closeButton.onmouseout = function() { this.style.color = 'white'; };
        closeButton.setAttribute('aria-label', 'Close Message');
        closeButton.onclick = function(e) {
          e.stopPropagation(); // Prevent drag from starting
          responseDiv.remove();
        };
        responseDiv.appendChild(closeButton);

        document.body.appendChild(responseDiv);
      }

      // Update content and style
      // Background color based on error status, similar to deltamath's theme but with error differentiation
      responseDiv.style.backgroundColor = errorFlag ? '#e74c3c' : '#1c1e2b'; // Red for error, deltamath bg otherwise

      // Update message text
      const messageContentHolder = document.getElementById(messageContentId);
      if (messageContentHolder) {
        messageContentHolder.textContent = msg;
      } else {
        // Fallback: this should ideally not be reached
        const existingCloseButton = document.getElementById(closeButtonId);
        const existingDragHandle = document.getElementById(dragHandleId);
        // Clear previous message content (but keep the close button and drag handle)
        while (responseDiv.firstChild && 
               responseDiv.firstChild !== existingCloseButton && 
               responseDiv.firstChild !== existingDragHandle && 
               responseDiv.firstChild.id !== messageContentId) {
          responseDiv.removeChild(responseDiv.firstChild);
        }
        // If messageContentHolder was somehow removed, recreate it (simplified)
        const newMessageContent = document.createElement('div');
        newMessageContent.id = messageContentId;
        newMessageContent.style.padding = '0px';
        newMessageContent.style.margin = '0';
        newMessageContent.style.wordWrap = 'break-word';
        newMessageContent.style.width = '100%';
        newMessageContent.style.textAlign = 'left';
        newMessageContent.textContent = msg;
        // Insert after drag handle, before close button
        if (existingDragHandle && existingDragHandle.nextSibling) {
            responseDiv.insertBefore(newMessageContent, existingDragHandle.nextSibling);
        } else if (existingDragHandle) {
            responseDiv.appendChild(newMessageContent); // Should not happen if close button exists
        } else {
            responseDiv.prepend(newMessageContent); // Fallback if no drag handle
        }
      }

      // Ensure the message div is visible
      responseDiv.style.display = 'flex';
    },
    args: [message, isError]
  });
}