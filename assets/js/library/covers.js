/* Desenho das capas, lombadas e texturas da sala (Canvas 2D).
   Cada função desenha em qualquer tamanho; a cena usa a mesma capa
   que a lista e o livro aberto. No modo "rm" o desenho vira o mapa de
   rugosidade (canal G) e metal (canal B) usado pelo three.js. */
import { assets } from './assets.js';

export const SERIF = '"Bodoni Moda", "Bodoni 72", Didot, Georgia, serif';
export const SANS = 'Jost, Futura, "Century Gothic", system-ui, sans-serif';

const FOILS = {
  copper: ['#f8d8b8', '#d3925f', '#8c4f2c', '#ecb88f', '#a9653d'],
  silver: ['#ffffff', '#d4ced2', '#8f878d', '#f3eff1', '#aaa1a7'],
  magenta: ['#ffb8fb', '#ff2bf0', '#a1008e', '#ff7cf6', '#c600b3'],
};
const FLAT = { ink: '#24111f', wine: '#5a1236' };
const RM = { cloth: 'rgb(0,226,0)', foil: 'rgb(0,70,255)', flat: 'rgb(0,176,0)' };

export const isMetalFoil = (kind) => kind in FOILS;

const mk = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};

function foilFill(ctx, kind, w, h, rm) {
  if (rm) return isMetalFoil(kind) ? RM.foil : RM.flat;
  if (FLAT[kind]) return FLAT[kind];
  const c = FOILS[kind] || FOILS.copper;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, c[0]);
  g.addColorStop(0.28, c[1]);
  g.addColorStop(0.52, c[2]);
  g.addColorStop(0.74, c[3]);
  g.addColorStop(1, c[4]);
  return g;
}

/* imagem pintada numa cor/gravação (usa a transparência do PNG) */
function tinted(img, kind, w, h, rm) {
  const c = mk(w, h);
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0, c.width, c.height);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = typeof kind === 'string' && kind.startsWith('#') ? kind : foilFill(x, kind, c.width, c.height, rm);
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

let noiseCache = null;
function noiseCanvas() {
  if (noiseCache) return noiseCache;
  const c = mk(256, 256);
  const x = c.getContext('2d');
  const id = x.createImageData(256, 256);
  for (let i = 0; i < id.data.length; i += 4) {
    const p = i / 4;
    const X = p % 256;
    const Y = (p / 256) | 0;
    const weave = (X % 4 < 2) !== (Y % 4 < 2) ? 9 : -9;
    const v = 128 + (Math.random() - 0.5) * 64 + weave;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
    id.data[i + 3] = 255;
  }
  x.putImageData(id, 0, 0);
  noiseCache = c;
  return c;
}

function cloth(ctx, w, h, amount = 0.3) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = amount;
  ctx.fillStyle = ctx.createPattern(noiseCanvas(), 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function fitFont(ctx, text, maxW, size, weight, family, style = '') {
  let s = size;
  ctx.font = `${style}${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > maxW && s > 4) {
    s *= 0.94;
    ctx.font = `${style}${weight} ${s}px ${family}`;
  }
  return s;
}

function wrapLines(ctx, text, maxW) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function spaced(ctx, text, cx, y, spacing) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - total / 2;
  const align = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += widths[i] + spacing;
  });
  ctx.textAlign = align;
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

/* ---------------------------------------------------------------- lombada */
export function drawSpine(ctx, w, h, vol, rm = false) {
  const foil = foilFill(ctx, vol.foil, w, h, rm);
  ctx.fillStyle = rm ? RM.cloth : vol.cloth;
  ctx.fillRect(0, 0, w, h);
  if (!rm) {
    cloth(ctx, w, h);
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(0,0,0,.45)');
    g.addColorStop(0.16, 'rgba(0,0,0,.06)');
    g.addColorStop(0.42, 'rgba(255,255,255,.08)');
    g.addColorStop(0.72, 'rgba(0,0,0,.04)');
    g.addColorStop(1, 'rgba(0,0,0,.48)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.fillStyle = foil;
  const band = (y, th) => ctx.fillRect(w * 0.1, y, w * 0.8, Math.max(1, th));
  band(h * 0.042, h * 0.0034);
  band(h * 0.052, h * 0.0012);
  band(h * 0.946, h * 0.0012);
  band(h * 0.953, h * 0.0034);

  if (vol.band) {
    ctx.fillStyle = rm ? RM.flat : vol.band;
    ctx.fillRect(0, h * 0.17, w, h * 0.026);
  }

  ctx.fillStyle = foil;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, vol.numeral, w * 0.74, w * 0.3, 600, SERIF);
  ctx.fillText(vol.numeral, w / 2, h * 0.11);

  // título de cima para baixo
  ctx.save();
  ctx.translate(w / 2, h * 0.235);
  ctx.rotate(Math.PI / 2);
  fitFont(ctx, vol.spine, h * 0.56, w * 0.42, 500, SERIF);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(vol.spine, 0, 0);
  ctx.restore();

  if (assets.mono) {
    const mw = w * 0.46;
    const mh = mw * (assets.mono.height / assets.mono.width);
    ctx.drawImage(tinted(assets.mono, vol.foil, mw, mh, rm), (w - mw) / 2, h * 0.868 - mh / 2, mw, mh);
  }
}

/* ------------------------------------------------------------------- capa */
export function drawCover(ctx, w, h, vol, rm = false) {
  const foil = foilFill(ctx, vol.foil, w, h, rm);
  ctx.fillStyle = rm ? RM.cloth : vol.cloth;
  ctx.fillRect(0, 0, w, h);
  if (!rm) {
    cloth(ctx, w, h, 0.26);
    const hinge = ctx.createLinearGradient(0, 0, w * 0.13, 0);
    hinge.addColorStop(0, 'rgba(0,0,0,.38)');
    hinge.addColorStop(0.5, 'rgba(0,0,0,.08)');
    hinge.addColorStop(0.6, 'rgba(255,255,255,.07)');
    hinge.addColorStop(0.7, 'rgba(0,0,0,.14)');
    hinge.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hinge;
    ctx.fillRect(0, 0, w * 0.13, h);
    const v = ctx.createRadialGradient(w * 0.56, h * 0.4, w * 0.08, w * 0.56, h * 0.5, w * 0.95);
    v.addColorStop(0, 'rgba(255,255,255,.05)');
    v.addColorStop(1, 'rgba(0,0,0,.3)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }

  const fx = w * 0.15;
  const fy = h * 0.055;
  const fw = w * 0.79;
  const fh = h * 0.89;
  const lw = Math.max(1, w * 0.0055);
  ctx.strokeStyle = foil;
  ctx.lineWidth = lw;
  ctx.strokeRect(fx, fy, fw, fh);
  ctx.lineWidth = Math.max(1, w * 0.002);
  ctx.strokeRect(fx + w * 0.02, fy + w * 0.02, fw - w * 0.04, fh - w * 0.04);

  if (vol.band) {
    ctx.fillStyle = rm ? RM.flat : vol.band;
    ctx.fillRect(fx + w * 0.02, fy + fh * 0.16, fw - w * 0.04, Math.max(2, h * 0.01));
  }

  const cx = fx + fw / 2;
  ctx.fillStyle = foil;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `italic 500 ${w * 0.07}px ${SERIF}`;
  ctx.fillText(vol.numeral, cx, fy + fh * 0.12);

  // título, em até três linhas
  const maxW = fw * 0.78;
  let size = w * 0.135;
  let lines;
  for (let k = 0; k < 14; k++) {
    ctx.font = `500 ${size}px ${SERIF}`;
    lines = wrapLines(ctx, vol.title, maxW);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (lines.length <= 3 && widest <= maxW) break;
    size *= 0.92;
  }
  const lh = size * 1.04;
  const titleTop = fy + fh * 0.36 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, titleTop + i * lh));

  ctx.font = `italic 400 ${w * 0.043}px ${SERIF}`;
  const subLines = wrapLines(ctx, vol.sub, maxW);
  const subTop = titleTop + (lines.length - 1) * lh + size * 0.72;
  subLines.forEach((l, i) => ctx.fillText(l, cx, subTop + i * w * 0.056));

  drawEmblem(ctx, vol, cx, fy + fh * 0.7, w * 0.16, foil, rm);

  ctx.font = `400 ${w * 0.028}px ${SANS}`;
  spaced(ctx, 'ANTHROXIA', cx, fy + fh * 0.955, w * 0.013);
}

function drawEmblem(ctx, vol, cx, cy, s, fill, rm) {
  ctx.save();
  ctx.strokeStyle = fill;
  ctx.fillStyle = fill;
  ctx.lineWidth = Math.max(1.2, s * 0.045);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (vol.emblem) {
    case 'mono': {
      if (!assets.mono) break;
      const mh = s * 2.1;
      const mw = mh * (assets.mono.width / assets.mono.height);
      ctx.drawImage(tinted(assets.mono, vol.foil, mw, mh, rm), cx - mw / 2, cy - mh / 2, mw, mh);
      break;
    }
    case 'nib': {
      // pena de escrever
      ctx.beginPath();
      ctx.moveTo(cx, cy + s * 1.05);
      ctx.quadraticCurveTo(cx - s * 0.78, cy + s * 0.05, cx - s * 0.46, cy - s * 0.85);
      ctx.lineTo(cx + s * 0.46, cy - s * 0.85);
      ctx.quadraticCurveTo(cx + s * 0.78, cy + s * 0.05, cx, cy + s * 1.05);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy + s * 1.05);
      ctx.lineTo(cx, cy - s * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.26, s * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.56, cy - s * 0.85);
      ctx.lineTo(cx - s * 0.56, cy - s * 1.05);
      ctx.lineTo(cx + s * 0.56, cy - s * 1.05);
      ctx.lineTo(cx + s * 0.56, cy - s * 0.85);
      ctx.stroke();
      break;
    }
    case 'chat': {
      rrect(ctx, cx - s * 1.05, cy - s * 0.8, s * 1.35, s * 0.85, s * 0.3);
      ctx.stroke();
      rrect(ctx, cx - s * 0.25, cy - s * 0.05, s * 1.3, s * 0.85, s * 0.3);
      ctx.stroke();
      [0, 1, 2].forEach((i) => {
        ctx.beginPath();
        ctx.arc(cx + s * (0.12 + i * 0.28), cy + s * 0.38, s * 0.065, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case 'chip': {
      rrect(ctx, cx - s * 0.7, cy - s * 0.7, s * 1.4, s * 1.4, s * 0.14);
      ctx.stroke();
      rrect(ctx, cx - s * 0.36, cy - s * 0.36, s * 0.72, s * 0.72, s * 0.08);
      ctx.stroke();
      for (let i = -2; i <= 2; i++) {
        const o = i * s * 0.26;
        ctx.beginPath();
        ctx.moveTo(cx + o, cy - s * 0.7);
        ctx.lineTo(cx + o, cy - s * 0.95);
        ctx.moveTo(cx + o, cy + s * 0.7);
        ctx.lineTo(cx + o, cy + s * 0.95);
        ctx.moveTo(cx - s * 0.7, cy + o);
        ctx.lineTo(cx - s * 0.95, cy + o);
        ctx.moveTo(cx + s * 0.7, cy + o);
        ctx.lineTo(cx + s * 0.95, cy + o);
        ctx.stroke();
      }
      break;
    }
    case 'nodes': {
      const pts = [
        [cx, cy - s * 0.75],
        [cx - s * 0.8, cy + s * 0.6],
        [cx + s * 0.8, cy + s * 0.6],
      ];
      ctx.beginPath();
      ctx.moveTo(...pts[0]);
      ctx.lineTo(...pts[1]);
      ctx.moveTo(...pts[0]);
      ctx.lineTo(...pts[2]);
      ctx.stroke();
      pts.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case 'key': {
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.95, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.15, s * 0.2, 0, Math.PI * 2);
      ctx.moveTo(cx - s * 0.1, cy - s * 0.05);
      ctx.lineTo(cx - s * 0.18, cy + s * 0.42);
      ctx.lineTo(cx + s * 0.18, cy + s * 0.42);
      ctx.lineTo(cx + s * 0.1, cy - s * 0.05);
      ctx.fill();
      break;
    }
    case 'path': {
      ctx.beginPath();
      ctx.moveTo(cx - s, cy + s * 0.6);
      ctx.bezierCurveTo(cx - s * 0.2, cy + s * 0.9, cx + s * 0.2, cy - s * 0.9, cx + s, cy - s * 0.6);
      ctx.setLineDash([s * 0.12, s * 0.12]);
      ctx.stroke();
      ctx.setLineDash([]);
      [
        [cx - s, cy + s * 0.6],
        [cx, cy],
        [cx + s, cy - s * 0.6],
      ].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, s * 0.15, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case 'circles': {
      [
        [-0.42, -0.25],
        [0.42, -0.25],
        [0, 0.45],
      ].forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.arc(cx + dx * s, cy + dy * s, s * 0.62, 0, Math.PI * 2);
        ctx.stroke();
      });
      break;
    }
    case 'arrow': {
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.95);
      ctx.lineTo(cx, cy + s * 0.25);
      ctx.moveTo(cx - s * 0.42, cy - s * 0.17);
      ctx.lineTo(cx, cy + s * 0.25);
      ctx.lineTo(cx + s * 0.42, cy - s * 0.17);
      ctx.moveTo(cx - s * 0.85, cy + s * 0.35);
      ctx.lineTo(cx - s * 0.85, cy + s * 0.85);
      ctx.lineTo(cx + s * 0.85, cy + s * 0.85);
      ctx.lineTo(cx + s * 0.85, cy + s * 0.35);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

/* Desenha uma capa num <canvas> do DOM no tamanho em que ele aparece. */
export function paintCoverCanvas(canvas, vol, cssW, cssH) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(cssW * dpr));
  canvas.height = Math.max(1, Math.round(cssH * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawCover(ctx, cssW, cssH, vol);
}

/* ------------------------------------------------------- texturas da sala */
export function spineCanvases(vol, pxPerUnit) {
  const d = vol.h * 0.7;
  const color = mk(vol.t * pxPerUnit, vol.h * pxPerUnit);
  const rm = mk(color.width, color.height);
  drawSpine(color.getContext('2d'), color.width, color.height, vol);
  drawSpine(rm.getContext('2d'), rm.width, rm.height, vol, true);
  return { color, rm, d };
}

export function coverCanvases(vol, pxPerUnit) {
  const d = vol.h * 0.7;
  const color = mk(d * pxPerUnit, vol.h * pxPerUnit);
  const rm = mk(color.width, color.height);
  drawCover(color.getContext('2d'), color.width, color.height, vol);
  drawCover(rm.getContext('2d'), rm.width, rm.height, vol, true);
  return { color, rm };
}

export function clothCanvas() {
  const c = mk(128, 128);
  const x = c.getContext('2d');
  x.fillStyle = '#dcdcdc';
  x.fillRect(0, 0, 128, 128);
  x.globalAlpha = 0.5;
  x.drawImage(noiseCanvas(), 0, 0, 128, 128);
  return c;
}

export function paperEdgeCanvas() {
  const c = mk(128, 128);
  const x = c.getContext('2d');
  x.fillStyle = '#efe4da';
  x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 1) {
    x.fillStyle = `rgba(90,60,55,${0.04 + Math.random() * 0.12})`;
    x.fillRect(i, 0, 1, 128);
  }
  return c;
}

/* parede canelada: mapa de normais de um sulco côncavo */
export function flutedNormalCanvas() {
  const W = 64;
  const c = mk(W, 4);
  const x = c.getContext('2d');
  const id = x.createImageData(W, 4);
  for (let i = 0; i < W; i++) {
    const u = i / W;
    let nx = 0;
    if (u < 0.84) nx = Math.cos(Math.PI * (u / 0.84)) * 0.78;
    const nz = Math.sqrt(1 - nx * nx);
    for (let y = 0; y < 4; y++) {
      const k = (y * W + i) * 4;
      id.data[k] = Math.round((nx * 0.5 + 0.5) * 255);
      id.data[k + 1] = 128;
      id.data[k + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      id.data[k + 3] = 255;
    }
  }
  x.putImageData(id, 0, 0);
  return c;
}

export function plasterCanvas() {
  const c = mk(256, 256);
  const x = c.getContext('2d');
  x.fillStyle = '#d8d0d4';
  x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const r = Math.random() * 18 + 2;
    x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '40,20,35'},${Math.random() * 0.035})`;
    x.beginPath();
    x.arc(Math.random() * 256, Math.random() * 256, r, 0, Math.PI * 2);
    x.fill();
  }
  return c;
}

export function woodCanvas() {
  const W = 1024;
  const H = 128;
  const c = mk(W, H);
  const x = c.getContext('2d');
  x.fillStyle = '#3a2216';
  x.fillRect(0, 0, W, H);
  for (let i = 0; i < 140; i++) {
    const y0 = Math.random() * H;
    const amp = 1 + Math.random() * 4;
    const freq = 0.002 + Math.random() * 0.01;
    const dark = Math.random() < 0.65;
    x.strokeStyle = dark ? `rgba(20,10,6,${0.12 + Math.random() * 0.25})` : `rgba(140,90,60,${0.06 + Math.random() * 0.12})`;
    x.lineWidth = 0.5 + Math.random() * 1.6;
    x.beginPath();
    for (let X = 0; X <= W; X += 8) {
      const Y = y0 + Math.sin(X * freq + i) * amp + Math.sin(X * freq * 3.1) * amp * 0.3;
      if (X === 0) x.moveTo(X, Y);
      else x.lineTo(X, Y);
    }
    x.stroke();
  }
  return c;
}

export function glowCanvas(inner = 'rgba(255,255,255,1)') {
  const c = mk(128, 128);
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(0.25, 'rgba(255,255,255,.45)');
  g.addColorStop(0.6, 'rgba(255,255,255,.08)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return c;
}

/* O "A" em neon: núcleo claro e halo magenta. */
export function neonCanvas() {
  const img = assets.mono;
  const H = 620;
  const W = Math.round((H * img.width) / img.height);
  const pad = 110;
  const c = mk(W + pad * 2, H + pad * 2);
  const x = c.getContext('2d');
  const tube = tinted(img, '#ff2bf0', W, H, false);
  const core = tinted(img, '#ffd6fb', W, H, false);
  x.shadowColor = '#ff2bf0';
  x.shadowBlur = 90;
  x.globalAlpha = 0.7;
  x.drawImage(tube, pad, pad);
  x.shadowBlur = 34;
  x.globalAlpha = 1;
  x.drawImage(tube, pad, pad);
  x.shadowBlur = 0;
  x.globalAlpha = 0.95;
  x.drawImage(core, pad + W * 0.008, pad + H * 0.006, W * 0.984, H * 0.988);
  return { canvas: c, aspect: c.width / c.height };
}
