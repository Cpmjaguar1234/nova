document.addEventListener('DOMContentLoaded', () => {
  const captureButton = document.getElementById('capture');

  if (!captureButton) {
    console.error('Capture button not found in popup.html. Ensure an element with id="capture" exists.');
    return;
  }

  captureButton.addEventListener('click', () => {
    // Send a message to the background script to initiate the capture and processing
    chrome.runtime.sendMessage({ action: 'capture' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message to background script:', chrome.runtime.lastError.message);
        // Optionally, provide user feedback in the popup if the message fails
        // For example, by updating a status element in popup.html
      } else {
        // Handle any response from the background script if needed
        // console.log('Message sent to background script. Response:', response);
      }
    });
    // Optionally, close the popup after clicking. This is common UX for action popups.
    // window.close(); 
  });
});
