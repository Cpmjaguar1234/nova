document.addEventListener('DOMContentLoaded', () => {
  const captureButton = document.getElementById('capture');
  const loadingIndicator = document.getElementById('loading-indicator');
  const buttonText = document.getElementById('button-text');
  const logo = document.getElementById('logo');
  const launcher = document.getElementById('launcher');
  let isDragging = false;
  let initialX, initialY, currentX, currentY;

  if (!captureButton) {
    console.error('Capture button not found in popup.html. Ensure an element with id="capture" exists.');
    return;
  }

  // Play intro animation if anime.js is available
  function playIntroAnimation() {
    if (typeof anime !== 'undefined') {
      // Initially hide the launcher
      launcher.style.opacity = '0';
      
      // Animate the logo
      anime.timeline({
        easing: 'easeInOutQuad',
        duration: 800
      })
      .add({
        targets: logo,
        opacity: [0, 1],
        scale: [0.5, 1],
        rotate: '1turn',
        duration: 1000,
        easing: 'easeOutExpo'
      })
      .add({
        targets: launcher,
        opacity: [0, 1],
        duration: 500,
        easing: 'linear'
      });
    } else {
      // Fallback if anime.js is not available
      launcher.style.opacity = '1';
    }
  }

  // Make the popup draggable using the drag handle
  const dragHandle = document.querySelector('.drag-handle');
  if (dragHandle) {
    dragHandle.addEventListener('mousedown', dragStart);
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('mousemove', drag);
  }

  function dragStart(e) {
    initialX = e.clientX;
    initialY = e.clientY;
    isDragging = true;
  }

  function dragEnd() {
    isDragging = false;
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      initialX = e.clientX;
      initialY = e.clientY;
      
      // Move the popup
      const popup = document.querySelector('html');
      popup.style.position = 'relative';
      popup.style.left = (popup.offsetLeft + currentX) + 'px';
      popup.style.top = (popup.offsetTop + currentY) + 'px';
    }
  }

  // Handle the capture button click
  captureButton.addEventListener('click', () => {
    // Show loading state
    loadingIndicator.style.display = 'block';
    buttonText.style.opacity = '0.5';
    captureButton.disabled = true;
    
    // Send a message to the background script to initiate the capture and processing
    chrome.runtime.sendMessage({ action: 'capture' });
    // Hide loading state immediately (since we don't expect a response)
    setTimeout(() => {
      loadingIndicator.style.display = 'none';
      buttonText.style.opacity = '1';
      captureButton.disabled = false;
      buttonText.textContent = 'Sent!';
      setTimeout(() => {
        buttonText.textContent = 'Get Answer';
        window.close();
      }, 1000);
    }, 500);
  });
  
  // Start the intro animation
  playIntroAnimation();
});
