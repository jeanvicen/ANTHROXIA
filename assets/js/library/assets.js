/* Imagens e fontes compartilhadas por capas, cena e prévias. */
export const assets = { mono: null, word: null, monoPts: null };

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    img.src = src;
  });

export async function loadAssets() {
  const [mono, word] = await Promise.all([
    loadImage('assets/img/monogram.png'),
    loadImage('assets/img/wordmark.png'),
  ]);
  assets.mono = mono;
  assets.word = word;
  assets.monoPts = samplePoints(mono, 1600);
}

/* Pontos do traço do "A" (usados pela prévia do volume I). */
function samplePoints(img, max) {
  const W = 150;
  const H = Math.round((W * img.height) / img.width);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data;
  const pts = [];
  for (let y = 0; y < H; y++) {
    for (let i = 0; i < W; i++) {
      if (d[(y * W + i) * 4 + 3] > 140) pts.push([i / W, y / H]);
    }
  }
  for (let i = pts.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  return { pts: pts.slice(0, max), aspect: W / H };
}

export async function loadFonts() {
  if (!document.fonts || !document.fonts.load) return;
  const faces = [
    '500 40px "Bodoni Moda"',
    '600 40px "Bodoni Moda"',
    'italic 400 40px "Bodoni Moda"',
    'italic 500 40px "Bodoni Moda"',
    '300 20px "Jost"',
    '400 20px "Jost"',
    '500 20px "Jost"',
  ];
  const timeout = new Promise((r) => setTimeout(r, 3500));
  try {
    await Promise.race([Promise.all(faces.map((f) => document.fonts.load(f))), timeout]);
  } catch {
    /* segue com as fontes de reserva */
  }
}
