(function createEdmentumNavigatorAutoRefresh() {
  const container = document.getElementById('main-content');
  if (!container) return console.warn('❌ Could not find #main-content');

  // Create or reuse the floating UI container
  let uiBox = document.getElementById('edmentum-navigator-ui');
  if (!uiBox) {
    uiBox = document.createElement('div');
    uiBox.id = 'edmentum-navigator-ui';
    Object.assign(uiBox.style, {
      position: 'fixed',
      top: '50px',
      right: '50px',
      width: '320px',
      maxHeight: '80vh',
      overflowY: 'auto',
      background: '#1c1e2b',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      padding: '12px',
      zIndex: '9999',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      fontSize: '14px',
      boxShadow: '0 0 12px rgba(0,0,0,0.2)',
      borderRadius: '8px',
      color: 'white'
    });
    document.body.appendChild(uiBox);

    // Title
    const title = document.createElement('div');
    title.id = 'edmentum-navigator-title';
    title.innerHTML = '📚 <strong style="color:#4cc9f0">Edmentum Navigator</strong>';
    title.style.marginBottom = '8px';
    uiBox.appendChild(title);

    // Legend
    const legend = document.createElement('div');
    legend.id = 'edmentum-navigator-legend';
    legend.style.fontSize = '13px';
    legend.style.marginBottom = '12px';
    legend.innerHTML = `
      <div style="color:#4cc9f0">Legend:</div>
      <div style="color:#a8e6cf; background:#1a2e3a; padding:2px 6px; border-radius:4px; display:inline-block; margin:3px 5px 3px 0;">Tutorial</div>
      <div style="color:#ffaaa5; background:#3a1a2e; padding:2px 6px; border-radius:4px; display:inline-block; margin:3px 5px 3px 0;">Assessment</div>
      <div style="color:#a8c6e6; background:#1a3a2e; padding:2px 6px; border-radius:4px; display:inline-block; margin:3px 5px 3px 0;">Document</div>
      <div style="color:#d3d3d3; background:#2e2e2e; padding:2px 6px; border-radius:4px; display:inline-block; margin:3px 5px 3px 0;">Other</div>
      <div style="color:#ffffff; background:#2e1a3a; padding:2px 6px; border-radius:4px; display:inline-block; margin:3px 5px 3px 0;">Unit</div>
    `;
    uiBox.appendChild(legend);
  }

  function clearItems() {
    // Remove all children except title and legend
    Array.from(uiBox.children).forEach(child => {
      if (
        child.id !== 'edmentum-navigator-title' &&
        child.id !== 'edmentum-navigator-legend'
      ) {
        uiBox.removeChild(child);
      }
    });
  }

  function addItem(label, element, type = 'activity', subtype = '') {
    const btn = document.createElement('div');
    btn.textContent = `${type === 'unit' ? '📘' : '🔹'} ${label} ${
      subtype ? `(${subtype})` : ''
    }`;
    btn.style.cursor = 'pointer';
    btn.style.margin = '5px 0';
    btn.style.padding = '6px 10px';
    btn.style.borderRadius = '6px';
    btn.style.userSelect = 'none';
    btn.style.transition = 'background-color 0.25s ease';

    if (type === 'unit') {
      btn.style.background = '#2e1a3a';
      btn.style.color = '#ffffff';
      btn.style.fontWeight = '600';
    } else {
      switch (subtype.toLowerCase()) {
        case 'tutorial':
          btn.style.background = '#1a2e3a';
          btn.style.color = '#a8e6cf';
          break;
        case 'assessment':
          btn.style.background = '#3a1a2e';
          btn.style.color = '#ffaaa5';
          break;
        case 'document':
          btn.style.background = '#1a3a2e';
          btn.style.color = '#a8c6e6';
          break;
        default:
          btn.style.background = '#2e2e2e';
          btn.style.color = '#d3d3d3';
      }
    }

    btn.addEventListener('mouseenter', () => (btn.style.filter = 'brightness(90%)'));
    btn.addEventListener('mouseleave', () => (btn.style.filter = 'none'));

    btn.addEventListener('click', () => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.click?.();
    });

    uiBox.appendChild(btn);
  }

  function refreshList() {
    clearItems();

    // Units
    const headerSpans = container.querySelectorAll('h3.unit-name span, span.ng-star-inserted');
    const seenUnits = new Set();
    headerSpans.forEach(span => {
      const text = span.textContent.trim();
      if (text.toLowerCase().startsWith('unit') && !seenUnits.has(text)) {
        addItem(text, span.closest('h3'), 'unit');
        seenUnits.add(text);
      }
    });

    // Activities
    const activityEls = container.querySelectorAll('h4.activity-name');
    activityEls.forEach(activity => {
      const name = activity.textContent.trim();
      if (!name) return;

      const wrapper = activity.closest('div.main-wrapper');
      let subtype = '';

      if (wrapper) {
        const iconUse = wrapper.querySelector('.activity-type lrn-svg-icon use');
        if (iconUse) {
          const href = iconUse.getAttribute('xlink:href') || '';
          const match = href.match(/#activity-type-(\w+)/);
          if (match) {
            subtype = match[1].charAt(0).toUpperCase() + match[1].slice(1);
          }
        }
      }

      addItem(name, activity, 'activity', subtype);
    });
  }

  // Initial load
  refreshList();

  // Auto-refresh every 2 seconds
  setInterval(refreshList, 2000);
})();
