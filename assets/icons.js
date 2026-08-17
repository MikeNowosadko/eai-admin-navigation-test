/* ------------------------------------------------------------------
   The dock's app icons.

   Every flow used to carry its own copy of these as inline SVG, so a
   fix had to be made six times and usually wasn't. They live here now
   and the dock asks for one by name:

       <span class="ico" data-icon="safari"></span>

   Shape. macOS icons are not rounded rectangles. On Apple's 1024 grid
   the tile is 824 wide, centred, with a 185.4 corner — and the corner
   is a continuous curve (a superellipse) rather than a circular arc,
   which is why a `border-radius` version always reads slightly wrong.
   SQUIRCLE below is that shape on our 64 canvas: 51.5 across, inset
   6.25, corners generated at Apple's smoothing.

   The inset matters as much as the curve. Real icons sit inside a
   larger transparent tile, which is what gives a dock its air, and it
   lets Trash and Downloads break the square entirely the way they do
   on a real machine. Because the transparency is inside the SVG, the
   shadow has to be a `drop-shadow()` filter rather than a `box-shadow`
   — see .dock .ico in desktop.css.
------------------------------------------------------------------- */

const SQUIRCLE =
  'M 24.79 6.25 h 14.42 c 6.49 0 9.734 0 12.213 1.263 a 11.588 11.588 0 0 1 5.064 5.064 ' +
  'c 1.263 2.479 1.263 5.724 1.263 12.213 v 14.42 c 0 6.49 0 9.734 -1.263 12.213 ' +
  'a 11.588 11.588 0 0 1 -5.064 5.064 c -2.479 1.263 -5.724 1.263 -12.213 1.263 h -14.42 ' +
  'c -6.49 0 -9.734 0 -12.213 -1.263 a 11.588 11.588 0 0 1 -5.064 -5.064 ' +
  'c -1.263 -2.479 -1.263 -5.724 -1.263 -12.213 v -14.42 c 0 -6.49 0 -9.734 1.263 -12.213 ' +
  'a 11.588 11.588 0 0 1 5.064 -5.064 c 2.479 -1.263 5.724 -1.263 12.213 -1.263 Z';

/* --- building blocks ------------------------------------------------ */

/**
 * An app tile: art clipped to the squircle, then the two things every
 * macOS icon has on top of its art — a light wash from the top edge and
 * a hairline rim. `rim: 'dark'` for icons that are themselves white,
 * where a white rim would be invisible.
 */
function tile(id, art, { defs = '', rim = 'light', gloss = 0.16 } = {}) {
  const clip = `c-${id}`;
  const wash = `g-${id}`;
  const rimColor = rim === 'dark' ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.34)';
  return svg(`
    <defs>
      <clipPath id="${clip}"><path d="${SQUIRCLE}" /></clipPath>
      <linearGradient id="${wash}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="${gloss}" />
        <stop offset="0.55" stop-color="#ffffff" stop-opacity="0" />
      </linearGradient>
      ${defs}
    </defs>
    <g clip-path="url(#${clip})">${art}</g>
    <path d="${SQUIRCLE}" fill="url(#${wash})" />
    <path d="${SQUIRCLE}" fill="none" stroke="${rimColor}" stroke-width="0.7" />
  `);
}

/** A free-standing icon — no tile, no clip. Trash and Downloads. */
function loose(art, defs = '') {
  return svg(defs ? `<defs>${defs}</defs>${art}` : art);
}

function svg(body) {
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`;
}

/** Top-to-bottom fill, the way nearly every macOS icon is lit. */
function vert(id, top, bottom) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${top}" /><stop offset="1" stop-color="${bottom}" /></linearGradient>`;
}

/** The tile's background, drawn oversized so the clip does the shaping. */
function bg(fill) {
  return `<rect width="64" height="64" fill="${fill}" />`;
}

const polar = (cx, cy, r, deg) => {
  const a = (deg - 90) * Math.PI / 180;
  return [round(cx + r * Math.cos(a)), round(cy + r * Math.sin(a))];
};
const round = (n) => Math.round(n * 100) / 100;

/**
 * A cogwheel, because System Settings has two of them and drawing the
 * teeth by hand is how the old icon ended up as a circle with four tabs.
 */
function gear(cx, cy, outer, inner, teeth, hole) {
  const step = 360 / teeth;
  const tooth = step * 0.3;   // half-width of the tooth crown
  const valley = step * 0.28; // half-width of the gap between teeth
  let d = '';
  for (let i = 0; i < teeth; i += 1) {
    const base = i * step;
    const [ax, ay] = polar(cx, cy, outer, base - tooth);
    const [bx, by] = polar(cx, cy, outer, base + tooth);
    const [vx, vy] = polar(cx, cy, inner, base + step / 2 - valley);
    const [wx, wy] = polar(cx, cy, inner, base + step / 2 + valley);
    d += `${i === 0 ? `M ${ax} ${ay}` : `L ${ax} ${ay}`} `;
    d += `A ${outer} ${outer} 0 0 1 ${bx} ${by} L ${vx} ${vy} `;
    d += `A ${inner} ${inner} 0 0 1 ${wx} ${wy} `;
  }
  d += 'Z';
  // second subpath, wound the same way, punches the axle out under evenodd
  d += ` M ${cx} ${round(cy - hole)} A ${hole} ${hole} 0 0 1 ${cx} ${round(cy + hole)}` +
    ` A ${hole} ${hole} 0 0 1 ${cx} ${round(cy - hole)} Z`;
  return d;
}

/* --- the icons ------------------------------------------------------- */

const ICONS = {};

/* Finder. Two-tone, split down the middle, and the face is the tell:
   the eye and the smile invert as they cross the seam — light on the
   blue half, navy on the pale half. Getting that wrong is what makes
   most reproductions look like a sticker. */
ICONS.finder = (() => {
  const face = `
    <rect x="21.2" y="21.8" width="3.8" height="10.2" rx="1.9" />
    <rect x="39" y="21.8" width="3.8" height="10.2" rx="1.9" />
    <path d="M22.4 38.4c2.7 4 6 6 9.6 6s6.9-2 9.6-6"
          fill="none" stroke-width="3.4" stroke-linecap="round" />`;
  return tile('finder', `
    ${bg('url(#fnd-l)')}
    <rect x="32" width="32" height="64" fill="url(#fnd-r)" />
    <g clip-path="url(#fnd-left)" fill="#eaf5ff" stroke="#eaf5ff">${face}</g>
    <g clip-path="url(#fnd-right)" fill="#12456f" stroke="#12456f">${face}</g>
  `, {
    defs: vert('fnd-l', '#4aa8f7', '#1a72dd') + vert('fnd-r', '#eef6ff', '#c2ddf7') +
      '<clipPath id="fnd-left"><rect x="0" y="0" width="32" height="64" /></clipPath>' +
      '<clipPath id="fnd-right"><rect x="32" y="0" width="32" height="64" /></clipPath>',
  });
})();

/* Safari. The dial is the detail people read at dock size: a ring of
   ticks, long at the cardinals, and a needle that is red on the leading
   half and pale on the trailing one. */
ICONS.safari = (() => {
  let ticks = '';
  for (let deg = 0; deg < 360; deg += 6) {
    const major = deg % 90 === 0;
    const [x1, y1] = polar(32, 32, 22.6, deg);
    const [x2, y2] = polar(32, 32, major ? 18.6 : 20.4, deg);
    ticks += `<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="#8b9bab" ` +
      `stroke-width="${major ? 1.5 : 0.85}" stroke-linecap="round" />`;
  }
  return tile('safari', `
    ${bg('url(#saf-b)')}
    <circle cx="32" cy="32" r="22.6" fill="#ffffff" opacity="0.95" />
    <circle cx="32" cy="32" r="21.3" fill="url(#saf-d)" />
    <g opacity="0.75" transform="translate(32 32) scale(0.925) translate(-32 -32)">${ticks}</g>
    <g transform="rotate(45 32 32)">
      <path d="M32 12.5 36.4 32 32 36.4 27.6 32Z" fill="#f5473c" />
      <path d="M32 51.5 27.6 32 32 27.6 36.4 32Z" fill="#e9ecef" />
    </g>
    <circle cx="32" cy="32" r="1.5" fill="#b9c0c8" />
  `, { defs: vert('saf-b', '#22b0f2', '#0f5fd2') + vert('saf-d', '#fdfefe', '#e7edf3') });
})();

/* Mail. An open envelope seen from the front: the inside of the flap is
   the pale wedge at the top, the front panel folds up over it. */
ICONS.mail = tile('mail', `
  ${bg('url(#mail-b)')}
  <rect x="9" y="19" width="46" height="27" rx="4.4" fill="#ffffff" />
  <path d="M9.6 20.4 32 36.6 54.4 20.4V22L32 38.6 9.6 22Z" fill="#c3dcf3" />
  <path d="M9 45.2V23.4l14.8 10.9zM55 45.2V23.4L40.2 34.3z" fill="#eef5fc" />
  <path d="M9 45.4 24.6 33.9 32 39.2l7.4-5.3L55 45.4a2.6 2.6 0 0 1-2.6 2.4H11.6A2.6 2.6 0 0 1 9 45.4z"
        fill="#ffffff" />
`, { defs: vert('mail-b', '#25b5fb', '#0a72e8') });

/* Messages. One bubble, tail bottom-left, nearly filling the tile. */
ICONS.messages = tile('messages', `
  ${bg('url(#msg-b)')}
  <path d="M32 13.4c11.6 0 20.4 7.4 20.4 16.9S43.6 47.2 32 47.2c-2.6 0-5.1-.3-7.4-1
           -2.5 1.9-6.2 4-10.2 4.6-.8.1-1.3-.7-.9-1.4 1.2-1.9 2.5-4.4 2.9-6.8
           -3.9-3.1-6.8-7.4-6.8-12.3 0-9.5 8.8-16.9 20.4-16.9z" fill="#ffffff" />
`, { defs: vert('msg-b', '#6ef177', '#0cbb2e') });

/* Calendar. No coloured header band — that is the iOS icon. On the Mac
   it is a white page with the weekday in red above a very large day. */
ICONS.calendar = tile('calendar', `
  ${bg('url(#cal-b)')}
  <text x="32" y="21.5" text-anchor="middle" fill="#f5423c"
        font-family="Inter, system-ui, sans-serif" font-size="7.6" font-weight="600"
        letter-spacing="0.2">WED</text>
  <text x="32" y="49.5" text-anchor="middle" fill="#33373d"
        font-family="Inter, system-ui, sans-serif" font-size="27" font-weight="400">12</text>
`, { defs: vert('cal-b', '#ffffff', '#f4f5f7'), rim: 'dark', gloss: 0 });

/* Notes. Yellow band, a hairline under it, then ruled paper. */
ICONS.notes = tile('notes', `
  ${bg('url(#not-b)')}
  <rect y="6" width="64" height="11.6" fill="url(#not-y)" />
  <rect y="17.2" width="64" height="0.7" fill="#e0ab1f" opacity="0.55" />
  <g stroke="#dcd8cb" stroke-width="1.9" stroke-linecap="round">
    <path d="M13 25.5h38" /><path d="M13 32.5h38" />
    <path d="M13 39.5h38" /><path d="M13 46.5h24" />
  </g>
`, { defs: vert('not-b', '#ffffff', '#faf9f5') + vert('not-y', '#ffe066', '#fcc42e'), rim: 'dark', gloss: 0 });

/* Photos. Eight petals round a white centre, multiplied so the overlaps
   deepen the way the real pinwheel does. */
ICONS.photos = (() => {
  const hues = ['#f7c93f', '#f3903a', '#ee5647', '#e8459a', '#a457d8', '#4a7ce0', '#33c1d2', '#57c45a'];
  const petals = hues.map((fill, i) =>
    `<ellipse cx="32" cy="18.6" rx="6.3" ry="10.6" fill="${fill}"
              transform="rotate(${i * 45} 32 32)" />`).join('');
  return tile('photos', `
    ${bg('url(#pho-b)')}
    <g style="mix-blend-mode: multiply" opacity="0.88">${petals}</g>
  `, { defs: vert('pho-b', '#ffffff', '#f5f6f8'), rim: 'dark', gloss: 0 });
})();

/* System Settings. Two real cogs, generated rather than suggested — a
   large one high and right, a small one tucked below it. */
ICONS.settings = tile('settings', `
  ${bg('url(#set-b)')}
  <path d="${gear(35.5, 27.5, 14.6, 11.4, 8, 4.8)}" fill="url(#set-g)" fill-rule="evenodd" />
  <path d="${gear(22, 43.5, 9.6, 7.4, 7, 3.1)}" fill="url(#set-g)" fill-rule="evenodd" />
`, { defs: vert('set-b', '#8e949d', '#4f545c') + vert('set-g', '#ffffff', '#e3e7ec') });

/* Terminal. Black, a prompt, and nothing else — the Mac icon has no
   traffic lights on it, whatever every stock illustration says. */
ICONS.terminal = tile('terminal', `
  ${bg('url(#trm-b)')}
  <path d="M18 23.5 27.5 32 18 40.5" fill="none" stroke="#ffffff"
        stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M31 41.5h15" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round" />
`, { defs: vert('trm-b', '#33343a', '#111214'), gloss: 0.1 });

/* Downloads. A folder, not a tile — the corner of the dock where the
   shape is allowed to be its own outline. */
ICONS.downloads = loose(`
  <path d="M9.4 15.6h14.9l3.8 4.6h22.5c1.5 0 2.7 1.2 2.7 2.7v6.9H6.7v-11.5c0-1.5 1.2-2.7 2.7-2.7z"
        fill="url(#dl-back)" />
  <path d="M6.7 24.9h50.6c1.5 0 2.7 1.2 2.7 2.8l-2.6 17a4.2 4.2 0 0 1-4.1 3.5H10.7a4.2 4.2 0 0 1-4.1-3.5l-2.6-17c0-1.6 1.2-2.8 2.7-2.8z"
        fill="url(#dl-front)" />
  <g stroke="#ffffff" stroke-width="2.9" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.95">
    <path d="M32 29.6v9.4" /><path d="M26.8 34.2 32 39.4l5.2-5.2" />
  </g>
`, vert('dl-back', '#84caf9', '#4f9fe6') + vert('dl-front', '#aedbfc', '#3f93e4'));

/* Trash. Also loose, and translucent: a bin you can see the wallpaper
   through, with the lid sitting slightly proud of the body. */
ICONS.trash = loose(`
  <g opacity="0.92">
    <path d="M15.4 20h33.2l-3.3 30.6a4.2 4.2 0 0 1-4.2 3.8H22.9a4.2 4.2 0 0 1-4.2-3.8z"
          fill="url(#tr-body)" stroke="rgba(255,255,255,0.55)" stroke-width="0.9" />
    <g stroke="rgba(255,255,255,0.5)" stroke-width="1.5" stroke-linecap="round">
      <path d="M26.5 27.5v19" /><path d="M32 27.5v19" /><path d="M37.5 27.5v19" />
    </g>
    <rect x="12.6" y="15.4" width="38.8" height="5.2" rx="2.6"
          fill="url(#tr-lid)" stroke="rgba(255,255,255,0.6)" stroke-width="0.9" />
    <path d="M27 9.6h10a2.4 2.4 0 0 1 2.4 2.4v3.4H24.6V12A2.4 2.4 0 0 1 27 9.6z"
          fill="url(#tr-lid)" stroke="rgba(255,255,255,0.55)" stroke-width="0.9" />
  </g>
`, vert('tr-body', 'rgba(238,244,249,0.62)', 'rgba(196,208,220,0.52)') +
   vert('tr-lid', 'rgba(248,251,253,0.9)', 'rgba(214,224,234,0.8)'));

/* --- the coding apps ------------------------------------------------ */

ICONS.copilot = tile('copilot', `
  ${bg('#0d1117')}
  <path d="M32 19.5c8.2 0 12.3 3.1 12.3 3.1s4.1-1 6.1 1c1.7 1.7 1.5 6.2 1.5 6.2s2.6 1.4 2.6 5.7
           c0 6.2-4.1 9.7-8.2 11.5-4.1 1.9-9.2 2.3-14.3 2.3s-10.2-.4-14.3-2.3c-4.1-1.8-8.2-5.3-8.2-11.5
           0-4.3 2.6-5.7 2.6-5.7s-.2-4.5 1.5-6.2c2-2 6.1-1 6.1-1S23.8 19.5 32 19.5z" fill="#ffffff" />
  <ellipse cx="24" cy="37.2" rx="5.2" ry="6.2" fill="#0d1117" />
  <ellipse cx="40" cy="37.2" rx="5.2" ry="6.2" fill="#0d1117" />
`, { gloss: 0.1 });

ICONS.claude = tile('claude', `
  ${bg('url(#cld-b)')}
  <g stroke="#ffffff" stroke-width="4.4" stroke-linecap="round">
    <path d="M32 16v32" /><path d="M18 32h28" />
    <path d="M22.1 22.1 41.9 41.9" /><path d="M41.9 22.1 22.1 41.9" />
  </g>
`, { defs: vert('cld-b', '#e08a68', '#cf6647') });

ICONS.codex = tile('codex', `
  ${bg('url(#cdx-b)')}
  <g fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M32 15.5c4.7 0 8.4 3.4 8.4 7.7v3.3" />
    <path d="M44.4 23c4.1 2.3 5.5 7.4 3.1 11.3l-1.7 2.9" />
    <path d="M46.5 38.6c-.4 4.7-4.5 8.1-9.1 7.6l-3.2-.5" />
    <path d="M34.4 48.3c-4.3 2-9.4.2-11.4-3.9l-1.5-3" />
    <path d="M20 43.3c-4.5-1.4-7-6-5.7-10.5l1-3.1" />
    <path d="M16.9 28.4c1.8-4.3 6.6-6.4 10.9-4.8l3 1.2" />
  </g>
`, { defs: vert('cdx-b', '#232326', '#0b0b0d'), gloss: 0.1 });

ICONS.vscode = tile('vscode', `
  ${bg('url(#vsc-b)')}
  <path d="M45.5 10.5 30.2 26.2l-8.6-6.7-4.8 3.2 7.3 6.3-7.3 6.3 4.8 3.2 8.6-6.7 15.3 15.7 7.6-3.8V14.3z"
        fill="#ffffff" opacity="0.96" />
  <path d="M45.5 21.6v20.8l-11.4-10.4z" fill="#0f6cbd" opacity="0.5" />
`, { defs: vert('vsc-b', '#2ba6f2', '#0e6ab9') });

ICONS.gemini = tile('gemini', `
  ${bg('url(#gem-b)')}
  <path d="M32 12c0 11 9 20 20 20-11 0-20 9-20 20 0-11-9-20-20-20 11 0 20-9 20-20z" fill="#ffffff" />
`, {
  defs: '<linearGradient id="gem-b" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#4285f4" /><stop offset="1" stop-color="#8e5cf0" /></linearGradient>',
});

/* EAI Setup — the wordmark on a white tile, same grid as the rest. */
ICONS.eai = tile('eai', `
  ${bg('url(#eai-b)')}
  <g transform="translate(13.4 24.2) scale(0.113)" >
    <path fill="#0d3857" d="M132.05,114.13L187.76,5.98c2.67-5.34,9.16-7.5,14.5-4.83h0c5.34,2.67,7.5,9.16,4.83,14.5l-55.7,108.16c-2.67,5.34-9.16,7.5-14.5,4.83h0c-5.34-2.67-7.5-9.16-4.83-14.5Z" />
    <path fill="#0d3857" d="M236.03,87.39h0c-5.37,2.85-12.03.72-14.75-4.72L187.81,15.65c-.78-1.56-1.15-3.21-1.15-4.84,0-3.96,2.19-7.78,5.98-9.67,5.34-2.67,11.84-.51,14.51,4.83l33.49,67.04c2.62,5.25.58,11.63-4.6,14.38Z" />
    <path fill="#8edff9" d="M262.66,118.32c0,2.57-.84,4.95-2.27,6.86-.11.14-.23.28-.34.44-2.06,2.48-5.17,4.09-8.65,4.16h-.21c-5.85,0-10.68-4.37-11.37-10.04-.06-.47-.09-.94-.09-1.42,0-6.35,5.12-11.47,11.46-11.47,3.08,0,5.88,1.21,7.95,3.18,2.17,2.1,3.52,5.04,3.52,8.29Z" />
    <rect fill="#0d3857" x="253.44" y="54.08" width="129.78" height="21.62" rx="10.81" transform="translate(383.22 -253.44) rotate(90)" />
    <rect fill="#0d3857" x="0" y=".43" width="85.1" height="21.62" rx="10.81" />
    <rect fill="#0d3857" x="0" y="54.3" width="53.28" height="21.62" rx="10.81" />
    <rect fill="#0d3857" x="0" y="108.16" width="85.1" height="21.62" rx="10.81" />
    <circle fill="#8edff9" cx="73.64" cy="65.1" r="11.47" />
  </g>
`, { defs: vert('eai-b', '#ffffff', '#eef2f7'), rim: 'dark', gloss: 0 });

/* --- hydration ------------------------------------------------------- */

/**
 * Fill every `data-icon` under `root`. Runs once on load for the dock,
 * and is exported for anything that builds an icon later.
 */
function paintIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    const art = ICONS[el.dataset.icon];
    if (art) el.innerHTML = art;
  });
}

paintIcons();
