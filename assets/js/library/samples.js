/* As prévias ao vivo de cada volume (Canvas 2D).
   Cada prévia funciona pequena (acima do livro, dentro da página)
   e em tela cheia, onde responde ao cursor e ao toque. */
import { assets } from './assets.js';
import { SERIF, SANS } from './covers.js';

const C = {
  ink: '#160b14',
  paper: '#f6ecee',
  magenta: '#ff2bf0',
  copper: '#c98457',
  copperHi: '#efc19a',
  wine: '#5a1236',
};
const serif = (s, w = 500, italic = false) => `${italic ? 'italic ' : ''}${w} ${s}px ${SERIF}`;
const sans = (s, w = 400) => `${w} ${s}px ${SANS}`;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeOut = (x) => 1 - (1 - x) ** 3;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
  else ctx.rect(x, y, w, h);
}

function wrap(ctx, text, maxW) {
  const out = [];
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxW) {
      out.push(line);
      line = word;
    } else line = test;
  }
  if (line) out.push(line);
  return out;
}

function glowBg(ctx, w, h, base, color, x = 0.5, y = 0.5, r = 0.7) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w * x, h * y, 0, w * x, h * y, Math.max(w, h) * r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function phoneFrame(ctx, x, y, w, h) {
  rr(ctx, x, y, w, h, w * 0.14);
  ctx.fillStyle = '#0a0709';
  ctx.fill();
  ctx.lineWidth = Math.max(1, w * 0.012);
  ctx.strokeStyle = 'rgba(201,132,87,.55)';
  ctx.stroke();
  rr(ctx, x + w * 0.05, y + w * 0.05, w * 0.9, h - w * 0.1, w * 0.1);
  ctx.fillStyle = '#170d15';
  ctx.fill();
  rr(ctx, x + w * 0.38, y + w * 0.08, w * 0.24, w * 0.05, w * 0.025);
  ctx.fillStyle = '#000';
  ctx.fill();
}

/* ------------------------------------------------------------------ I */
const trace = {
  hint: 'Passe o cursor sobre o traço para desmanchá-lo.',
  init() {
    const src = assets.monoPts;
    return {
      aspect: src ? src.aspect : 0.75,
      parts: (src ? src.pts : []).map(([hx, hy]) => ({
        hx,
        hy,
        x: null,
        y: null,
        vx: 0,
        vy: 0,
        s: 0.6 + Math.random() * 0.9,
      })),
      last: 0,
    };
  },
  draw(ctx, t, w, h, s, p) {
    const k = clamp((t - s.last) * 60, 0.2, 3);
    s.last = t;
    glowBg(ctx, w, h, C.ink, 'rgba(255,43,240,.17)', 0.5, 0.52, 0.6);
    let H = h * 0.84;
    let W = H * s.aspect;
    if (W > w * 0.9) {
      W = w * 0.9;
      H = W / s.aspect;
    }
    const ox = (w - W) / 2;
    const oy = (h - H) / 2;
    const R = Math.max(36, Math.min(w, h) * 0.15);
    const R2 = R * R;
    const dot = Math.max(1, Math.min(w, h) / 230);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(232,166,118,.8)';
    for (const q of s.parts) {
      if (q.x === null) {
        q.x = Math.random() * w;
        q.y = Math.random() * h;
      }
      const tx = ox + q.hx * W + Math.sin(t * 1.4 + q.hy * 30) * 0.6;
      const ty = oy + q.hy * H + Math.cos(t * 1.1 + q.hx * 30) * 0.6;
      q.vx = q.vx * 0.86 ** k + (tx - q.x) * 0.045 * k;
      q.vy = q.vy * 0.86 ** k + (ty - q.y) * 0.045 * k;
      if (p.active) {
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d2 / R2) * 5 * k;
          q.vx += (dx / d) * f;
          q.vy += (dy / d) * f;
        }
      }
      q.x += q.vx * k;
      q.y += q.vy * k;
      ctx.fillRect(q.x, q.y, dot * q.s, dot * q.s);
    }
    ctx.globalCompositeOperation = 'source-over';
  },
};

/* ----------------------------------------------------------------- II */
const MANIFESTO =
  'Não fazemos só aplicativos. Erguemos estruturas onde a inteligência pode morar. Tecnologia pode ter assinatura. Um assistente pode ser bonito, rápido e honesto. Preferimos construir por inteiro. Cada linha de código é um traço; cada produto, uma casa com fundações.';

const words = {
  hint: 'Aproxime o cursor das palavras para lê-las de perto.',
  init() {
    return { key: '' };
  },
  layout(ctx, s, w, h) {
    const fs = clamp(Math.min(w * 0.08, h * 0.13), 14, 68);
    ctx.font = serif(fs, 500);
    const maxW = w * 0.84;
    const space = ctx.measureText(' ').width;
    const lines = [];
    let line = [];
    let lw = 0;
    for (const text of MANIFESTO.split(' ')) {
      const ww = ctx.measureText(text).width;
      if (line.length && lw + space + ww > maxW) {
        lines.push(line);
        line = [];
        lw = 0;
      }
      lw += (line.length ? space : 0) + ww;
      line.push({ text, w: ww });
    }
    if (line.length) lines.push(line);
    lines.forEach((L) => {
      let x = w * 0.08;
      L.forEach((W) => {
        W.x = x;
        x += W.w + space;
      });
    });
    Object.assign(s, { key: `${w}x${h}`, lines, fs, lh: fs * 1.14, total: lines.length * fs * 1.14 + h * 0.45 });
  },
  draw(ctx, t, w, h, s, p) {
    if (s.key !== `${w}x${h}`) words.layout(ctx, s, w, h);
    ctx.fillStyle = '#ee1ddc';
    ctx.fillRect(0, 0, w, h);
    ctx.font = serif(s.fs, 500);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    const off = (t * s.fs * 0.55) % s.total;
    for (let rep = 0; rep < 2; rep++) {
      s.lines.forEach((L, i) => {
        const y = h * 0.82 + i * s.lh - off + rep * s.total;
        if (y < -s.lh || y > h + s.lh) return;
        const center = 1 - Math.min(1, Math.abs(y - h * 0.55) / (h * 0.6));
        L.forEach((W) => {
          let a = 0.14 + 0.86 * center ** 1.6;
          let col = '22,11,20';
          if (p.active) {
            const d = Math.hypot(W.x + W.w / 2 - p.x, y - s.fs * 0.35 - p.y);
            const r = Math.max(90, s.fs * 2.2);
            if (d < r) {
              const kk = 1 - d / r;
              a = Math.max(a, kk);
              if (kk > 0.35) col = '246,236,238';
            }
          }
          ctx.fillStyle = `rgba(${col},${a})`;
          ctx.fillText(W.text, W.x, y);
        });
      });
    }
  },
};

/* ---------------------------------------------------------------- III */
const CONVOS = [
  { q: 'Me ajuda a organizar a semana?', a: 'Claro. Vamos listar o que tem prazo, o que pode esperar e onde cabem as pausas. Por onde começamos?' },
  { q: 'O que é um modelo local?', a: 'É um modelo de IA que roda no próprio celular. A conversa pode ficar no aparelho, sem passar pela nuvem.' },
  { q: 'Ideias de nome para um estúdio?', a: 'Algumas direções: nomes curtos e sonoros, palavras de arquitetura ou um termo inventado que soe forte.' },
];

const chat = {
  hint: 'Conversa de exemplo. As respostas aqui são ilustrativas.',
  init() {
    return {};
  },
  draw(ctx, t, w, h) {
    ctx.fillStyle = '#0d0a0c';
    ctx.fillRect(0, 0, w, h);
    const u = Math.min(w, h * 1.15) / 100;
    const pad = Math.max(10, Math.min(w, h) * 0.07);
    const barY = pad + u * 2.5;

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = C.paper;
    ctx.font = sans(Math.max(10, u * 4.2), 400);
    let x = pad;
    for (const ch of 'KAZER') {
      ctx.fillText(ch, x, barY);
      x += ctx.measureText(ch).width + u * 1.3;
    }
    ctx.font = sans(Math.max(8, u * 3), 400);
    const chip = 'KAZ 1.1';
    const cw = ctx.measureText(chip).width + u * 5 + 8;
    const chh = Math.max(14, u * 6);
    rr(ctx, w - pad - cw, barY - chh / 2, cw, chh, chh / 2);
    ctx.strokeStyle = 'rgba(201,132,87,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = C.copperHi;
    ctx.textAlign = 'center';
    ctx.fillText(chip, w - pad - cw / 2, barY);

    const comH = Math.max(24, u * 10);
    const comY = h - pad - comH;
    const top = barY + chh;
    const L = 12;
    const conv = CONVOS[Math.floor(t / L) % CONVOS.length];
    const lt = t % L;
    const fade = lt > L - 0.8 ? (L - lt) / 0.8 : Math.min(1, lt / 0.3);

    const fs = Math.max(10, u * 4.4);
    const lh = fs * 1.38;
    ctx.font = sans(fs, 400);
    const maxW = (w - pad * 2) * 0.8;
    const qLines = wrap(ctx, conv.q, maxW - u * 6);
    const bw = Math.min(maxW, Math.max(...qLines.map((l) => ctx.measureText(l).width)) + u * 6 + 4);
    const bh = qLines.length * lh + u * 3.5;
    const ax = pad + u * 6;
    const shown = lt > 2.2 ? conv.a.slice(0, Math.floor((lt - 2.2) * 32)) : '';
    const aLines = shown ? wrap(ctx, shown, w - ax - pad) : [''];
    const contentH = bh + u * 5 + Math.max(1, aLines.length) * lh;
    const start = top + u * 4;
    const overflow = Math.max(0, start + contentH - (comY - u * 3));

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top, w, comY - top - u * 1.5);
    ctx.clip();
    let y = start - overflow;
    if (lt > 0.3) {
      const slide = Math.min(1, (lt - 0.3) / 0.35);
      const bx = w - pad - bw + (1 - easeOut(slide)) * u * 8;
      ctx.globalAlpha = fade * slide;
      rr(ctx, bx, y, bw, bh, u * 3.5);
      ctx.fillStyle = '#2b1d25';
      ctx.fill();
      ctx.fillStyle = C.paper;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      qLines.forEach((l, i) => ctx.fillText(l, bx + u * 3, y + u * 1.75 + lh * (i + 0.5)));
    }
    y += bh + u * 5;
    ctx.globalAlpha = fade;
    if (lt > 1.1) {
      ctx.fillStyle = C.copper;
      ctx.beginPath();
      ctx.arc(pad + u * 1.8, y + lh / 2, Math.max(2.5, u * 1.5), 0, Math.PI * 2);
      ctx.fill();
      if (lt < 2.2) {
        for (let i = 0; i < 3; i++) {
          const a = 0.3 + 0.7 * Math.max(0, Math.sin(t * 6 - i * 0.8));
          ctx.fillStyle = `rgba(246,236,238,${a * fade})`;
          ctx.beginPath();
          ctx.arc(ax + u * 1.5 + i * u * 3.2, y + lh / 2, Math.max(1.5, u), 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = 'rgba(246,236,238,.92)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        aLines.forEach((l, i) => ctx.fillText(l, ax, y + lh * (i + 0.5)));
        if (shown.length < conv.a.length) {
          const last = aLines[aLines.length - 1] || '';
          ctx.fillStyle = C.copper;
          ctx.fillRect(ax + ctx.measureText(last).width + 2, y + lh * (aLines.length - 1) + (lh - fs) / 2, Math.max(1.5, u * 0.6), fs);
        }
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    rr(ctx, pad, comY, w - pad * 2, comH, comH / 2);
    ctx.fillStyle = '#161013';
    ctx.fill();
    ctx.strokeStyle = 'rgba(246,236,238,.12)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(246,236,238,.38)';
    ctx.font = sans(Math.max(9, u * 3.8), 400);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Pergunte qualquer coisa', pad + comH * 0.5, comY + comH / 2);
    ctx.fillStyle = C.copper;
    ctx.beginPath();
    ctx.arc(w - pad - comH / 2, comY + comH / 2, comH * 0.32, 0, Math.PI * 2);
    ctx.fill();
  },
};

/* ----------------------------------------------------------------- IV */
const STAGES = [
  ['Verificando o aparelho', 1.8],
  ['Baixando o KAZ 1.1', 4.4],
  ['Verificando o arquivo', 1.9],
  ['Instalando', 1.5],
  ['Pronto para usar', 2.8],
];
const STAGES_TOTAL = STAGES.reduce((a, s) => a + s[1], 0);

const device = {
  hint: 'Clique para mandar um pulso pelo chip.',
  init() {
    return { ripples: [] };
  },
  draw(ctx, t, w, h, s, p) {
    glowBg(ctx, w, h, '#120a10', 'rgba(201,132,87,.18)', 0.5, 0.62, 0.55);
    const ph = h * 0.86;
    const pw = Math.min(ph * 0.52, w * 0.62);
    const px = (w - pw) / 2;
    const py = (h - ph) / 2;
    phoneFrame(ctx, px, py, pw, ph);

    let lt = t % STAGES_TOTAL;
    let k = 0;
    while (lt > STAGES[k][1]) {
      lt -= STAGES[k][1];
      k++;
    }
    const q = lt / STAGES[k][1];

    const cs = pw * 0.56;
    const cx = w / 2;
    const cy = py + ph * 0.38;
    ctx.lineWidth = Math.max(1, cs * 0.018);
    // trilhas com pulsos
    const traces = [];
    for (let i = -2; i <= 2; i++) {
      const o = i * cs * 0.18;
      traces.push([cx + o, cy - cs / 2, cx + o, py + pw * 0.16]);
      traces.push([cx + o, cy + cs / 2, cx + o, cy + cs * 0.78]);
      traces.push([cx - cs / 2, cy + o, px + pw * 0.1, cy + o]);
      traces.push([cx + cs / 2, cy + o, px + pw * 0.9, cy + o]);
    }
    ctx.strokeStyle = 'rgba(201,132,87,.28)';
    traces.forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    const busy = k === 1 || k === 2 || k === 3;
    traces.forEach(([x1, y1, x2, y2], i) => {
      const f = (t * (busy ? 0.9 : 0.35) + i * 0.137) % 1;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,43,240,.9)' : 'rgba(239,193,154,.85)';
      ctx.beginPath();
      ctx.arc(x2 + (x1 - x2) * f, y2 + (y1 - y2) * f, Math.max(1.2, cs * 0.018), 0, Math.PI * 2);
      ctx.fill();
    });
    // chip
    rr(ctx, cx - cs / 2, cy - cs / 2, cs, cs, cs * 0.1);
    ctx.fillStyle = '#1f121b';
    ctx.fill();
    ctx.strokeStyle = C.copper;
    ctx.stroke();
    const cores = ['CPU', 'GPU', 'NPU'];
    const coreW = cs * 0.24;
    cores.forEach((name, i) => {
      const x = cx - cs * 0.39 + i * cs * 0.29;
      const y = cy - coreW / 2;
      const on = busy && Math.floor(t * 2.2) % 3 === i;
      rr(ctx, x, y, coreW, coreW, coreW * 0.12);
      ctx.fillStyle = on ? 'rgba(255,43,240,.85)' : 'rgba(201,132,87,.14)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(239,193,154,.7)';
      ctx.stroke();
      ctx.fillStyle = on ? C.ink : C.copperHi;
      ctx.font = sans(Math.max(7, coreW * 0.26), 500);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, x + coreW / 2, cy + 0.5);
    });

    // etapa atual
    const sy = cy + cs * 0.95;
    const fs = Math.max(9, pw * 0.062);
    ctx.font = sans(fs, 400);
    ctx.fillStyle = C.paper;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(STAGES[k][0], cx, sy);
    const bw = pw * 0.7;
    const bx = cx - bw / 2;
    const by = sy + fs * 1.2;
    const bh = Math.max(3, fs * 0.28);
    rr(ctx, bx, by, bw, bh, bh / 2);
    ctx.fillStyle = 'rgba(246,236,238,.12)';
    ctx.fill();
    let fill = 0;
    if (k === 0) fill = q * 0.15;
    if (k === 1) fill = q;
    if (k >= 2) fill = 1;
    rr(ctx, bx, by, bw * fill, bh, bh / 2);
    ctx.fillStyle = k === 4 ? '#7fd9a0' : C.copper;
    ctx.fill();
    if (k === 2) {
      const sx = bx + bw * ((t * 0.8) % 1);
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.fillRect(sx, by - 1, Math.max(2, bw * 0.06), bh + 2);
    }
    ctx.font = sans(Math.max(8, fs * 0.82), 400);
    ctx.fillStyle = 'rgba(246,236,238,.55)';
    const sub = k === 1 ? `${Math.round(q * 100)}%` : k === 4 ? 'Tudo certo' : '';
    if (sub) ctx.fillText(sub, cx, by + bh + fs * 1.1);

    if (p.clicked) s.ripples.push({ x: p.x, y: p.y, t0: t });
    s.ripples = s.ripples.filter((r) => t - r.t0 < 1.6);
    s.ripples.forEach((r) => {
      const a = (t - r.t0) / 1.6;
      ctx.strokeStyle = `rgba(255,43,240,${1 - a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 10 + a * Math.min(w, h) * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    });
  },
};

/* ------------------------------------------------------------------ V */
const blueprint = {
  hint: 'Arraste os blocos. Os pontos mostram por onde as mensagens passam.',
  init() {
    return {
      nodes: [
        { id: 'srv', label: 'Servidor KAZER', sub: 'contas, conversas e modelos na nuvem', x: 0.5, y: 0.19 },
        { id: 'web', label: 'KAZER Web', sub: 'no navegador', x: 0.25, y: 0.55 },
        { id: 'and', label: 'KAZER Android', sub: 'app nativo', x: 0.73, y: 0.55 },
        { id: 'loc', label: 'No aparelho', sub: 'modelo KAZ 1.1', x: 0.73, y: 0.86 },
      ],
      edges: [
        ['srv', 'web'],
        ['srv', 'and'],
        ['and', 'loc'],
      ],
      drag: null,
    };
  },
  draw(ctx, t, w, h, s, p) {
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, w, h);
    const step = Math.max(14, Math.min(w, h) / 14);
    ctx.strokeStyle = 'rgba(36,17,31,.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = (w % step) / 2; x < w; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = (h % step) / 2; y < h; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    const u = Math.min(w, h * 1.3) / 100;
    const fs = Math.max(10, u * 4.6);
    const fs2 = Math.max(7.5, u * 2.7);
    const by = {};
    s.nodes.forEach((n) => {
      ctx.font = serif(fs, 600);
      const lw = ctx.measureText(n.label).width;
      ctx.font = sans(fs2, 400);
      const sw = ctx.measureText(n.sub).width;
      n.w = Math.max(lw, sw) + u * 6;
      n.h = fs * 1.25 + fs2 * 1.5 + u * 2.6;
      n.X = n.x * w;
      n.Y = n.y * h;
      by[n.id] = n;
    });

    const hit = (n) => Math.abs(p.x - n.X) < n.w / 2 && Math.abs(p.y - n.Y) < n.h / 2;
    if (p.down) {
      if (!s.drag) s.drag = s.nodes.find(hit) || null;
      if (s.drag) {
        s.drag.x = clamp(p.x / w, 0.14, 0.86);
        s.drag.y = clamp(p.y / h, 0.12, 0.9);
        s.drag.X = s.drag.x * w;
        s.drag.Y = s.drag.y * h;
      }
    } else s.drag = null;
    const hover = p.active ? s.nodes.find(hit) : null;

    const prog = clamp(t / 1.4, 0, 1);
    s.edges.forEach(([a, b], i) => {
      const A = by[a];
      const B = by[b];
      const lit = hover && (hover === A || hover === B);
      ctx.strokeStyle = lit ? '#b0009c' : 'rgba(36,17,31,.75)';
      ctx.lineWidth = lit ? 2 : 1.3;
      ctx.beginPath();
      ctx.moveTo(A.X, A.Y);
      ctx.lineTo(A.X + (B.X - A.X) * prog, A.Y + (B.Y - A.Y) * prog);
      ctx.stroke();
      if (prog < 1) return;
      for (let j = 0; j < 2; j++) {
        const f = (t * 0.32 + j * 0.5 + i * 0.21) % 1;
        const back = j === 1;
        const x = back ? B.X + (A.X - B.X) * f : A.X + (B.X - A.X) * f;
        const y = back ? B.Y + (A.Y - B.Y) * f : A.Y + (B.Y - A.Y) * f;
        ctx.fillStyle = back ? 'rgba(201,132,87,.95)' : 'rgba(255,43,240,.95)';
        ctx.beginPath();
        ctx.arc(x, y, Math.max(2.2, u * 1.05), 0, Math.PI * 2);
        ctx.fill();
      }
    });

    s.nodes.forEach((n) => {
      const a = clamp((t - 0.2) / 0.6, 0, 1);
      ctx.globalAlpha = a;
      rr(ctx, n.X - n.w / 2, n.Y - n.h / 2, n.w, n.h, u * 1.4);
      ctx.fillStyle = n.id === 'srv' ? C.ink : '#fffafb';
      ctx.fill();
      ctx.strokeStyle = n === hover || n === s.drag ? '#b0009c' : C.ink;
      ctx.lineWidth = n === hover || n === s.drag ? 2 : 1.2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = n.id === 'srv' ? C.paper : C.ink;
      ctx.font = serif(fs, 600);
      ctx.fillText(n.label, n.X, n.Y - n.h / 2 + u * 1.3 + fs);
      ctx.font = sans(fs2, 400);
      ctx.fillStyle = n.id === 'srv' ? 'rgba(239,193,154,.9)' : 'rgba(36,17,31,.62)';
      ctx.fillText(n.sub, n.X, n.Y + n.h / 2 - u * 1.4);
      ctx.globalAlpha = 1;
    });
  },
};

/* ----------------------------------------------------------------- VI */
const vault = {
  hint: 'Clique para alternar entre só no aparelho e com a nuvem.',
  init(view) {
    return {
      mode: 0,
      mix: 0,
      auto: !view.interactive,
      lastSwitch: 0,
      parts: Array.from({ length: 40 }, (_, i) => ({
        a: Math.random() * Math.PI * 2,
        r: 0.25 + Math.random() * 0.55,
        sp: 0.25 + Math.random() * 0.6,
        out: i % 3 === 0,
        ph: Math.random(),
      })),
    };
  },
  draw(ctx, t, w, h, s, p) {
    glowBg(ctx, w, h, '#1b0814', 'rgba(90,18,54,.75)', 0.45, 0.55, 0.65);
    if (p.clicked) {
      s.mode = 1 - s.mode;
      s.lastSwitch = t;
    }
    if (s.auto && t - s.lastSwitch > 4.2) {
      s.mode = 1 - s.mode;
      s.lastSwitch = t;
    }
    s.mix += (s.mode - s.mix) * 0.06;
    const R = Math.min(w, h) * 0.3;
    const cx = w * (0.5 - 0.1 * s.mix);
    const cy = h * 0.5;
    const cloudX = w * 0.82;
    const cloudY = h * 0.24;
    const rot = p.active ? Math.atan2(p.y - cy, p.x - cx) : t * 0.22;

    const ring = (r, ticks, ang, alpha, len) => {
      ctx.strokeStyle = `rgba(201,132,87,${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < ticks; i++) {
        const a = ang + (i / ticks) * Math.PI * 2;
        const l = i % 5 === 0 ? len * 1.8 : len;
        ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.lineTo(cx + Math.cos(a) * (r - l), cy + Math.sin(a) * (r - l));
      }
      ctx.stroke();
    };
    ring(R, 60, rot, 0.85, R * 0.04);
    ring(R * 0.8, 40, -rot * 1.3, 0.55, R * 0.035);
    ring(R * 0.62, 24, rot * 0.7, 0.35, R * 0.03);

    // fechadura
    ctx.fillStyle = C.paper;
    ctx.beginPath();
    ctx.arc(cx, cy - R * 0.08, R * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.05, cy - R * 0.02);
    ctx.lineTo(cx - R * 0.09, cy + R * 0.2);
    ctx.lineTo(cx + R * 0.09, cy + R * 0.2);
    ctx.lineTo(cx + R * 0.05, cy - R * 0.02);
    ctx.fill();

    // nuvem
    if (s.mix > 0.02) {
      ctx.globalAlpha = s.mix;
      ctx.strokeStyle = C.copperHi;
      ctx.lineWidth = 1.4;
      const cr = Math.min(w, h) * 0.06;
      [
        [-1, 0.2, 0.8],
        [0, -0.2, 1],
        [1.05, 0.2, 0.75],
      ].forEach(([dx, dy, rr2]) => {
        ctx.beginPath();
        ctx.arc(cloudX + dx * cr, cloudY + dy * cr, cr * rr2, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }

    // partículas
    s.parts.forEach((q) => {
      const a = q.a + t * q.sp;
      const ox = cx + Math.cos(a) * R * q.r * 0.5;
      const oy = cy + Math.sin(a) * R * q.r * 0.5;
      let x = ox;
      let y = oy;
      if (q.out && s.mix > 0.01) {
        const f = (t * 0.28 + q.ph) % 1;
        const tri = f < 0.5 ? f * 2 : 2 - f * 2;
        const e = tri * tri * (3 - 2 * tri) * s.mix;
        x = ox + (cloudX - ox) * e;
        y = oy + (cloudY - oy) * e - Math.sin(e * Math.PI) * R * 0.3;
      }
      ctx.fillStyle = q.out && s.mix > 0.5 ? 'rgba(239,193,154,.95)' : 'rgba(255,43,240,.95)';
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.4, R * 0.022), 0, Math.PI * 2);
      ctx.fill();
    });

    const label = s.mode ? 'Com a nuvem, quando você autoriza' : 'Só no aparelho';
    ctx.font = sans(Math.max(10, Math.min(w, h) * 0.055), 400);
    ctx.fillStyle = C.paper;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, w / 2, h - Math.max(10, h * 0.07));
  },
};

/* ---------------------------------------------------------------- VII */
const STEPS = ['Fundação', 'Conta', 'Conversa', 'Modelo local', 'Download', 'Escolha', 'Lançamento'];

const path = {
  hint: 'Mova o cursor para percorrer as etapas.',
  init() {
    return { key: '' };
  },
  build(s, w, h) {
    const anchors = STEPS.map((_, i) => [w * (0.09 + (0.82 * i) / (STEPS.length - 1)), h * (i % 2 ? 0.6 : 0.4)]);
    const pts = [];
    const marks = [];
    const get = (i) => anchors[Math.max(0, Math.min(anchors.length - 1, i))];
    for (let i = 0; i < anchors.length - 1; i++) {
      const p0 = get(i - 1);
      const p1 = get(i);
      const p2 = get(i + 1);
      const p3 = get(i + 2);
      for (let j = 0; j < 24; j++) {
        const tt = j / 24;
        const t2 = tt * tt;
        const t3 = t2 * tt;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * tt + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    pts.push(anchors[anchors.length - 1]);
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = lens[lens.length - 1];
    anchors.forEach((a, i) => marks.push({ x: a[0], y: a[1], s: lens[Math.min(i * 24, lens.length - 1)] / total }));
    Object.assign(s, { key: `${w}x${h}`, pts, lens, total, marks });
  },
  at(s, v) {
    const target = v * s.total;
    let i = 1;
    while (i < s.lens.length - 1 && s.lens[i] < target) i++;
    const a = s.pts[i - 1];
    const b = s.pts[i];
    const seg = s.lens[i] - s.lens[i - 1] || 1;
    const f = (target - s.lens[i - 1]) / seg;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, i];
  },
  draw(ctx, t, w, h, s, p) {
    if (s.key !== `${w}x${h}`) path.build(s, w, h);
    glowBg(ctx, w, h, C.ink, 'rgba(201,132,87,.1)', 0.5, 0.5, 0.7);
    let v = Math.min(1, (t % 14) / 11);
    if (p.active) v = clamp((p.x - w * 0.09) / (w * 0.82), 0, 1);
    const [hx, hy, hi] = path.at(s, v);

    ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.006);
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(201,132,87,.35)';
    ctx.beginPath();
    s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = C.copper;
    ctx.beginPath();
    for (let i = 0; i < hi; i++) (i ? ctx.lineTo(...s.pts[i]) : ctx.moveTo(...s.pts[i]));
    ctx.lineTo(hx, hy);
    ctx.stroke();

    const r = Math.max(5, Math.min(w, h) * 0.03);
    const fs = Math.max(9, Math.min(w * 0.03, h * 0.055));
    s.marks.forEach((m, i) => {
      const done = v >= m.s - 0.001;
      ctx.beginPath();
      ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
      ctx.fillStyle = done ? C.copper : C.ink;
      ctx.fill();
      ctx.strokeStyle = C.copper;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = done ? C.ink : C.copperHi;
      ctx.font = sans(r * 1.05, 500);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), m.x, m.y + 0.5);
      ctx.font = serif(fs, 500, !done);
      ctx.fillStyle = done ? C.paper : 'rgba(246,236,238,.5)';
      ctx.textBaseline = i % 2 ? 'top' : 'alphabetic';
      ctx.fillText(STEPS[i], m.x, m.y + (i % 2 ? r * 1.9 : -r * 1.9));
    });

    const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 4);
    g.addColorStop(0, 'rgba(255,43,240,.95)');
    g.addColorStop(0.3, 'rgba(255,43,240,.35)');
    g.addColorStop(1, 'rgba(255,43,240,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(hx, hy, r * 4, 0, Math.PI * 2);
    ctx.fill();
  },
};

/* --------------------------------------------------------------- VIII */
const SWATCHES = [
  ['#ff2bf0', 'Magenta neon', '#FF2BF0', true],
  ['#c98457', 'Cobre', '#C98457', true],
  ['#160b14', 'Tinta', '#160B14', false],
  ['#f6ecee', 'Papel rosado', '#F6ECEE', true],
  ['#5a1236', 'Vinho', '#5A1236', false],
];

const palette = {
  hint: 'Mova o cursor para misturar as cores.',
  init() {
    return {};
  },
  draw(ctx, t, w, h, s, p) {
    const n = SWATCHES.length;
    const focus = p.active ? clamp(p.x / w, 0, 1) : 0.5 + Math.sin(t * 0.45) * 0.22;
    const edge = (k, y) => {
      if (k <= 0) return -2;
      if (k >= n) return w + 2;
      const base = k / n;
      const pull = (focus - base) * 0.3 * (1 - Math.min(1, Math.abs(focus - base) * 2.2));
      return w * (base + pull) + Math.sin((y / h) * Math.PI * 2.2 + t * 1.1 + k * 1.7) * w * 0.022;
    };
    for (let k = 0; k < n; k++) {
      ctx.fillStyle = SWATCHES[k][0];
      ctx.beginPath();
      for (let y = 0; y <= h; y += 6) {
        const x = edge(k, y);
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let y = h; y >= 0; y -= 6) ctx.lineTo(edge(k + 1, y), y);
      ctx.closePath();
      ctx.fill();
    }
    const fs = Math.max(8, Math.min(w * 0.024, h * 0.05));
    for (let k = 0; k < n; k++) {
      const x = (edge(k, h * 0.86) + edge(k + 1, h * 0.86)) / 2;
      ctx.fillStyle = SWATCHES[k][3] ? C.ink : C.paper;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = sans(fs, 500);
      ctx.fillText(SWATCHES[k][1], x, h * 0.86);
      ctx.font = sans(fs * 0.9, 400);
      ctx.fillText(SWATCHES[k][2], x, h * 0.86 + fs * 1.35);
    }
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff';
    ctx.font = serif(Math.min(w * 0.3, h * 0.55), 500);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Aa', w / 2, h * 0.42);
    ctx.globalCompositeOperation = 'source-over';
  },
};

/* ----------------------------------------------------------------- IX */
const download = {
  hint: 'Assim que houver uma versão oficial, ela aparece aqui.',
  init() {
    const cfg = (window.ANTHROXIA_CONFIG && window.ANTHROXIA_CONFIG.kazer) || {};
    const a = cfg.android || {};
    const live = (cfg.status === 'available' || cfg.status === 'beta') && /^https:\/\/\S+$/i.test(a.apkUrl || '');
    return { live, version: String(a.version || '').replace(/^v/i, '') };
  },
  draw(ctx, t, w, h, s) {
    glowBg(ctx, w, h, '#0e090c', 'rgba(255,43,240,.22)', 0.5, 0.92, 0.6);
    const ph = h * 0.68;
    const pw = Math.min(ph * 0.52, w * 0.5);
    const px = (w - pw) / 2;
    const py = h * 0.12;
    phoneFrame(ctx, px, py, pw, ph);
    const cx = w / 2;
    const cy = py + ph * 0.46;
    const R = pw * 0.3;

    ctx.lineWidth = Math.max(1.5, pw * 0.02);
    if (s.live) {
      const f = (t % 3.2) / 2.6;
      ctx.strokeStyle = 'rgba(246,236,238,.12)';
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = C.magenta;
      ctx.beginPath();
      ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, f));
      ctx.stroke();
    } else {
      const breathe = 0.35 + 0.35 * Math.sin(t * 1.6);
      ctx.strokeStyle = `rgba(255,43,240,${breathe})`;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.arc(cx, cy, R, t * 0.2, t * 0.2 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (assets.mono) {
      const mh = R * 1.15;
      const mw = mh * (assets.mono.width / assets.mono.height);
      ctx.globalAlpha = 0.95;
      ctx.drawImage(assets.mono, cx - mw / 2, cy - mh / 2, mw, mh);
      ctx.globalAlpha = 1;
    }
    // seta
    const drop = s.live ? (t % 1.6) / 1.6 : 0.5 + Math.sin(t * 2) * 0.08;
    const ay = py - ph * 0.04 + drop * ph * 0.12;
    const as = pw * 0.12;
    ctx.globalAlpha = s.live ? 1 - drop * 0.8 : 0.9;
    ctx.strokeStyle = C.copperHi;
    ctx.lineWidth = Math.max(1.5, pw * 0.02);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, ay - as);
    ctx.lineTo(cx, ay + as);
    ctx.moveTo(cx - as * 0.6, ay + as * 0.4);
    ctx.lineTo(cx, ay + as);
    ctx.lineTo(cx + as * 0.6, ay + as * 0.4);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const fs = Math.max(10, Math.min(w * 0.05, h * 0.065));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.paper;
    ctx.font = serif(fs * 1.15, 500);
    ctx.fillText(s.live ? `Disponível${s.version ? `, versão ${s.version}` : ''}` : 'Em breve', cx, py + ph + fs * 1.6);
    ctx.font = sans(fs * 0.72, 400);
    ctx.fillStyle = 'rgba(246,236,238,.6)';
    ctx.fillText(s.live ? 'Toque em Baixar APK nesta página' : 'A primeira versão está em preparação', cx, py + ph + fs * 2.75);
  },
};

export const SAMPLES = { trace, words, chat, device, blueprint, vault, path, palette, download };

/* Roda uma prévia num <canvas>, no tamanho em que ele aparece. */
export class SampleView {
  constructor(canvas, { interactive = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.interactive = interactive;
    this.dpr = 1;
    this.w = 0;
    this.h = 0;
    this.pointer = { x: -9999, y: -9999, active: false, down: false, clicked: false };
    this.running = false;
    this.sample = null;
    this.state = null;
    this.raf = 0;
    this.loop = this.loop.bind(this);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    if (interactive) this.bindPointer();
  }

  bindPointer() {
    const c = this.canvas;
    const p = this.pointer;
    const pos = (e) => {
      const r = c.getBoundingClientRect();
      p.x = ((e.clientX - r.left) * (c.clientWidth || r.width)) / (r.width || 1);
      p.y = ((e.clientY - r.top) * (c.clientHeight || r.height)) / (r.height || 1);
    };
    c.addEventListener('pointermove', (e) => {
      pos(e);
      p.active = true;
    });
    c.addEventListener('pointerdown', (e) => {
      pos(e);
      p.active = true;
      p.down = true;
      p.clicked = true;
      if (c.setPointerCapture) c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointerup', (e) => {
      p.down = false;
      if (e.pointerType !== 'mouse') p.active = false;
    });
    c.addEventListener('pointercancel', () => {
      p.down = false;
      p.active = false;
    });
    c.addEventListener('pointerleave', () => {
      if (!p.down) p.active = false;
    });
  }

  use(id) {
    this.sample = SAMPLES[id] || null;
    this.state = this.sample && this.sample.init ? this.sample.init(this) : {};
    this.t0 = performance.now();
    this.resize();
  }

  resize() {
    // tamanho de layout (não muda com rotações e escalas de CSS)
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    if (!cw || !ch) return;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(cw * this.dpr);
    const H = Math.round(ch * this.dpr);
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }
    this.w = cw;
    this.h = ch;
    if (!this.running && this.sample) this.frame(performance.now());
  }

  start() {
    if (this.running || !this.sample) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  frame(now) {
    if (!this.w || !this.sample) return;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const t = Math.max(0, (now - this.t0) / 1000);
    this.sample.draw(ctx, t, this.w, this.h, this.state, this.pointer, this);
    this.pointer.clicked = false;
  }

  loop(now) {
    if (!this.running) return;
    this.frame(now);
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.stop();
    this.ro.disconnect();
  }
}
