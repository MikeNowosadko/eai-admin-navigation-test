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
})();
