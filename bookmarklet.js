javascript:(function() {
    'use strict';

    // Function to load and execute a script from URL
    function loadScript(url) {
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(scriptContent => {
                const scriptElement = document.createElement('script');
                scriptElement.textContent = scriptContent;
                document.head.appendChild(scriptElement);
                console.log('Script loaded and executed successfully');
            })
            .catch(error => {
                console.error('Error loading script:', error);
            });
    }

    // Check current domain and load appropriate script
    const currentDomain = window.location.hostname;

    if (currentDomain.includes('bigideasmath.com')) {
        loadScript('https://raw.githubusercontent.com/Cpmjaguar1234/nova/refs/heads/main/bigideas.js');
    } else if (currentDomain.includes('achieve3000.com')) {
        loadScript('https://raw.githubusercontent.com/Cpmjaguar1234/nova/refs/heads/main/achieve.js');
    }
})();