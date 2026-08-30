/* Progress bar for the two-column setup layout (/install-5).

   Wrapped in an IIFE on purpose: this loads as a classic script alongside
   install-4.js, which already declares `setupWin` at top level. Two
   top-level `const setupWin`s in the same script scope is a SyntaxError
   that kills whichever file parses second — this one. */
(function () {
  const STEP = { signin: 1, welcome: 2, setup: 3, running: 4, done: 5 };
  const bars = document.getElementById('setupProgress');
  const count = document.getElementById('setupProgressCount');

  function setProgress(name) {
    const n = STEP[name] || 1;
    document.getElementById('winSetup')?.classList.toggle('at-start', name === 'start');
    if (bars) {
      bars.querySelectorAll('i').forEach((bar, i) => {
        bar.classList.toggle('on', i < n);
      });
    }
    if (count) count.textContent = `${n} / 5`;
  }

  const win = document.getElementById('winSetup');
  if (win && win.classList.contains('split')) {
    /* Split desktop shell: sign-in → harness (2 steps) */
    if (win.classList.contains('split-shell')) {
      const SHELL_STEP = { signin: 1, done: 2 };
      function setShellProgress(name) {
        const n = SHELL_STEP[name] || 1;
        win.classList.toggle('at-start', false);
        if (bars) bars.querySelectorAll('i').forEach((bar, i) => bar.classList.toggle('on', i < n));
        if (count) count.textContent = `${n} / 2`;
      }
      const observer = new MutationObserver(() => {
        const active = win.querySelector('[data-screen]:not([hidden])');
        if (active) setShellProgress(active.dataset.screen);
      });
      observer.observe(win, { attributes: true, subtree: true, attributeFilter: ['hidden'] });
      setShellProgress('signin');
      return;
    }

    const observer = new MutationObserver(() => {
      const active = win.querySelector('[data-screen]:not([hidden])');
      if (active) setProgress(active.dataset.screen);
    });
    observer.observe(win, { attributes: true, subtree: true, attributeFilter: ['hidden'] });
    setProgress('start');

    /* The opening screen has no stepper — see setup-split.css. Driven off
       the same screen change as the count so the two can't disagree. */
    const start = document.getElementById('setupStart');
    if (start) {
      start.addEventListener('click', () => showScreen('signin'));
    }
  }

  /* --- labels are written, not shouted -------------------------------

     The harness list's group headers are built in install-4.js as literal
     upper-case strings, and install-4 still wants them that way — so they
     are rewritten here, in the layout that doesn't, rather than changed at
     the source. A lookup rather than a title-casing function: "Mac" keeps
     its capital and "npm" keeps its absence of one, which no general rule
     gets right. The list is rebuilt on every harness change, so this
     watches for new headers instead of running once. */

  const SENTENCE_CASE = {
    'READY ON THIS MAC': 'Ready on this Mac',
    'SETUP CAN INSTALL THESE': 'Setup can install these',
    'NEEDS A DOWNLOAD': 'Needs a download',
  };

  const rows = document.getElementById('harnessRows');
  if (win && win.classList.contains('split') && rows) {
    const relabel = () => {
      rows.querySelectorAll('.i4-group b').forEach((b) => {
        const written = SENTENCE_CASE[b.textContent.trim()];
        if (written) b.textContent = written;
      });
    };
    new MutationObserver(relabel).observe(rows, { childList: true, subtree: true });
    relabel();
  }
})();
