/* Paper warp shader for /build-sugar — hero and footer bookends.

   Frame 5ON-0 from the marketing website page:
   app.paper.design/file/01KMHD8FRKFWGTA13S78JGDBGA/
     01KMHD8FRK9537AZY3MY1EWZA8/5ON-0

     <Warp speed={1.8} scale={1} softness={1.5} proportion={0.64}
           swirl={0.86} swirlIterations={7} shape="edge" distortion={0.2}
           shapeScale={0.6} frame={511917.6999996658}
           colors={['#0D3856', '#0E3755', '#0A180D']} />

   Both panels mount together with the same frame offset and speed so
   the animation stays in phase. Re-export from Paper → update below. */

import {
  ShaderMount,
  ShaderFitOptions,
  WarpPatterns,
  getShaderColorFromString,
  getShaderNoiseTexture,
  warpFragmentShader,
} from 'https://esm.sh/@paper-design/shaders@0.0.80';

const WARP_COLORS = ['#0D3856', '#0E3755', '#0A180D'];

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

const SPEED = 1.8;
const FRAME = 511917.6999996658;

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

function warpUniforms(noise) {
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
    u_noiseTexture: noise,
    ...PATTERN_SIZING,
  };
}

const stages = document.querySelectorAll('[data-sg-shader]');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

if (stages.length) {
  const noise = await noiseTexture();
  const uniforms = warpUniforms(noise);
  const mounts = [];

  stages.forEach((stage) => {
    const host = document.createElement('div');
    host.className = 'on';
    stage.appendChild(host);
    mounts.push(new ShaderMount(
      host,
      warpFragmentShader,
      uniforms,
      undefined,
      reduced.matches ? 0 : SPEED,
      FRAME,
    ));
  });

  reduced.addEventListener('change', (e) => {
    const speed = e.matches ? 0 : SPEED;
    mounts.forEach((m) => m.setSpeed(speed));
  });
}
