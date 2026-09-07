/* ------------------------------------------------------------------
   /build-sugar — builder enter animation
------------------------------------------------------------------- */

const ENTER_KEY = 'build-sugar-enter';

/** Builder: play enter overlay, then resolve. */
export function playBuilderEnter(prompt) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    sessionStorage.removeItem(ENTER_KEY);
    return Promise.resolve();
  }
  const overlay = document.getElementById('bdEnter');
  if (!overlay || !sessionStorage.getItem(ENTER_KEY)) {
    sessionStorage.removeItem(ENTER_KEY);
    return Promise.resolve();
  }
  sessionStorage.removeItem(ENTER_KEY);

  const promptEl = overlay.querySelector('#bdEnterPrompt') || overlay.querySelector('.bd-enter-prompt');
  if (promptEl) promptEl.textContent = prompt;

  overlay.hidden = false;

  return new Promise((resolve) => {
    setTimeout(() => {
      overlay.classList.add('leaving');
      setTimeout(() => {
        overlay.hidden = true;
        overlay.classList.remove('leaving');
        resolve();
      }, 480);
    }, 900);
  });
}
