# Nova Learning Assistant Suite

A collection of browser scripts that enhance your learning experience by providing intelligent assistance during BIM and Achieve assignments.

## Tools in the Suite

### BIM Cheat Assistant
- Automatic question analysis and answer suggestions for BIM assignments
- Support for multiple choice, True/False, and fill-in-the-blank questions
- Clean and unobtrusive interface

### Achieve Cheat Assistant
- Intelligent assistance for Achieve assignments
- Seamless integration with the Achieve platform
- Enhanced learning support features

## Features

- Automatic question analysis and answer suggestions
- Support for multiple question types
- Clean and unobtrusive interface
- Cross-platform compatibility

## Bookmarklet Installation

Drag the following link to your bookmarks bar to install:

[Bookmarklet](javascript:(function(){'use strict';function loadScript(url){fetch(url).then(response=>{if(!response.ok)throw new Error('Network response was not ok');return response.text()}).then(scriptContent=>{const scriptElement=document.createElement('script');scriptElement.textContent=scriptContent;document.head.appendChild(scriptElement);console.log('Script loaded and executed successfully')}).catch(error=>{console.error('Error loading script:',error)})}const currentDomain=window.location.hostname;if(currentDomain.includes('bigideasmath.com'))loadScript('https://raw.githubusercontent.com/Cpmjaguar1234/nova/refs/heads/main/bigideas.js');else if(currentDomain.includes('achieve3000.com'))loadScript('https://raw.githubusercontent.com/Cpmjaguar1234/nova/refs/heads/main/achieve.js')})())


## Important Notes

- These tools are designed for learning and practice purposes only
- Use responsibly and ethically
- Always verify answers and understand the underlying concepts
- If you have an issue or question, please report it in the Issues section

## Disclaimer

This software is provided "as is", without warranty of any kind. The authors are not responsible for any consequences of using these tools.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
