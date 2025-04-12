document.addEventListener('DOMContentLoaded', () => {
  const captureButton = document.getElementById('capture');
  if (!captureButton) {
    console.error('Capture button not found');
    return;
  }

  captureButton.addEventListener('click', () => {
    // Send a message to the background script to start the capture process
    chrome.runtime.sendMessage({ action: 'capture' });
  });

  // Add click handler to the crisp-button if it exists
  const crispButton = document.querySelector('.crisp-button');
  if (crispButton) {
    crispButton.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'crispButtonClicked' });
    });
  }
});
