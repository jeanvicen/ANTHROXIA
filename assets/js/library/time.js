/* A luz da sala segue a hora local de quem visita.
   Cada chave define o céu da janela e a força das luzes naquele horário;
   entre duas chaves os valores se misturam suavemente. */
const KEYS = [
  { h: 0, top: '#04061a', bot: '#1b1442', sun: '#9fb2ff', sunI: 0.16, stars: 1, day: 0, lamp: 1, label: 'Madrugada' },
  { h: 4.8, top: '#0a0b2b', bot: '#3a2058', sun: '#b893ff', sunI: 0.2, stars: 0.75, day: 0.05, lamp: 1, label: 'Madrugada' },
  { h: 6, top: '#3a4f98', bot: '#ff9f8c', sun: '#ffb79c', sunI: 0.6, stars: 0.08, day: 0.45, lamp: 0.92, label: 'Amanhecer' },
  { h: 8, top: '#5b93d4', bot: '#ffe2c6', sun: '#fff0dc', sunI: 0.9, stars: 0, day: 0.85, lamp: 0.78, label: 'Manhã' },
  { h: 12, top: '#3d84d6', bot: '#cfe6ff', sun: '#fffaf2', sunI: 1, stars: 0, day: 1, lamp: 0.72, label: 'Meio-dia' },
  { h: 15.5, top: '#4a7dc8', bot: '#ffdfb6', sun: '#ffe1bd', sunI: 0.95, stars: 0, day: 0.95, lamp: 0.74, label: 'Tarde' },
  { h: 17.6, top: '#5a4aa6', bot: '#ff8b4f', sun: '#ffa56c', sunI: 0.85, stars: 0, day: 0.7, lamp: 0.84, label: 'Fim de tarde' },
  { h: 18.6, top: '#3b1c6c', bot: '#ff3fa6', sun: '#ff62b6', sunI: 0.65, stars: 0.12, day: 0.45, lamp: 0.92, label: 'Pôr do sol' },
  { h: 19.6, top: '#150f3e', bot: '#76298a', sun: '#a46cff', sunI: 0.3, stars: 0.6, day: 0.15, lamp: 1, label: 'Anoitecer' },
  { h: 21, top: '#060924', bot: '#21164e', sun: '#9fb2ff', sunI: 0.18, stars: 1, day: 0, lamp: 1, label: 'Noite' },
  { h: 24, top: '#04061a', bot: '#1b1442', sun: '#9fb2ff', sunI: 0.16, stars: 1, day: 0, lamp: 1, label: 'Madrugada' },
];

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const mixRgb = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const smooth = (t) => t * t * (3 - 2 * t);

export function skyAt(hourIn) {
  const hour = ((hourIn % 24) + 24) % 24;
  let k = 0;
  while (k < KEYS.length - 2 && KEYS[k + 1].h <= hour) k++;
  const a = KEYS[k];
  const b = KEYS[k + 1];
  const t = smooth((hour - a.h) / (b.h - a.h));
  const n = (key) => a[key] + (b[key] - a[key]) * t;

  // O sol atravessa a janela de dia; a lua, de noite.
  const isDay = hour >= 5.8 && hour <= 19.2;
  let p;
  if (isDay) p = (hour - 5.8) / 13.4;
  else p = (((hour - 19.2) + 24) % 24) / 10.6;
  const elev = Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
  const sunPos = [0.18 + 0.64 * p, 0.2 + 0.62 * elev];

  return {
    hour,
    top: mixRgb(hexToRgb(a.top), hexToRgb(b.top), t),
    bottom: mixRgb(hexToRgb(a.bot), hexToRgb(b.bot), t),
    sun: mixRgb(hexToRgb(a.sun), hexToRgb(b.sun), t),
    sunI: n('sunI'),
    stars: n('stars'),
    day: n('day'),
    lamp: n('lamp'),
    moon: !isDay,
    sunPos,
    label: t < 0.5 ? a.label : b.label,
  };
}

export const nowHour = () => {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
};

export const formatHour = (h) => {
  const hh = Math.floor(((h % 24) + 24) % 24);
  const mm = Math.floor((h - Math.floor(h)) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};
