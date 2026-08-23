/* ------------------------------------------------------------------
   Both roadmap views, off one list of items (assets/roadmap-data.js).

   The page says which view it wants by carrying #stage (the tree) or
   #map (the story map). Everything else — the filters, the detail
   panel, the colours — is shared, because the two views are meant to
   feel like two ways of looking at the same thing rather than two
   pages that happen to be about the roadmap.
------------------------------------------------------------------- */

(() => {

const D = window.ROADMAP;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

/* --- icons: 24×24, stroked, no fills ------------------------------ */

const ICONS = {
  doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
  terminal: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 10l3 2-3 2M13.5 14.5H17"/>',
  code: '<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/>',
  spark: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.4L12 17l-1.9-5.6L4.5 10l5.6-1.4z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  bars: '<path d="M6 20v-8M12 20V4M18 20v-6"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
  key: '<circle cx="15.5" cy="8.5" r="3.2"/><path d="M13.2 10.8L4 20v0h3v-2h2v-2h2z"/>',
  users: '<circle cx="9.5" cy="9" r="3.2"/><path d="M3.5 20a6 6 0 0 1 12 0"/><path d="M16 6.2a3.2 3.2 0 0 1 0 5.6M17.5 20a6.4 6.4 0 0 0-1.8-4"/>',
  eye: '<path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/>',
  globe: '<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2M12 3.4c2.8 3 2.8 14.2 0 17.2M12 3.4c-2.8 3-2.8 14.2 0 17.2"/>',
  shield: '<path d="M12 3.2l7.6 2.8v5.6c0 4.6-3.3 7.6-7.6 8.6-4.3-1-7.6-4-7.6-8.6V6z"/>',
  layers: '<path d="M12 3.2l8.4 4.6-8.4 4.6-8.4-4.6z"/><path d="M3.6 13.2l8.4 4.6 8.4-4.6"/>',
  box: '<path d="M12 3.2l7.8 4.4v8.8L12 20.8l-7.8-4.4V7.6z"/><path d="M4.2 7.6l7.8 4.4 7.8-4.4M12 12v8.8"/>',
  upload: '<path d="M12 16V4.5M8 8.2l4-3.7 4 3.7"/><path d="M4 15.5V20h16v-4.5"/>',
  flag: '<path d="M6 21V3.6"/><path d="M6 4.6h11l-2.2 3.6L17 12H6"/>',
  branch: '<circle cx="6.5" cy="6" r="2.4"/><circle cx="6.5" cy="18" r="2.4"/><circle cx="17.5" cy="8" r="2.4"/><path d="M6.5 8.4v7.2M17.5 10.4v1.2a4 4 0 0 1-4 4H8.9"/>',
  database: '<ellipse cx="12" cy="6" rx="7" ry="2.8"/><path d="M5 6v12c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8V6"/><path d="M5 12c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8"/>',
  target: '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.9" fill="currentColor"/>',
  play: '<path d="M8.5 5.2l10.5 6.8-10.5 6.8z"/>',
  refresh: '<path d="M20.2 12a8.2 8.2 0 1 1-2.4-5.8"/><path d="M20.4 3.8v4.4h-4.4"/>',
};

function icon(name) {
  const body = ICONS[name] || ICONS.spark;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

/* --- the shape of the data ---------------------------------------- */

const byId = {};
D.items.forEach((it) => { byId[it.id] = it; });

const kids = {};
D.items.forEach((it) => { (kids[it.parent] = kids[it.parent] || []).push(it); });

const STATUS_ORDER = ['shipped', 'building', 'next', 'exploring', 'parked'];
const count = (fn) => D.items.filter(fn).length;
const colourOf = (it) => D.products[it.product].colour;

/* Slices are read off status rather than stored, so an item only ever
   says one thing about itself and both views agree about where it is. */
const SLICES = [
  { id: 'shipped',  statuses: ['shipped'],  name: 'Working today',
    note: 'Live, in front of people. This is the product as it exists.', colour: '#6fe3b0' },
  { id: 'building', statuses: ['building'], name: 'Slice 1 · being built',
    note: 'Under way now. The next thing anyone will notice changing.', colour: '#ffc24d' },
  { id: 'next',     statuses: ['next'],     name: 'Slice 2 · next up',
    note: 'Agreed and scoped. Nobody has started.', colour: '#7fa8d8' },
  { id: 'later',    statuses: ['exploring', 'parked'], name: 'Slice 3 · later',
    note: 'Worth doing, shape unknown. Here so it is not forgotten.', colour: '#6b7484' },
];

/* --- filter state -------------------------------------------------- */

const state = {
  products: new Set(Object.keys(D.products)),
  statuses: new Set(STATUS_ORDER),
  selected: null,
  slices: SLICES.length,          // story map: how many slices are revealed
};

const visible = (it) => state.products.has(it.product) && state.statuses.has(it.status);

/* --- filter chips (shared by both views) --------------------------- */

function buildFilters() {
  const host = $('#filters');
  if (!host) return;

  const productChips = Object.entries(D.products).map(([id, p]) => `
    <button class="chip p-${id} on" data-kind="product" data-id="${id}" title="${p.note}">
      <span class="dot" style="background:${p.colour}"></span>${p.name}
      <span class="n">${count((i) => i.product === id)}</span>
    </button>`).join('');

  const statusChips = STATUS_ORDER.map((id) => {
    const n = count((i) => i.status === id);
    if (!n) return '';
    const mark = id === 'shipped' ? '<span class="dot"></span>' : '<span class="ring-dot"></span>';
    return `<button class="chip on" data-kind="status" data-id="${id}" title="${D.statuses[id].note}">
      ${mark}${D.statuses[id].name}<span class="n">${n}</span></button>`;
  }).join('');

  host.innerHTML = `
    <div class="grp"><span class="grp-label">Product</span>${productChips}</div>
    <div class="div"></div>
    <div class="grp"><span class="grp-label">State</span>${statusChips}</div>
    <div class="div"></div>
    <button class="chip chip-preset" data-kind="preset" data-id="shipped">
      Show only what works today
    </button>
    <button class="chip chip-preset" data-kind="preset" data-id="all">Everything</button>`;

  host.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const { kind, id } = chip.dataset;

    if (kind === 'preset') {
      state.statuses = new Set(id === 'shipped' ? ['shipped'] : STATUS_ORDER);
      state.products = new Set(Object.keys(D.products));
    } else {
      const set = kind === 'product' ? state.products : state.statuses;
      const all = kind === 'product' ? Object.keys(D.products) : STATUS_ORDER;
      // A lone chip left on means "only this" — clicking it again brings the rest back.
      if (set.size === 1 && set.has(id)) all.forEach((k) => set.add(k));
      else if (set.has(id)) set.delete(id);
      else set.add(id);
      if (!set.size) all.forEach((k) => set.add(k));
    }
    syncChips();
    apply();
  });

  syncChips();
}

function syncChips() {
  $$('#filters .chip').forEach((chip) => {
    const { kind, id } = chip.dataset;
    if (kind === 'product') chip.classList.toggle('on', state.products.has(id));
    else if (kind === 'status') chip.classList.toggle('on', state.statuses.has(id));
    else if (id === 'shipped') {
      chip.classList.toggle('on', state.statuses.size === 1 && state.statuses.has('shipped'));
    } else {
      chip.classList.toggle('on', state.statuses.size === STATUS_ORDER.length
        && state.products.size === Object.keys(D.products).length);
    }
  });
}

/* --- the detail panel ---------------------------------------------- */

function openPanel(id) {
  const it = byId[id];
  const panel = $('#panel');
  if (!it || !panel) return;
  state.selected = id;

  const p = D.products[it.product];
  const chain = [];
  let cur = byId[it.parent];
  while (cur) { chain.unshift(cur); cur = byId[cur.parent]; }

  const line = (x) => `<li data-go="${x.id}">
      <span class="pd" style="background:${colourOf(x)}"></span>${x.title}
      <span class="st">${D.statuses[x.status].verb}</span></li>`;

  const children = kids[it.id] || [];
  const phase = D.phases.find((f) => f.id === it.phase);
  const act = D.activities.find((a) => a.id === it.activity);

  panel.innerHTML = `
    <button class="close" data-close aria-label="Close">✕</button>
    <div class="tags">
      <span class="tag"><span class="pd" style="background:${p.colour}"></span>${p.name}</span>
      <span class="tag st-${it.status}">${D.statuses[it.status].name}</span>
      <span class="tag">${phase ? phase.name : ''}</span>
    </div>
    <h3>${it.title}</h3>
    <p class="blurb">${it.blurb}</p>

    <h5>Stands on</h5>
    ${chain.length ? `<ul class="rel">${chain.map(line).join('')}</ul>`
                   : '<p class="none">Nothing — this is where a branch starts.</p>'}

    <h5>Makes possible</h5>
    ${children.length ? `<ul class="rel">${children.map(line).join('')}</ul>`
                      : '<p class="none">Nothing yet hangs off this.</p>'}

    <div class="where-note">
      In the story map this sits under <b>${act ? act.name : '—'}</b>, at the
      step <b>${it.step}</b>.
    </div>`;

  panel.classList.add('open');
  markSelection();
}

function closePanel() {
  const panel = $('#panel');
  if (panel) panel.classList.remove('open');
  state.selected = null;
  markSelection();
}

function markSelection() {
  $$('[data-node]').forEach((n) => n.classList.toggle('sel', n.dataset.node === state.selected));
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) return closePanel();
  const go = e.target.closest('[data-go]');
  if (go) openPanel(go.dataset.go);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });

/* --- the opening card ---------------------------------------------- */

function buildIntro() {
  const intro = $('#intro');
  if (!intro) return;
  const slot = $('[data-counts]', intro);
  if (slot) {
    slot.innerHTML = SLICES.map((s, i) => `
      <div class="${i === 0 ? 'hi' : ''}">
        <b>${count((it) => s.statuses.includes(it.status))}</b>
        <span>${s.name.replace(/^Slice \d+ · /, '')}</span>
      </div>`).join('');
  }
  intro.addEventListener('click', () => { intro.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') intro.hidden = true; });
}

/* ==================================================================
   View one — the tree
================================================================== */

const SLOT = 132;      // horizontal room per leaf
const LEVEL = 128;     // vertical room per generation
const GAP = 70;        // extra air between branches
const TRUNK_Y = -150;  // where the trunk sits above the branch heads

function buildTree() {
  const stage = $('#stage');
  if (!stage) return;

  const canvas = $('#canvas', stage);
  const svg = $('#links', stage);
  const pos = {};
  let cursor = 0;

  /* Tidy layout: leaves take the next slot, parents centre over theirs. */
  function place(node, depth) {
    const cs = kids[node.id] || [];
    if (!cs.length) {
      pos[node.id] = { x: cursor, y: depth * LEVEL };
      cursor += SLOT;
    } else {
      cs.forEach((c) => place(c, depth + 1));
      const first = pos[cs[0].id].x;
      const last = pos[cs[cs.length - 1].id].x;
      pos[node.id] = { x: (first + last) / 2, y: depth * LEVEL };
    }
  }

  D.phases.forEach((ph, i) => {
    if (i) cursor += GAP;
    place(ph, 1);
  });

  const heads = D.phases.map((p) => pos[p.id].x);
  const rootX = (Math.min.apply(null, heads) + Math.max.apply(null, heads)) / 2;
  pos.__root = { x: rootX, y: TRUNK_Y };

  /* nodes */
  const html = [];

  html.push(`<div class="rm-root" style="left:${rootX}px;top:${TRUNK_Y}px">
      <span class="mark"><img src="../assets/logos/eai-mark-dark.svg" alt="" /></span>
      <b>Enterprise AI</b>
      <span>Everything below hangs off this</span>
    </div>`);

  D.phases.forEach((ph) => {
    const n = D.items.filter((it) => it.phase === ph.id).length;
    html.push(`<div class="branch" id="branch-${ph.id}" style="left:${pos[ph.id].x}px;top:${pos[ph.id].y}px"
        title="${ph.note}">
        <span class="ic">${icon(ph.icon)}</span><b>${ph.name}</b><span class="n">${n}</span>
      </div>`);
  });

  D.items.forEach((it) => {
    const c = colourOf(it);
    html.push(`<button class="node s-${it.status}" data-node="${it.id}"
        style="left:${pos[it.id].x}px;top:${pos[it.id].y}px;--nc:${c};--glow:${c}1f">
        <span class="ring">${icon(it.icon)}</span>
        <span class="lbl">${it.title}</span>
      </button>`);
  });

  canvas.insertAdjacentHTML('beforeend', html.join(''));

  /* links: trunk to branch heads, then parent to child all the way down */
  const paths = [];
  const curve = (a, b, cls) => {
    const mid = a.y + (b.y - a.y) * 0.55;
    paths.push(`<path class="${cls}" data-link="${cls}"
      d="M${a.x} ${a.y} C ${a.x} ${mid}, ${b.x} ${b.y - (b.y - a.y) * 0.45}, ${b.x} ${b.y}" />`);
  };

  // Below the trunk's caption, not through the middle of it.
  D.phases.forEach((ph) => curve({ x: rootX, y: TRUNK_Y + 84 }, pos[ph.id], 'trunk'));
  D.items.forEach((it) => curve(pos[it.parent], pos[it.id], `to-${it.id}`));

  svg.innerHTML = paths.join('');

  /* the drawing's own bounds, so Fit has something to aim at */
  const xs = Object.values(pos).map((p) => p.x);
  const ys = Object.values(pos).map((p) => p.y);
  const box = {
    x1: Math.min.apply(null, xs) - 110, x2: Math.max.apply(null, xs) + 110,
    y1: Math.min.apply(null, ys) - 90, y2: Math.max.apply(null, ys) + 110,
  };
  svg.setAttribute('width', box.x2 - box.x1 + 400);
  svg.setAttribute('height', box.y2 - box.y1 + 400);

  /* --- pan and zoom ------------------------------------------------ */

  const view = { x: 0, y: 0, z: 0.8 };
  const clampZ = (z) => Math.min(1.8, Math.max(0.18, z));

  function draw() {
    canvas.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.z})`;
    const lvl = $('#zoomlvl');
    if (lvl) lvl.textContent = Math.round(view.z * 100) + '%';
  }

  function centreOn(x, y, z) {
    if (z) view.z = clampZ(z);
    view.x = stage.clientWidth / 2 - x * view.z;
    view.y = stage.clientHeight / 2 - y * view.z;
    draw();
  }

  function fit() {
    const w = box.x2 - box.x1;
    const h = box.y2 - box.y1;
    const z = clampZ(Math.min((stage.clientWidth - 80) / w, (stage.clientHeight - 80) / h));
    centreOn((box.x1 + box.x2) / 2, (box.y1 + box.y2) / 2, z);
  }

  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.node, .rm-zoom, .rm-jump, .rm-key, .rm-panel')) return;
    drag = { x: e.clientX - view.x, y: e.clientY - view.y };
    stage.classList.add('dragging');
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    view.x = e.clientX - drag.x;
    view.y = e.clientY - drag.y;
    draw();
  });
  const endDrag = () => { drag = null; stage.classList.remove('dragging'); };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const next = clampZ(view.z * (e.deltaY < 0 ? 1.12 : 0.89));
    view.x = mx - (mx - view.x) * (next / view.z);
    view.y = my - (my - view.y) * (next / view.z);
    view.z = next;
    draw();
  }, { passive: false });

  const zoomBy = (f) => {
    const cx = stage.clientWidth / 2;
    const cy = stage.clientHeight / 2;
    const next = clampZ(view.z * f);
    view.x = cx - (cx - view.x) * (next / view.z);
    view.y = cy - (cy - view.y) * (next / view.z);
    view.z = next;
    draw();
  };

  $('#zoom-in').addEventListener('click', () => zoomBy(1.2));
  $('#zoom-out').addEventListener('click', () => zoomBy(0.83));
  $('#zoom-fit').addEventListener('click', fit);

  const jump = $('#jump');
  jump.innerHTML = '<span>Jump to</span>' + D.phases
    .map((p) => `<button data-jump="${p.id}">${p.name}</button>`).join('');
  jump.addEventListener('click', (e) => {
    const b = e.target.closest('[data-jump]');
    if (!b) return;
    const p = pos[b.dataset.jump];
    centreOn(p.x, p.y + 210, Math.max(view.z, 0.72));
  });

  canvas.addEventListener('click', (e) => {
    const n = e.target.closest('[data-node]');
    if (n) openPanel(n.dataset.node);
  });

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey) return;
    const step = 90;
    if (e.key === 'ArrowLeft') view.x += step;
    else if (e.key === 'ArrowRight') view.x -= step;
    else if (e.key === 'ArrowUp') view.y += step;
    else if (e.key === 'ArrowDown') view.y -= step;
    else if (e.key === '+' || e.key === '=') return zoomBy(1.2);
    else if (e.key === '-') return zoomBy(0.83);
    else if (e.key.toLowerCase() === 'f') return fit();
    else return;
    e.preventDefault();
    draw();
  });

  window.addEventListener('resize', () => draw());

  // Land on the trunk with the first two branches in view, not on the whole
  // drawing shrunk to nothing. Fit is one key away for anyone who wants it.
  centreOn(rootX, 210, 0.8);

  applyTree = () => {
    D.items.forEach((it) => {
      const el = $(`[data-node="${it.id}"]`);
      if (el) el.classList.toggle('dim', !visible(it));
    });
    $$('#links path[data-link]').forEach((p) => {
      const id = p.dataset.link.replace(/^to-/, '');
      const it = byId[id];
      p.classList.toggle('dim', !!it && !visible(it));
    });
  };
  applyTree();
}

let applyTree = () => {};

/* ==================================================================
   View two — the story map
================================================================== */

function buildMap() {
  const grid = $('#map');
  if (!grid) return;

  const cols = [];
  D.activities.forEach((a) => a.steps.forEach((s) => cols.push({ act: a, step: s })));

  grid.style.gridTemplateColumns = `212px repeat(${cols.length}, 202px)`;

  const cells = [];

  /* row 1 — the backbone */
  cells.push('<div class="map-corner"></div>');
  D.activities.forEach((a) => {
    const n = D.items.filter((it) => it.activity === a.id).length;
    cells.push(`<div class="act-head" style="grid-column:span ${a.steps.length}">
        <b>${a.name}</b><span>${n} items</span></div>`);
  });

  /* row 2 — the steps under it */
  cells.push('<div class="map-corner"></div>');
  cols.forEach((c) => cells.push(`<div class="step-head">${c.step}</div>`));

  /* one row per slice */
  SLICES.forEach((s, si) => {
    const inSlice = D.items.filter((it) => s.statuses.includes(it.status));
    cells.push(`<div class="slice-label" data-slice="${si}" style="--sc:${s.colour}">
        <b>${s.name}</b><p>${s.note}</p>
        <span class="n">${inSlice.length} items</span>
      </div>`);

    cols.forEach((c) => {
      const here = inSlice.filter((it) => it.activity === c.act.id && it.step === c.step);
      cells.push(`<div class="cell" data-slice="${si}">${here.map(cardHtml).join('')}</div>`);
    });

    if (si < SLICES.length - 1) cells.push('<div class="slice-row-bg" data-slice-rule></div>');
  });

  grid.innerHTML = cells.join('');

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('[data-node]');
    if (card) openPanel(card.dataset.node);
  });

  /* the walk: reveal one slice at a time, which is the whole point of
     slicing a story map — "here is today, and here is what next adds" */
  const walk = $('#walk');
  if (walk) {
    walk.innerHTML = '<span class="lbl">Show</span>' + SLICES.map((s, i) => `
      <button class="chip" data-walk="${i + 1}">${i === 0 ? 'Today' : '+ ' + s.name.replace(/^Slice \d+ · /, '')}</button>`)
      .join('') + '<button class="chip" data-walk="99">Everything</button>';
    walk.addEventListener('click', (e) => {
      const b = e.target.closest('[data-walk]');
      if (!b) return;
      state.slices = Number(b.dataset.walk);
      $$('#walk .chip').forEach((c) => c.classList.toggle('on', c === b));
      apply();
    });
    walk.querySelector('[data-walk="99"]').classList.add('on');
  }

  applyMap = () => {
    $$('#map [data-node]').forEach((el) => {
      el.classList.toggle('hidden', !visible(byId[el.dataset.node]));
    });
    $$('#map [data-slice], #map [data-slice-rule]').forEach((el) => {
      const si = el.dataset.slice;
      const on = si === undefined || Number(si) < state.slices;
      el.style.display = on ? '' : 'none';
    });
    $$('#map .slice-row-bg').forEach((el, i) => {
      el.style.display = i + 1 < state.slices ? '' : 'none';
    });
  };
  applyMap();
}

function cardHtml(it) {
  const p = D.products[it.product];
  return `<button class="card s-${it.status}" data-node="${it.id}" style="--nc:${p.colour}">
      <b>${it.title}</b>
      <span>${it.blurb}</span>
      <span class="meta"><span class="pd"></span>${p.short} · ${D.statuses[it.status].verb}</span>
    </button>`;
}

let applyMap = () => {};

/* --- go ------------------------------------------------------------ */

function apply() { applyTree(); applyMap(); markSelection(); }

buildFilters();
buildIntro();
buildTree();
buildMap();

})();
