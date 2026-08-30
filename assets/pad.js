/* Launch pad — progressive disclosure. Sections start collapsed; the
   header row is the only thing visible until you open one. */
(function () {
  const sections = document.querySelectorAll('.pad-section');

  sections.forEach((section) => {
    const btn = section.querySelector('.pad-toggle');
    const panel = section.querySelector('.pad-panel');
    if (!btn || !panel) return;

    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
    });
  });

  function syncTabPanelEmpty(panel) {
    const entries = panel.querySelector('.pad-entries');
    const links = entries ? entries.querySelectorAll('.pad-entry') : [];
    const empty = panel.querySelector('.pad-empty');

    if (!empty) {
      const el = document.createElement('p');
      el.className = 'pad-empty';
      el.textContent = 'Nothing here yet.';
      panel.appendChild(el);
    }

    panel.classList.toggle('is-empty', links.length === 0);
  }

  document.querySelectorAll('.pad-tabs').forEach((tablist) => {
    const tabs = tablist.querySelectorAll('.pad-tab');
    const panel = tablist.parentElement;
    const panels = panel.querySelectorAll('.pad-tab-panel');

    panels.forEach(syncTabPanelEmpty);

    tabs.forEach((tab) => {
      tab.disabled = false;
      tab.removeAttribute('aria-disabled');

      tab.addEventListener('click', () => {
        const id = tab.dataset.padTab;
        tabs.forEach((t) => {
          const on = t === tab;
          t.classList.toggle('on', on);
          t.setAttribute('aria-selected', String(on));
        });
        panels.forEach((p) => {
          p.hidden = p.dataset.padPanel !== id;
        });
      });
    });
  });
})();
