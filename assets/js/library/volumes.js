/* Os nove volumes da estante.
   - slug: usado no endereço (ex.: anthroxia.com/#kazer) e no <template id="vol-SLUG"> do index.html
   - cloth: cor do tecido da capa · foil: gravação (copper, silver, magenta = metálicas; ink, wine = tinta)
   - h / t: altura e espessura do livro na estante (unidades da cena)
   - sample: a prévia ao vivo (assets/js/library/samples.js)
   - emblem: o desenho gravado na capa */
export const VOLUMES = [
  {
    slug: 'estudio', numeral: 'I', title: 'O estúdio', spine: 'O Estúdio',
    sub: 'Quem somos e como trabalhamos', blurb: 'Quem é a ANTHROXIA e como trabalhamos.',
    cloth: '#2b0d27', foil: 'copper', h: 0.9, t: 0.13, sample: 'trace', emblem: 'mono',
  },
  {
    slug: 'manifesto', numeral: 'II', title: 'Manifesto', spine: 'Manifesto',
    sub: 'O que nos move', blurb: 'O que nos move, em poucas linhas.',
    cloth: '#c2009d', foil: 'ink', h: 0.82, t: 0.11, sample: 'words', emblem: 'nib',
  },
  {
    slug: 'kazer', numeral: 'III', title: 'KAZER', spine: 'KAZER',
    sub: 'Um assistente de IA, na web e no Android', blurb: 'O nosso primeiro produto: um assistente de IA.',
    cloth: '#121012', foil: 'silver', band: '#ff2bf0', h: 0.97, t: 0.17, sample: 'chat', emblem: 'chat',
  },
  {
    slug: 'local', numeral: 'IV', title: 'IA no celular', spine: 'IA no Celular',
    sub: 'O KAZ 1.1 rodando no seu aparelho', blurb: 'Como o modelo roda direto no seu aparelho.',
    cloth: '#2e292c', foil: 'silver', h: 0.86, t: 0.12, sample: 'device', emblem: 'chip',
  },
  {
    slug: 'planta', numeral: 'V', title: 'Como tudo se conecta', spine: 'Como Tudo se Conecta',
    sub: 'Um produto, dois aplicativos', blurb: 'A planta baixa do KAZER.',
    cloth: '#e7dace', foil: 'ink', h: 0.8, t: 0.13, sample: 'blueprint', emblem: 'nodes',
  },
  {
    slug: 'privacidade', numeral: 'VI', title: 'Privacidade', spine: 'Privacidade',
    sub: 'Você escolhe onde a conversa acontece', blurb: 'Você escolhe onde a conversa acontece.',
    cloth: '#5a1236', foil: 'copper', h: 0.92, t: 0.12, sample: 'vault', emblem: 'key',
  },
  {
    slug: 'roteiro', numeral: 'VII', title: 'Roteiro', spine: 'Roteiro',
    sub: 'As etapas da obra, em ordem', blurb: 'As etapas da obra, em ordem.',
    cloth: '#a35f3a', foil: 'ink', h: 0.84, t: 0.15, sample: 'path', emblem: 'path',
  },
  {
    slug: 'identidade', numeral: 'VIII', title: 'Identidade', spine: 'Identidade',
    sub: 'Cores, letras e o A', blurb: 'Cores, letras e o A.',
    cloth: '#f0c7da', foil: 'wine', h: 0.88, t: 0.11, sample: 'palette', emblem: 'circles',
  },
  {
    slug: 'download', numeral: 'IX', title: 'Baixar o KAZER', spine: 'Baixar o KAZER',
    sub: 'KAZER para Android', blurb: 'O app para Android, assim que for lançado.',
    cloth: '#0e0a0d', foil: 'magenta', band: '#ff2bf0', h: 0.94, t: 0.16, sample: 'download', emblem: 'arrow',
  },
];

/* Proporção da capa (largura ÷ altura). As páginas do livro aberto usam a mesma. */
export const COVER_RATIO = 0.7;

export const indexOfSlug = (slug) => VOLUMES.findIndex((v) => v.slug === slug);
