/* Ponto de partida: carrega fontes e imagens, monta a sala e a interface. */
import { VOLUMES } from './volumes.js';
import { loadAssets, loadFonts } from './assets.js';
import { nowHour } from './time.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
const bar = document.querySelector('.loader__bar span');
const setProgress = (p) => {
  if (bar) bar.style.transform = `scaleX(${Math.min(1, p)})`;
};

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

function reveal() {
  document.body.classList.remove('is-loading');
  document.body.classList.add('is-ready');
}

async function boot() {
  setProgress(0.06);
  await Promise.all([loadFonts(), loadAssets()]);
  setProgress(0.3);

  let scene = null;
  if (hasWebGL()) {
    try {
      const { LibraryScene } = await import('./scene.js');
      scene = new LibraryScene(document.querySelector('.room'), VOLUMES, { reduced, touch });
      scene.hour = nowHour();
      await scene.build((p) => setProgress(0.3 + p * 0.62));
    } catch (err) {
      console.warn('[ANTHROXIA] A sala 3D não abriu neste aparelho; mostrando a lista.', err);
      scene = null;
    }
  }
  if (!scene) document.body.classList.add('no-shelf');

  const { UI } = await import('./ui.js');
  const ui = new UI({ scene, reduced, touch });
  window.__anthroxia = { scene, ui };
  setProgress(1);
  await new Promise((r) => setTimeout(r, reduced ? 0 : 280));
  reveal();

  if (scene) {
    scene.start();
    scene.playIntro();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) scene.stop();
      else if (ui.open < 0 && !ui.immersed && !ui.busy) scene.start();
    });
  }
  setTimeout(() => ui.openFromHash(), scene && !reduced ? 1500 : 60);
}

boot().catch((err) => {
  console.error('[ANTHROXIA]', err);
  document.body.classList.add('no-shelf', 'has-error');
  reveal();
});
