/* ------------------------------------------------------------------
   Loaded by every page that runs inside the desktop's browser window.
   Two jobs: tell the shell what address to show, and forward the clicks
   the terminal journey is waiting on.
------------------------------------------------------------------- */

function tell(payload) {
  if (window.parent === window) return; // opened directly, not in the shell
  window.parent.postMessage(Object.assign({ eai: true }, payload), '*');
}

window.addEventListener('DOMContentLoaded', () => {
  const meta = document.querySelector('meta[name="eai-url"]');
  const file = window.location.pathname.split('/').pop();
  tell({
    nav: {
      url: meta ? meta.content : file,
      title: document.title.replace(/^Prototype — /, ''),
      file: `pages/${file}`,
    },
  });
});

// An iframe keeps its own key events, so forward the shell's shortcuts up.
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    tell({ hotkey: 'cmd-k' });
  } else if (e.key === 'Escape') {
    tell({ hotkey: 'escape' });
  }
});

// Any element with data-eai-action reports up when clicked. Optional
// window.eaiData(el) lets a page attach form values to the message.
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-eai-action]');
  if (!el || el.disabled) return;
  tell({
    action: el.dataset.eaiAction,
    data: typeof window.eaiData === 'function' ? window.eaiData(el) : {},
  });
});
