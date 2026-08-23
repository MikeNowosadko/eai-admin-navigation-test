/* ------------------------------------------------------------------
   The collapsible nav rail.

   Same shape as the theme switch in daymode.js: one class on <body>,
   remembered, and applied before first paint by an inline script in
   each page — otherwise the rail slides shut in front of you every
   time you move between the two views.
------------------------------------------------------------------- */

(() => {

const KEY = 'eai-roadmap-nav';
const body = document.body;
const btn = document.getElementById('nav');
const side = document.querySelector('.fn-side');
if (!btn || !side) return;

function paint() {
  const open = !body.classList.contains('nav-closed');
  btn.setAttribute('aria-expanded', String(open));
  btn.setAttribute('aria-label', open ? 'Hide the roadmap list' : 'Show the roadmap list');
  /* A closed rail is off-screen, so its links should be out of the tab
     order too — visibility:hidden does that, but only after the slide. */
  side.setAttribute('aria-hidden', String(!open));
}

btn.addEventListener('click', () => {
  const closed = body.classList.toggle('nav-closed');
  try { localStorage.setItem(KEY, closed ? 'closed' : 'open'); } catch (e) { /* private mode */ }
  paint();
});

paint();

})();
