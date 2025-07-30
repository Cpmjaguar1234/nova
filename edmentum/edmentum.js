if (window.location.href.startsWith('https://f1.apps.elf.edmentum.com/courseware-delivery/')) {
    const script = document.createElement('script');
    script.src = 'https://raw.githubusercontent.com/Cpmjaguar1234/nova/refs/heads/main/edmentum/edmentum-tutorial.js';
    document.head.appendChild(script);
    console.log('edmentum-tutorial.js loaded.');
} else {
    console.log('Current URL does not match the required pattern.');
}
