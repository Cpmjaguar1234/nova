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
    alert('Failed to process HTML: ' + errorMessage + '\nPlease try again or contact support if the issue persists.');
  }
}