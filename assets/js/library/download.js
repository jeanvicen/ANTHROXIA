/* Liga o volume "Baixar o KAZER" e o contato ao assets/js/config.js.
   Sem dados reais, tudo fica em "Em breve" e os botões ficam desligados. */
const isHttps = (u) => typeof u === 'string' && /^https:\/\/\S+$/i.test(u.trim());
const isSha = (h) => typeof h === 'string' && /^[a-f0-9]{64}$/i.test(h.trim());

const fmtSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  const units = ['B', 'KB', 'MB', 'GB'];
  let b = bytes;
  let i = 0;
  while (b >= 1024 && i < units.length - 1) {
    b /= 1024;
    i++;
  }
  return `${b.toFixed(i > 1 ? 1 : 0).replace('.', ',')} ${units[i]}`;
};

const fmtDate = (d) => {
  if (!d) return null;
  const t = new Date(d.length === 10 ? `${d}T12:00:00` : d);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const config = () => window.ANTHROXIA_CONFIG || {};

export function bindDownload(root) {
  const box = root.querySelector('[data-dl]');
  if (!box) return;
  const $ = (s) => box.querySelector(s);
  const cfg = config().kazer || {};
  const a = cfg.android || {};
  const live = cfg.status === 'available' || cfg.status === 'beta';

  const setField = (name, val) => {
    const n = $(`[data-dl-field="${name}"]`);
    if (n && val) n.textContent = val;
  };
  setField('version', a.version ? `v${String(a.version).replace(/^v/i, '')}` : null);
  setField('size', fmtSize(a.sizeBytes));
  setField('minAndroid', a.minAndroid);
  setField('publishedAt', fmtDate(a.publishedAt));

  const enable = (sel, url, label, external) => {
    const el = $(sel);
    if (!el || !isHttps(url)) return false;
    el.href = url.trim();
    el.classList.remove('is-disabled');
    el.removeAttribute('aria-disabled');
    el.removeAttribute('role');
    el.removeAttribute('tabindex');
    el.rel = 'noopener';
    if (external) el.target = '_blank';
    el.querySelector('span').textContent = label;
    return true;
  };
  const apk = live && enable('[data-dl-apk]', a.apkUrl, cfg.status === 'beta' ? 'Baixar APK (beta)' : 'Baixar APK', false);
  const play = live && enable('[data-dl-play]', a.playStoreUrl, 'Abrir na Google Play', true);
  const web = enable('[data-dl-web]', cfg.web && cfg.web.url, 'Abrir a versão web', true);

  const pill = $('[data-dl-status]');
  if (live && (apk || play)) {
    pill.textContent = cfg.status === 'beta' ? 'Beta disponível' : 'Disponível';
    pill.classList.add('is-live');
  } else if (web) pill.textContent = 'Android em breve';

  if (apk && isSha(a.sha256)) {
    $('[data-dl-sha]').textContent = a.sha256.trim().toLowerCase();
    $('[data-dl-verify]').hidden = false;
    const btn = $('[data-copy]');
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText($('[data-dl-sha]').textContent);
        btn.textContent = 'Copiado';
      } catch {
        btn.textContent = 'Selecione e copie';
      }
      setTimeout(() => {
        btn.textContent = 'Copiar';
      }, 2000);
    });
  }

  if (isHttps(cfg.privacyPolicyUrl)) {
    const p = $('[data-dl-privacy]');
    p.querySelector('a').href = cfg.privacyPolicyUrl.trim();
    p.hidden = false;
  }
}

export function bindContact(root) {
  const box = root.querySelector('[data-contact]');
  if (!box) return;
  const c = config().contact || {};
  const links = [];
  if (c.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) {
    const a = document.createElement('a');
    a.href = `mailto:${c.email}`;
    a.textContent = c.email;
    links.push(a);
  }
  if (isHttps(c.instagram)) {
    const a = document.createElement('a');
    a.href = c.instagram.trim();
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Instagram';
    links.push(a);
  }
  if (!links.length) return;
  box.append('Fale com a gente: ');
  links.forEach((a, i) => {
    if (i) box.append(' ou ');
    box.append(a);
  });
  box.append('.');
  box.hidden = false;
}

export const kazerLive = () => {
  const cfg = config().kazer || {};
  return (cfg.status === 'available' || cfg.status === 'beta') && isHttps((cfg.android || {}).apkUrl);
};
