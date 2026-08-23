/* ------------------------------------------------------------------
   Renders the three-lane timetable from assets/timetable-data.js.

   Stations sit at the centre of their column, so everything is a
   percentage of the plot: column c is centred at (c + 0.5) / n. Move a
   station between columns in the data and the track follows it.
------------------------------------------------------------------- */

(() => {

const D = window.TIMETABLE;
const $ = (s, r) => (r || document).querySelector(s);

const N = D.columns.length;
const centre = (c) => ((c + 0.5) / N) * 100;   // % across the plot
const edge = (c) => ((c + 1) / N) * 100;       // right-hand edge of column c

/* --- the header row of quarters ------------------------------------ */

function buildColumns() {
  $('#tt-cols').innerHTML = D.columns.map((c, i) => `
    <div class="tt-col${i === 0 ? ' now' : ''}">${c}</div>`).join('');

  $('#tt-rules').innerHTML = D.columns.slice(0, -1).map((_, i) =>
    `<span class="tt-rule" style="left:${edge(i)}%"></span>`).join('');
}

/* --- a lane -------------------------------------------------------- */

function laneHtml(l) {
  const laid = edge(l.laid);
  /* Track stops at the last station, not the edge of the plot — a line
     running past the final stop reads as unfinished drawing. */
  const end = centre(Math.max.apply(null, l.stations.map((s) => s.col)));

  const stations = l.stations.map((s) => `
    <div class="tt-stn${s.interlock ? ' interlock' : ''}" style="left:${centre(s.col)}%">
      <span class="tt-dot${s.col > l.laid ? ' future' : ''}"></span>
      <span class="tt-lbl">
        <span class="nm">${s.name}</span>
        <span class="st">${s.state}</span>
      </span>
    </div>`).join('');

  return `<div class="tt-lane p-${l.colour}" data-lane="${l.id}">
      <div class="tt-lane-head">
        <span class="tt-swatch"></span>${l.name}
      </div>
      <div class="tt-track">
        <span class="tt-laid" style="width:${laid}%"></span>
        <span class="tt-unlaid" style="left:${laid}%; width:${end - laid}%"></span>
        ${stations}
      </div>
    </div>`;
}

/* --- couplings between lanes --------------------------------------- */

/* Drawn after the lanes exist, because the join has to reach from one
   lane's track to the next one's — which is a measurement, not a guess. */
function drawInterlocks() {
  const plot = $('#tt-plot');
  const box = plot.getBoundingClientRect();

  $('#tt-links').innerHTML = D.interlocks.map((k) => {
    const a = $(`[data-lane="${k.from}"] .tt-track`).getBoundingClientRect();
    const b = $(`[data-lane="${k.to}"] .tt-track`).getBoundingClientRect();
    const top = a.top - box.top + a.height / 2;
    const height = (b.top - box.top + b.height / 2) - top;

    return `<div class="tt-link" style="left:${centre(k.col)}%; top:${top}px; height:${height}px">
        <span class="tt-link-line"></span>
        <span class="tt-link-note">
          <span class="when">${k.when}</span>
          <span class="txt">${k.text}</span>
        </span>
      </div>`;
  }).join('');
}

/* --- go ------------------------------------------------------------- */

$('#title').textContent = D.intro.title;

buildColumns();
$('#tt-lanes').innerHTML = D.lanes.map(laneHtml).join('');
drawInterlocks();

window.addEventListener('resize', drawInterlocks);
window.addEventListener('beforeprint', drawInterlocks);

$('#print').addEventListener('click', () => window.print());

})();
