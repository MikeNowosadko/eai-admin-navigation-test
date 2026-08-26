/* Paper shaders for the two-column setup art panel.

   Two backgrounds, both exported from the Paper file the design lives in,
   so the pair can be looked at against each other:

     warp    frame 5N0-0 — deep navy sinking into near-black
     dither  frame 2S0-0 — a plum ground under a blue dithered warp

   Paper's React exports are, in order,

     <Warp speed={1.8} scale={1} softness={1.5} proportion={0.64}
           swirl={0.86} swirlIterations={7} shape="edge" distortion={0.2}
           shapeScale={0.6} frame={511917.6999996658}
           colors={['#0D3856', '#0E3755', '#0A180D']} />

     <Dithering speed={1} shape="warp" type="random" size={0.1} scale={1}
                frame={1443085.659999127} colorBack="#00000000"
                colorFront="#145788" />        // over a #301C2A ground

   and these are the same two things without React. Those components only
   map props onto uniforms and hand them to ShaderMount, so the sizing
   uniforms below are @paper-design/shaders' defaultPatternSizing, which
   neither export touched. The frame offsets are kept so the first painted
   frame of each is the composition in the design file.

   Switch between them from ⌘K, or land on one directly with ?art=dither.
   The choice is remembered for the session, so restarting the flow to see
   a screen again doesn't also reset the background. */

import {
  ShaderMount,
  ShaderFitOptions,
  WarpPatterns,
  DitheringShapes,
  DitheringTypes,
  getShaderColorFromString,
  getShaderNoiseTexture,
  warpFragmentShader,
  ditheringFragmentShader,
} from 'https://esm.sh/@paper-design/shaders@0.0.80';

/* defaultPatternSizing, i.e. what <Warp> and <Dithering> would have passed. */
const PATTERN_SIZING = {
  u_fit: ShaderFitOptions.none,
  u_scale: 1,
  u_rotation: 0,
  u_offsetX: 0,
  u_offsetY: 0,
  u_originX: 0.5,
  u_originY: 0.5,
  u_worldWidth: 0,
  u_worldHeight: 0,
};

/* getShaderNoiseTexture() hands back an <img> that hasn't decoded yet, and
   ShaderMount throws if it's handed one that isn't ready. React's <Warp>
   awaits it before mounting; without React we do the same, including the
   1024px floor the wrapper applies so the texture doesn't tile visibly. */
async function noiseTexture() {
  const img = getShaderNoiseTexture();
  await img.decode();
  if (img.naturalWidth && img.naturalWidth < 1024 && img.naturalHeight < 1024) {
    const aspect = img.naturalWidth / img.naturalHeight;
    img.width = Math.round(aspect > 1 ? 1024 * aspect : 1024);
    img.height = Math.round(aspect > 1 ? 1024 : 1024 / aspect);
  }
  return img;
}

const WARP_COLORS = ['#0D3856', '#0E3755', '#0A180D'];

const STYLES = {
  warp: {
    fragmentShader: warpFragmentShader,
    speed: 1.8,
    frame: 511917.6999996658,
    async uniforms() {
      return {
        u_colors: WARP_COLORS.map(getShaderColorFromString),
        u_colorsCount: WARP_COLORS.length,
        u_proportion: 0.64,
        u_softness: 1.5,
        u_distortion: 0.2,
        u_swirl: 0.86,
        u_swirlIterations: 7,
        u_shapeScale: 0.6,
        u_shape: WarpPatterns.edge,
        u_noiseTexture: await noiseTexture(),
        ...PATTERN_SIZING,
      };
    },
  },

  dither: {
    fragmentShader: ditheringFragmentShader,
    speed: 1,
    frame: 1443085.659999127,
    async uniforms() {
      return {
        // Transparent back on purpose: the plum ground is the panel's own
        // background colour showing through, which is how the frame is built.
        u_colorBack: getShaderColorFromString('#00000000'),
        u_colorFront: getShaderColorFromString('#145788'),
        u_shape: DitheringShapes.warp,
        u_type: DitheringTypes.random,
        u_pxSize: 0.1,
        ...PATTERN_SIZING,
      };
    },
  },
};

const DEFAULT_STYLE = 'warp';
const STORE_KEY = 'eai-setup-art';

const stage = document.getElementById('setupShader');
const panel = document.querySelector('.setup-split-art');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

/* One layer per style, mounted the first time it is asked for and then kept.
   Swapping meant disposing and rebuilding a WebGL context on every press,
   and browsers only hand out so many of those; two live contexts, one of
   them parked at speed 0, costs less than churning through them. */
const layers = new Map();
let current = null;

async function layerFor(name) {
  if (layers.has(name)) return layers.get(name);

  const style = STYLES[name];
  const host = document.createElement('div');
  host.dataset.art = name;
  stage.appendChild(host);

  const mount = new ShaderMount(
    host,
    style.fragmentShader,
    await style.uniforms(),
    undefined,
    reduced.matches ? 0 : style.speed,
    style.frame,
  );

  const layer = { host, mount, speed: style.speed };
  layers.set(name, layer);
  return layer;
}

async function showArt(name) {
  if (!STYLES[name] || name === current) return;

  const layer = await layerFor(name);

  // Park the outgoing one rather than tearing it down: speed 0 stops its
  // rAF entirely, so it holds a context and nothing else.
  for (const [key, other] of layers) {
    const on = key === name;
    other.host.classList.toggle('on', on);
    other.mount.setSpeed(on && !reduced.matches ? other.speed : 0);
  }

  current = name;
  if (panel) panel.dataset.art = name;
  document.querySelectorAll('button[data-art]').forEach((btn) => {
    btn.classList.toggle('on', btn.dataset.art === name);
  });

  try {
    sessionStorage.setItem(STORE_KEY, name);
  } catch {
    // Private browsing, or a file:// origin with storage blocked. The
    // background still switches; it just won't survive a restart.
  }
}

if (stage) {
  document.querySelectorAll('button[data-art]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (typeof toggleSheet === 'function') toggleSheet(false);
      showArt(btn.dataset.art);
    });
  });

  // Someone can turn reduced motion on mid-session; a still frame is the
  // point of it, not a background that never existed.
  reduced.addEventListener('change', (e) => {
    const layer = layers.get(current);
    if (layer) layer.mount.setSpeed(e.matches ? 0 : layer.speed);
  });

  /* Explicit URL beats the remembered choice, which beats the default —
     so a link can pin a background for a session without the last one
     quietly overriding it. */
  const asked = new URLSearchParams(window.location.search).get('art');
  let stored = null;
  try {
    stored = sessionStorage.getItem(STORE_KEY);
  } catch {
    stored = null;
  }
  showArt(STYLES[asked] ? asked : STYLES[stored] ? stored : DEFAULT_STYLE);
}
