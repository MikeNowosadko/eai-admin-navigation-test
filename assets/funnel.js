/* ------------------------------------------------------------------
   Renders the discovery funnel from assets/funnel-data.js.

   Screen: one band selected at a time, master–detail.
   Paper:  the selection is meaningless, so print reveals every band
           and lets the stylesheet break them onto separate pages.
------------------------------------------------------------------- */

(() => {

const D = window.FUNNEL;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

/* The funnel narrows by a fixed amount per band, so the trapezoids are
   generated rather than drawn: band n runs from inset n to inset n+1. */
const W = 404;
const STEP = 32;
const inset = (i) => 22 + i * STEP;

function bandPath(i) {
  const a = inset(i);
  const b = inset(i + 1);
  return `M${a} 0 H ${W - a} L ${W - b} 104 H ${b} Z`;
}

/* --- the rail ------------------------------------------------------ */

function buildRail() {
  const rail = $('#rail');
  rail.innerHTML = D.steps.map((s, i) => `
    <button class="fn-band${i === 1 ? ' on' : ''}" data-step="${s.id}" aria-pressed="${i === 1}">
      <svg viewBox="0 0 ${W} 104" preserveAspectRatio="none" aria-hidden="true">
        <path d="${bandPath(i)}" />
      </svg>
      <span class="txt"><span class="nm">${s.name}</span></span>
    </button>`).join('');

  rail.addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (b) select(b.dataset.step);
  });
}

/* --- the panel ------------------------------------------------------ */

/* Only a scored outcome gets a score cell. Anything else keeps the
   column empty rather than filling it with a label nobody reads. */
function scoreCell(o) {
  if (o.learning) return '<span class="score"></span>';
  const from = o.from === null || o.from === undefined ? '—' : o.from;
  return `<span class="score">
      <span class="now">${from}/10</span>
      <span class="arrow">&rarr;</span>
      <span class="target">${o.to}/10</span>
    </span>`;
}

function sect(kind, label, rows) {
  if (!rows.length) return '';
  return `<section class="fn-sect ${kind}">
      <div class="fn-sect-head"><b>${label}</b></div>
      ${rows.join('')}
    </section>`;
}

function stepHtml(s) {
  const problem = s.problem.map((p) =>
    `<div class="fn-row"><span class="txt">${p}</span></div>`);

  const outcomes = s.outcomes.map((o) =>
    `<div class="fn-row${o.passing ? ' passing' : ''}">
       <span class="txt">${o.text}</span>${scoreCell(o)}
     </div>`);

  const solution = s.solution.map((t) =>
    `<div class="fn-row"><span class="txt">${t.text}</span></div>`);

  return `<div class="fn-step" data-panel="${s.id}" hidden>
      <div class="fn-panel-head"><h2>${s.name}</h2></div>
      ${sect('problem', 'Problem', problem)}
      ${sect('outcome', 'Outcome', outcomes)}
      ${sect('solution', 'Solution', solution)}
    </div>`;
}

function buildPanel() {
  $('#panel').innerHTML = D.steps.map(stepHtml).join('');
}

function select(id) {
  $$('#rail .fn-band').forEach((b) => {
    const on = b.dataset.step === id;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });
  $$('#panel .fn-step').forEach((p) => { p.hidden = p.dataset.panel !== id; });
}

/* --- printing ------------------------------------------------------- */

/* The stylesheet unhides every band for print, but `hidden` is an
   attribute rather than a style, so it has to come off in JS too —
   and go back on afterwards, or the screen shows all four at once. */
function beforePrint() { $$('#panel .fn-step').forEach((p) => { p.hidden = false; }); }
function afterPrint() {
  const on = $('#rail .fn-band.on');
  if (on) select(on.dataset.step);
}

window.addEventListener('beforeprint', beforePrint);
window.addEventListener('afterprint', afterPrint);

/* --- go -------------------------------------------------------------- */

$('#title').textContent = D.intro.title;

buildRail();
buildPanel();
select(D.steps[1].id);

$('#print').addEventListener('click', () => window.print());

})();
