/* Tudo o que fica por cima da sala: prévia, livro aberto, lista, relógio. */
import { VOLUMES, indexOfSlug } from './volumes.js';
import { paintCoverCanvas } from './covers.js';
import { SampleView, SAMPLES } from './samples.js';
import { bindDownload, bindContact } from './download.js';
import { nowHour, formatHour, skyAt } from './time.js';
import { clamp } from './tween.js';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const EASE = 'cubic-bezier(.65,0,.35,1)';
const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';
const EASE_BOOK = 'cubic-bezier(.5,0,.2,1)';
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

const HINTS = {
  shelf: 'Aponte para um livro e clique para abrir. Role sobre ele para chegar mais perto.',
  shelfTouch: 'Toque num livro para ver a prévia. Toque de novo para abrir.',
  list: 'Role para ver as capas. Clique numa capa para abrir.',
  listTouch: 'Deslize para ver as capas. Toque numa capa para abrir.',
};

export class UI {
  constructor({ scene, reduced, touch }) {
    this.scene = scene;
    this.reduced = reduced;
    this.touch = touch;
    this.view = 'shelf';
    this.open = -1;
    this.openSource = null;
    this.busy = false;
    this.peekIndex = -1;
    this.focusIndex = -1;
    this.leanAcc = 0;
    this.immersed = null;
    this.hourOverride = null;
    this.lastFocus = null;

    this.el = {
      hint: $('[data-hint]'),
      capNum: $('.caption__num'),
      capTitle: $('.caption__title'),
      capText: $('.caption__text'),
      peek: $('.peek'),
      peekCard: $('.peek__card'),
      peekNum: $('.peek__num'),
      peekTitle: $('.peek__title'),
      catalog: $('.catalog'),
      track: $('.catalog__track'),
      reader: $('.reader'),
      backdrop: $('.reader__backdrop'),
      book: $('.reader__book'),
      board: $('.reader__board'),
      pageL: $('.reader__page--l'),
      pageR: $('.reader__page--r'),
      fly: $('.flycover'),
      flyFront: $('.flycover__front'),
      close: $('.reader__close'),
      steps: $$('.reader__step'),
      count: $('.reader__count'),
      immerse: $('.immerse'),
      immTitle: $('.immerse__title'),
      immHint: $('.immerse__hint'),
      immClose: $('.immerse__close'),
      tip: $('.tip'),
      seg: $$('.seg__btn'),
      clockBtn: $('.clock__btn'),
      clockPanel: $('#clock-panel'),
      clockTime: $('[data-clock-time]'),
      clockPhase: $('[data-clock-phase]'),
      clockRange: $('[data-clock-range]'),
      clockNow: $('[data-clock-now]'),
      clock: $('.clock'),
    };

    this.peekView = new SampleView($('.peek__canvas'));
    this.immerseView = new SampleView($('.immerse__canvas'), { interactive: true });
    this.plateView = null;

    if (touch) document.body.classList.add('is-touch');
    this.buildShelfNav();
    this.buildCatalog();
    this.bindHud();
    this.bindClock();
    this.bindReader();
    this.bindImmerse();
    this.bindKeys();
    this.bindPeek();
    if (scene) this.bindScene();
    else this.disableShelf();
    this.setCaption(-1);
    this.setHint();
    window.addEventListener('resize', () => this.onResize());
  }

  /* ------------------------------------------------------------ estante */
  bindScene() {
    const s = this.scene;
    const c = s.canvas;
    s.on('hover', (i) => {
      if (this.touch || this.view !== 'shelf' || this.busy) return;
      if (i >= 0) {
        this.showPeek(i);
        this.setCaption(i);
      } else if (this.focusIndex < 0) {
        this.schedulePeekHide();
      }
    });
    s.on('lamphover', (on) => this.showTip(on ? this.lampLabel() : null));
    s.on('frame', () => this.positionPeek());
    s.on('lost', () => this.disableShelf());

    c.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || this.view !== 'shelf' || this.busy) return;
      s.setPointer(e.clientX, e.clientY);
      this.moveTip(e.clientX, e.clientY);
    });
    c.addEventListener('pointerleave', () => {
      s.clearPointer();
      this.showTip(null);
    });
    c.addEventListener('click', (e) => this.onRoomClick(e));
    c.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
  }

  lampLabel() {
    return this.scene.lampOn ? 'Apagar a luminária' : 'Acender a luminária';
  }

  disableShelf() {
    document.body.classList.add('no-shelf');
    this.setView('list', true);
  }

  onRoomClick(e) {
    if (this.busy || this.view !== 'shelf') return;
    const hit = this.scene.hitTest(e.clientX, e.clientY);
    if (hit.lamp) {
      this.scene.toggleLamp();
      this.showTip(this.lampLabel());
      return;
    }
    const touchy = this.touch || e.pointerType === 'touch';
    if (hit.book >= 0) {
      if (touchy && this.focusIndex !== hit.book) this.focusBook(hit.book);
      else this.openVolume(hit.book, 'shelf');
      return;
    }
    if (this.focusIndex >= 0) this.focusBook(-1);
  }

  onWheel(e) {
    if (this.view !== 'shelf' || this.busy || this.immersed) return;
    const i = this.peekIndex;
    if (i < 0) return;
    e.preventDefault();
    const delta = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
    this.leanAcc = clamp(this.leanAcc + delta * 0.0024, 0, 1.05);
    this.scene.setLean(i, this.leanAcc);
    this.el.peek.style.setProperty('--lean', Math.min(1, this.leanAcc).toFixed(3));
    clearTimeout(this.leanTimer);
    if (this.leanAcc >= 1) {
      const rect = $('.peek__canvas').getBoundingClientRect();
      this.leanAcc = 0;
      this.immerse(i, rect, 'shelf');
      return;
    }
    this.leanTimer = setTimeout(() => this.resetLean(), 750);
  }

  resetLean() {
    this.leanAcc = 0;
    if (this.scene) this.scene.setLean(this.peekIndex, 0);
    this.el.peek.style.setProperty('--lean', '0');
  }

  focusBook(i) {
    this.focusIndex = i;
    if (this.scene) this.scene.setFocus(i);
    if (i >= 0) {
      this.showPeek(i);
      this.setCaption(i);
    } else {
      this.hidePeek();
    }
  }

  /* ------------------------------------------------------------- prévia */
  bindPeek() {
    $('[data-peek-open]').addEventListener('click', () => {
      if (this.peekIndex >= 0) this.openVolume(this.peekIndex, 'shelf');
    });
    $('[data-peek-immerse]').addEventListener('click', () => {
      if (this.peekIndex >= 0) this.immerse(this.peekIndex, $('.peek__canvas').getBoundingClientRect(), 'shelf');
    });
  }

  showPeek(i) {
    clearTimeout(this.peekHideT);
    if (i < 0 || this.view !== 'shelf' || !this.scene) return;
    if (this.peekIndex !== i) {
      if (this.peekIndex >= 0) this.resetLean();
      this.peekIndex = i;
      const v = VOLUMES[i];
      this.el.peekNum.textContent = v.numeral;
      this.el.peekTitle.textContent = v.title;
      this.peekView.use(v.sample);
    }
    this.el.peek.classList.toggle('has-actions', this.touch || this.focusIndex === i);
    this.el.peek.classList.add('is-on');
    this.positionPeek();
    this.peekView.start();
  }

  schedulePeekHide() {
    clearTimeout(this.peekHideT);
    this.peekHideT = setTimeout(() => {
      if (this.focusIndex < 0) this.hidePeek();
    }, 160);
  }

  hidePeek() {
    clearTimeout(this.peekHideT);
    this.resetLean();
    this.el.peek.classList.remove('is-on', 'has-actions');
    this.peekView.stop();
    this.peekIndex = -1;
    if (this.focusIndex < 0) this.setCaption(-1);
  }

  positionPeek() {
    if (this.peekIndex < 0 || !this.scene) return;
    const a = this.scene.anchor(this.peekIndex);
    const W = window.innerWidth;
    const card = this.el.peekCard;
    const half = card.offsetWidth / 2 + 12;
    const dx = clamp(a.x, half, W - half) - a.x;
    const minTop = 72 + card.offsetHeight + 28;
    const y = Math.max(a.y, minTop);
    this.el.peek.style.transform = `translate3d(${a.x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    this.el.peek.style.setProperty('--dx', `${dx.toFixed(1)}px`);
    this.el.peek.style.setProperty('--string', `${Math.max(0, 26 + (y - a.y)).toFixed(0)}px`);
  }

  /* -------------------------------------------------------------- dica */
  showTip(text) {
    const t = this.el.tip;
    if (!text) {
      t.classList.remove('is-on');
      return;
    }
    t.textContent = text;
    t.classList.add('is-on');
  }

  moveTip(x, y) {
    this.el.tip.style.transform = `translate3d(${x + 16}px, ${y + 18}px, 0)`;
  }

  /* --------------------------------------------------------- legendas */
  setCaption(i) {
    if (i < 0) {
      this.el.capNum.textContent = '';
      this.el.capTitle.textContent = 'Biblioteca da ANTHROXIA';
      this.el.capText.textContent = 'Nove volumes sobre o estúdio, o KAZER e tudo o que estamos construindo.';
      return;
    }
    const v = VOLUMES[i];
    this.el.capNum.textContent = v.numeral;
    this.el.capTitle.textContent = v.title;
    this.el.capText.textContent = v.blurb;
  }

  setHint() {
    const list = this.view === 'list';
    this.el.hint.textContent = list ? (this.touch ? HINTS.listTouch : HINTS.list) : this.touch ? HINTS.shelfTouch : HINTS.shelf;
  }

  /* ---------------------------------------------- navegação por teclado */
  buildShelfNav() {
    const nav = $('.shelf-nav');
    this.navBtns = VOLUMES.map((v, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'shelf-nav__btn';
      b.textContent = `Abrir o volume ${v.numeral}, ${v.title}`;
      b.title = v.blurb;
      b.addEventListener('focus', () => {
        if (this.view === 'shelf' && this.scene && !this.busy) this.focusBook(i);
      });
      b.addEventListener('blur', () => {
        setTimeout(() => {
          if (!nav.contains(document.activeElement) && this.focusIndex === i && this.open < 0) this.focusBook(-1);
        }, 0);
      });
      b.addEventListener('click', () => this.openVolume(i, this.view === 'shelf' && this.scene ? 'shelf' : 'center'));
      nav.appendChild(b);
      return b;
    });
  }

  /* --------------------------------------------------------------- lista */
  buildCatalog() {
    const track = this.el.track;
    VOLUMES.forEach((v, i) => {
      const li = document.createElement('li');
      li.className = 'catalog__item';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'card';
      btn.style.setProperty('--cloth', v.cloth);
      btn.setAttribute('aria-label', `Abrir o volume ${v.numeral}: ${v.title}`);
      const cv = document.createElement('canvas');
      cv.className = 'card__cover';
      cv.setAttribute('aria-hidden', 'true');
      const num = document.createElement('span');
      num.className = 'card__num';
      num.textContent = v.numeral;
      const title = document.createElement('span');
      title.className = 'card__title';
      title.textContent = v.title;
      const text = document.createElement('span');
      text.className = 'card__text';
      text.textContent = v.blurb;
      btn.append(cv, num, title, text);
      btn.addEventListener('click', () => this.openVolume(i, 'list'));
      li.appendChild(btn);
      track.appendChild(li);
    });
    track.addEventListener(
      'wheel',
      (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          track.scrollBy({ left: e.deltaY * (e.deltaMode === 1 ? 30 : 1) });
          e.preventDefault();
        }
      },
      { passive: false },
    );
  }

  paintCatalog() {
    $$('.card__cover', this.el.track).forEach((c, i) => {
      const r = c.getBoundingClientRect();
      if (r.width) paintCoverCanvas(c, VOLUMES[i], r.width, r.height);
    });
    this.catalogPainted = window.innerWidth;
  }

  setView(view, force = false) {
    if (view === this.view && !force) return;
    if (view === 'shelf' && (!this.scene || document.body.classList.contains('no-shelf'))) return;
    this.view = view;
    this.el.seg.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    document.body.classList.toggle('is-list', view === 'list');
    if (view === 'list') {
      this.focusBook(-1);
      this.hidePeek();
      if (this.scene) this.scene.clearPointer();
      this.el.catalog.hidden = false;
      requestAnimationFrame(() => {
        if (this.catalogPainted !== window.innerWidth) this.paintCatalog();
        this.el.catalog.classList.add('is-on');
      });
    } else {
      this.el.catalog.classList.remove('is-on');
      setTimeout(() => {
        if (this.view === 'shelf') this.el.catalog.hidden = true;
      }, 450);
    }
    this.setHint();
  }

  cardRect(i) {
    const c = $$('.card__cover', this.el.track)[i];
    if (!c) return this.centerRect();
    c.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return c.getBoundingClientRect();
  }

  centerRect() {
    const h = Math.min(window.innerHeight * 0.3, 260);
    const w = h * 0.7;
    return { left: (window.innerWidth - w) / 2, top: (window.innerHeight - h) / 2, width: w, height: h };
  }

  /* ----------------------------------------------------------------- HUD */
  bindHud() {
    this.el.seg.forEach((b) => b.addEventListener('click', () => this.setView(b.dataset.view)));
    $$('[data-open-slug]').forEach((b) =>
      b.addEventListener('click', () => {
        const i = indexOfSlug(b.dataset.openSlug);
        if (this.open >= 0) this.turnTo(i);
        else this.openVolume(i, this.view === 'list' ? 'list' : this.scene ? 'shelf' : 'center');
      }),
    );
  }

  bindClock() {
    const { clockBtn, clockPanel, clockRange, clockNow } = this.el;
    clockBtn.addEventListener('click', () => (clockPanel.hidden ? this.openClock() : this.closeClock()));
    clockRange.addEventListener('input', () => this.setHour(parseFloat(clockRange.value), true));
    clockNow.addEventListener('click', () => {
      this.hourOverride = null;
      this.setHour(nowHour(), false);
    });
    document.addEventListener('pointerdown', (e) => {
      if (!clockPanel.hidden && !this.el.clock.contains(e.target)) this.closeClock();
    });
    this.setHour(nowHour(), false);
    setInterval(() => {
      if (this.hourOverride === null) this.setHour(nowHour(), false);
    }, 30000);
  }

  openClock() {
    this.el.clockPanel.hidden = false;
    this.el.clockBtn.setAttribute('aria-expanded', 'true');
  }

  closeClock() {
    this.el.clockPanel.hidden = true;
    this.el.clockBtn.setAttribute('aria-expanded', 'false');
  }

  setHour(h, manual) {
    if (manual) this.hourOverride = h;
    const sky = skyAt(h);
    if (this.scene) this.scene.setHour(h);
    this.el.clockTime.textContent = formatHour(h);
    this.el.clockPhase.textContent = manual ? `${sky.label}, hora escolhida` : `${sky.label}, agora`;
    this.el.clockRange.value = String(Math.round(h * 4) / 4);
    this.el.clock.classList.toggle('is-night', sky.moon);
    this.el.clockBtn.setAttribute('aria-label', `Luz da sala: ${formatHour(h)}, ${sky.label.toLowerCase()}. Mudar a hora`);
  }

  /* ----------------------------------------------------------- leitor */
  bindReader() {
    this.el.close.addEventListener('click', () => this.closeVolume());
    this.el.backdrop.addEventListener('click', () => this.closeVolume());
    this.el.steps.forEach((b) => b.addEventListener('click', () => this.turnTo(this.open + Number(b.dataset.step))));
    let sx = null;
    let sy = null;
    this.el.book.addEventListener('touchstart', (e) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    this.el.book.addEventListener('touchend', (e) => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.6) this.turnTo(this.open + (dx < 0 ? 1 : -1));
      sx = null;
    });
  }

  get twoPage() {
    return window.innerWidth >= 760 && window.innerWidth / window.innerHeight >= 1.2;
  }

  renderPages(i) {
    const v = VOLUMES[i];
    const tpl = document.getElementById(`vol-${v.slug}`);
    const frag = tpl.content.cloneNode(true);
    const left = frag.querySelector('[data-page="left"]');
    const right = frag.querySelector('[data-page="right"]');
    const { pageL, pageR } = this.el;
    pageL.replaceChildren();
    pageR.replaceChildren();

    const run = (text) => {
      const p = document.createElement('p');
      p.className = 'p-run';
      p.textContent = text;
      return p;
    };
    const folio = (n) => {
      const p = document.createElement('p');
      p.className = 'p-folio';
      p.textContent = String(n);
      p.setAttribute('aria-hidden', 'true');
      return p;
    };
    const numeral = document.createElement('p');
    numeral.className = 'p-numeral';
    numeral.textContent = v.numeral;
    numeral.setAttribute('aria-label', `Volume ${v.numeral}`);

    const innerL = document.createElement('div');
    innerL.className = 'page__inner';
    innerL.append(run('ANTHROXIA'), numeral, ...left.childNodes);
    const innerR = document.createElement('div');
    innerR.className = 'page__inner';
    innerR.append(run(v.title), ...right.childNodes);
    pageL.append(innerL, folio(i * 2 + 1));
    pageR.append(innerR, folio(i * 2 + 2));

    const title = pageL.querySelector('.p-title');
    if (title) title.id = 'reader-title';

    // a prévia vira uma prancha na página
    if (this.plateView) {
      this.plateView.destroy();
      this.plateView = null;
    }
    const fig = pageL.querySelector('[data-plate]');
    if (fig) {
      const frame = document.createElement('div');
      frame.className = 'plate__frame';
      const cv = document.createElement('canvas');
      cv.className = 'plate__canvas';
      const zoom = document.createElement('button');
      zoom.type = 'button';
      zoom.className = 'plate__zoom';
      zoom.textContent = 'Ampliar';
      zoom.setAttribute('aria-label', `Ampliar a prévia de ${v.title}`);
      frame.append(cv, zoom);
      const cap = document.createElement('figcaption');
      cap.className = 'plate__cap';
      cap.textContent = SAMPLES[v.sample].hint;
      fig.replaceChildren(frame, cap);
      this.plateView = new SampleView(cv, { interactive: true });
      this.plateView.use(v.sample);
      zoom.addEventListener('click', () => this.immerse(i, cv.getBoundingClientRect(), 'reader'));
    }

    bindDownload(pageR);
    bindContact(pageR);
    $$('[data-goto]', pageR).forEach((b) => b.addEventListener('click', () => this.turnTo(indexOfSlug(b.dataset.goto))));

    this.el.book.style.setProperty('--cloth', v.cloth);
    this.el.book.dataset.light = String(['planta', 'identidade'].includes(v.slug));
    const [prev, next] = this.el.steps;
    const set = (btn, j) => {
      btn.disabled = j < 0 || j >= VOLUMES.length;
      btn.querySelector('.reader__name').textContent = btn.disabled ? '' : `${VOLUMES[j].numeral}. ${VOLUMES[j].title}`;
    };
    set(prev, i - 1);
    set(next, i + 1);
    this.el.count.textContent = `${v.numeral} de ${VOLUMES[VOLUMES.length - 1].numeral}`;
    pageL.scrollTop = 0;
    pageR.scrollTop = 0;
    this.el.book.scrollTop = 0;
  }

  place(el, r) {
    el.style.left = `${r.left}px`;
    el.style.top = `${r.top}px`;
    el.style.width = `${r.width}px`;
    el.style.height = `${r.height}px`;
  }

  flip(from, to) {
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const sx = from.width / to.width;
    const sy = from.height / to.height;
    return `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
  }

  async openVolume(i, source = 'shelf') {
    if (this.busy || this.open >= 0 || i < 0) return;
    this.busy = true;
    this.closeClock();
    this.showTip(null);
    this.lastFocus = document.activeElement;
    const v = VOLUMES[i];
    const D = this.reduced ? 0 : 1;
    let from;
    if (source === 'shelf' && this.scene && this.view === 'shelf') {
      this.focusIndex = -1;
      this.scene.setFocus(-1);
      this.hidePeek();
      from = await this.scene.pullOut(i);
    } else if (source === 'list') {
      from = this.cardRect(i);
    } else {
      source = 'center';
      from = this.centerRect();
    }
    this.openSource = source;
    this.open = i;
    this.renderPages(i);

    const { reader, book, board, pageL, pageR, fly, flyFront, backdrop } = this.el;
    const two = this.twoPage;
    reader.classList.toggle('is-single', !two);
    book.classList.add('is-closed');
    book.classList.remove('is-visible');
    reader.hidden = false;
    document.body.classList.add('is-reading');
    await nextFrame();

    const target = (two ? pageR : book).getBoundingClientRect();
    this.place(fly, target);
    fly.style.setProperty('--cloth', v.cloth);
    fly.style.transformOrigin = '0 0';
    fly.hidden = false;
    paintCoverCanvas(flyFront, v, target.width, target.height);
    if (source === 'shelf') {
      this.scene.showBook(i, false);
      this.scene.stop();
    }

    backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450 * D, fill: 'both' });
    await fly.animate([{ transform: this.flip(from, target), opacity: source === 'center' ? 0 : 1 }, { transform: 'none', opacity: 1 }], {
      duration: 640 * D,
      easing: EASE,
      fill: 'both',
    }).finished;

    book.classList.add('is-visible');
    fly.getAnimations().forEach((a) => a.cancel());
    fly.style.transformOrigin = 'left center';
    const opening = fly.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }], {
      duration: 920 * D,
      easing: EASE_BOOK,
      fill: 'both',
    });
    if (two) {
      board.animate([{ clipPath: 'inset(0 0 0 50%)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 920 * D, easing: EASE_BOOK, fill: 'both' });
      pageL.animate([{ opacity: 0 }, { opacity: 0, offset: 0.55 }, { opacity: 1 }], { duration: 1000 * D, fill: 'both' });
    } else {
      fly.animate([{ opacity: 1 }, { opacity: 1, offset: 0.45 }, { opacity: 0 }], { duration: 920 * D, fill: 'both' });
    }
    await opening.finished;

    fly.hidden = true;
    fly.getAnimations().forEach((a) => a.cancel());
    book.classList.remove('is-closed');
    [board, pageL].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    if (this.plateView) this.plateView.start();
    this.el.close.focus({ preventScroll: true });
    history.replaceState(null, '', `#${v.slug}`);
    this.busy = false;
  }

  async closeVolume() {
    if (this.busy || this.open < 0) return;
    if (this.immersed) {
      await this.exitImmerse();
    }
    this.busy = true;
    const i = this.open;
    const v = VOLUMES[i];
    const D = this.reduced ? 0 : 1;
    const { reader, book, board, pageL, pageR, fly, flyFront, backdrop } = this.el;
    const two = !reader.classList.contains('is-single');
    if (this.plateView) this.plateView.stop();

    const target = (two ? pageR : book).getBoundingClientRect();
    this.place(fly, target);
    paintCoverCanvas(flyFront, v, target.width, target.height);
    fly.style.setProperty('--cloth', v.cloth);
    fly.style.transformOrigin = 'left center';
    fly.hidden = false;
    const closing = fly.animate([{ transform: 'rotateY(-180deg)' }, { transform: 'rotateY(0deg)' }], {
      duration: 700 * D,
      easing: EASE_BOOK,
      fill: 'both',
    });
    if (two) {
      board.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 0 50%)' }], { duration: 700 * D, easing: EASE_BOOK, fill: 'both' });
      pageL.animate([{ opacity: 1 }, { opacity: 0, offset: 0.4 }, { opacity: 0 }], { duration: 700 * D, fill: 'both' });
    } else {
      fly.animate([{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1 }], { duration: 700 * D, fill: 'both' });
    }
    await closing.finished;

    let dest;
    if (this.openSource === 'shelf' && this.scene) dest = this.scene.frontRect(i);
    else if (this.openSource === 'list') dest = this.cardRect(i);
    else dest = this.centerRect();

    book.classList.remove('is-visible');
    fly.getAnimations().forEach((a) => a.cancel());
    fly.style.transformOrigin = '0 0';
    backdrop.getAnimations().forEach((a) => a.cancel());
    backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 520 * D, fill: 'both' });
    await fly.animate([{ transform: 'none', opacity: 1 }, { transform: this.flip(dest, target), opacity: this.openSource === 'center' ? 0 : 1 }], {
      duration: 520 * D,
      easing: EASE,
      fill: 'both',
    }).finished;

    if (this.openSource === 'shelf' && this.scene) {
      this.scene.showBook(i, true);
      this.scene.start();
    }
    fly.hidden = true;
    fly.getAnimations().forEach((a) => a.cancel());
    [board, pageL, backdrop].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    book.classList.remove('is-closed');
    reader.hidden = true;
    document.body.classList.remove('is-reading');
    if (this.plateView) {
      this.plateView.destroy();
      this.plateView = null;
    }
    this.open = -1;
    history.replaceState(null, '', window.location.pathname + window.location.search);

    if (this.openSource === 'shelf' && this.scene) await this.scene.putBack(i);
    this.busy = false;
    const back = this.lastFocus;
    if (back && document.contains(back) && back !== document.body) back.focus({ preventScroll: true });
  }

  async turnTo(j) {
    if (this.busy || this.open < 0 || j < 0 || j >= VOLUMES.length || j === this.open) return;
    this.busy = true;
    const dir = j > this.open ? 1 : -1;
    const D = this.reduced ? 0 : 1;
    const { reader, book, pageL, pageR } = this.el;
    const two = !reader.classList.contains('is-single');
    if (this.plateView) this.plateView.stop();
    const outEl = two ? (dir > 0 ? pageR : pageL) : book;
    await outEl.animate([{ transform: 'none', opacity: 1 }, { transform: `rotateY(${dir > 0 ? -86 : 86}deg)`, opacity: 0.3 }], {
      duration: 380 * D,
      easing: 'cubic-bezier(.55,0,.8,.35)',
      fill: 'both',
    }).finished;
    if (this.scene && this.openSource === 'shelf') this.scene.swapFront(this.open, j);
    this.open = j;
    this.renderPages(j);
    outEl.getAnimations().forEach((a) => a.cancel());
    const inEl = two ? (dir > 0 ? pageL : pageR) : book;
    await inEl.animate([{ transform: `rotateY(${dir > 0 ? 86 : -86}deg)`, opacity: 0.3 }, { transform: 'none', opacity: 1 }], {
      duration: 440 * D,
      easing: EASE_OUT,
    }).finished;
    if (this.plateView) this.plateView.start();
    history.replaceState(null, '', `#${VOLUMES[j].slug}`);
    this.busy = false;
  }

  /* ------------------------------------------------------- tela cheia */
  bindImmerse() {
    this.el.immClose.addEventListener('click', () => this.exitImmerse());
  }

  insetFor(r) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    return `inset(${r.top.toFixed(1)}px ${(W - r.left - r.width).toFixed(1)}px ${(H - r.top - r.height).toFixed(1)}px ${r.left.toFixed(1)}px round 12px)`;
  }

  async immerse(i, fromRect, origin) {
    if (this.immersed) return;
    const v = VOLUMES[i];
    this.immersed = { i, fromRect, origin, focus: document.activeElement };
    const { immerse, immTitle, immHint, immClose } = this.el;
    immTitle.textContent = `${v.numeral}. ${v.title}`;
    immHint.textContent = SAMPLES[v.sample].hint;
    immerse.hidden = false;
    this.immerseView.use(v.sample);
    this.immerseView.start();
    if (origin === 'shelf') {
      this.hidePeek();
      if (this.scene) this.scene.stop();
    } else if (this.plateView) this.plateView.stop();
    const D = this.reduced ? 0 : 1;
    await immerse.animate([{ clipPath: this.insetFor(fromRect) }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }], {
      duration: 720 * D,
      easing: EASE,
    }).finished;
    immClose.focus({ preventScroll: true });
  }

  async exitImmerse() {
    if (!this.immersed) return;
    const { origin, fromRect, focus } = this.immersed;
    const { immerse } = this.el;
    const D = this.reduced ? 0 : 1;
    let rect = fromRect;
    if (origin === 'reader') {
      const c = $('.plate__canvas', this.el.pageL);
      if (c) rect = c.getBoundingClientRect();
    }
    await immerse.animate([{ clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: this.insetFor(rect) }], {
      duration: 520 * D,
      easing: EASE,
      fill: 'both',
    }).finished;
    immerse.hidden = true;
    immerse.getAnimations().forEach((a) => a.cancel());
    this.immerseView.stop();
    this.immersed = null;
    if (origin === 'shelf' && this.scene) {
      this.scene.setLean(-1, 0);
      this.scene.start();
    } else if (this.plateView) this.plateView.start();
    if (focus && document.contains(focus) && focus !== document.body) focus.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------ teclado */
  bindKeys() {
    document.addEventListener('keydown', (e) => {
      if (this.immersed) {
        if (e.key === 'Escape') this.exitImmerse();
        if (e.key === 'Tab') this.trap(e, this.el.immerse);
        return;
      }
      if (this.open >= 0) {
        if (e.key === 'Escape') this.closeVolume();
        else if (e.key === 'ArrowRight' && !e.target.matches('input')) this.turnTo(this.open + 1);
        else if (e.key === 'ArrowLeft' && !e.target.matches('input')) this.turnTo(this.open - 1);
        else if (e.key === 'Tab') this.trap(e, this.el.reader);
        return;
      }
      if (e.key === 'Escape') {
        this.closeClock();
        if (this.focusIndex >= 0) this.focusBook(-1);
        return;
      }
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const step = e.key === 'ArrowRight' ? 1 : -1;
      const navIdx = this.navBtns.indexOf(document.activeElement);
      if (navIdx >= 0) {
        e.preventDefault();
        this.navBtns[clamp(navIdx + step, 0, this.navBtns.length - 1)].focus();
        return;
      }
      const cards = $$('.card', this.el.track);
      const cardIdx = cards.indexOf(document.activeElement);
      if (cardIdx >= 0) {
        e.preventDefault();
        cards[clamp(cardIdx + step, 0, cards.length - 1)].focus();
      }
    });
  }

  trap(e, root) {
    const items = $$('button:not([disabled]), a[href], input, summary, [tabindex="0"]', root).filter((n) => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ------------------------------------------------------------- outros */
  onResize() {
    clearTimeout(this.resizeT);
    this.resizeT = setTimeout(() => {
      if (this.scene) this.scene.resize();
      if (this.view === 'list') this.paintCatalog();
      if (this.open >= 0 && !this.busy) this.el.reader.classList.toggle('is-single', !this.twoPage);
    }, 120);
  }

  openFromHash() {
    const i = indexOfSlug(decodeURIComponent(window.location.hash.slice(1)));
    if (i >= 0) this.openVolume(i, this.view === 'list' ? 'list' : this.scene ? 'shelf' : 'center');
  }
}
