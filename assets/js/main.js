/* =====================================================================
   ANTHROXIA — main.js
   ===================================================================== */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SVGNS = "http://www.w3.org/2000/svg";

  /* ------------------------------------------------------------------
     1. Loader
  ------------------------------------------------------------------ */
  const loaderWord = $(".loader__word");
  if (loaderWord) {
    loaderWord.innerHTML = loaderWord.textContent
      .split("")
      .map((c, i) => `<span style="animation-delay:${0.35 + i * 0.06}s">${c}</span>`)
      .join("");
  }
  let loaded = false;
  const finishLoading = () => {
    if (loaded) return;
    loaded = true;
    document.body.classList.add("is-loaded");
    document.body.classList.remove("is-loading");
    window.ScrollTrigger && window.ScrollTrigger.refresh();
  };
  window.addEventListener("load", () => setTimeout(finishLoading, reduced ? 0 : 1500));
  setTimeout(finishLoading, 4000); // nunca prende o usuário

  /* ------------------------------------------------------------------
     2. Colunata em nanquim (SVG gerado)
  ------------------------------------------------------------------ */
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  function drawColumn(g, x, w, top, bottom, opts = {}) {
    const sw = opts.sw || 1.3;
    const col = el("g", { class: "col" }, g);
    const capH = w * 0.32;
    const baseH = w * 0.32;
    const shaftTop = top + capH;
    const shaftBot = bottom - baseH;
    const inset = w * 0.1;

    // capitel (abaco + volutas)
    el("rect", { x: x - w * 0.08, y: top, width: w * 1.16, height: capH * 0.32, fill: "url(#hatch-h)", stroke: "currentColor", "stroke-width": sw }, col);
    el("path", { d: `M${x} ${top + capH * 0.32} h${w} v${capH * 0.3} h-${w}z`, fill: "none", stroke: "currentColor", "stroke-width": sw }, col);
    const vr = capH * 0.24;
    [x + vr * 0.6, x + w - vr * 0.6].forEach((cx) => {
      el("circle", { cx, cy: top + capH * 0.78, r: vr, fill: "none", stroke: "currentColor", "stroke-width": sw }, col);
      el("circle", { cx, cy: top + capH * 0.78, r: vr * 0.45, fill: "currentColor" }, col);
    });

    // fuste com caneluras + sombreamento à direita
    const flutes = 11;
    let d = "";
    for (let i = 0; i <= flutes; i++) {
      const fx = x + inset + ((w - inset * 2) * i) / flutes;
      d += `M${fx.toFixed(1)} ${shaftTop} V${shaftBot} `;
    }
    el("path", { d, fill: "none", stroke: "currentColor", "stroke-width": sw * 0.8 }, col);
    // sombra: traços densos e curtos à direita (hachura)
    let sh = "";
    const right = x + w - inset;
    for (let i = 0; i < 9; i++) {
      const fx = right - i * ((w - inset * 2) / flutes) * 0.42;
      const dash = 6 + i * 3;
      for (let y = shaftTop + (i % 2) * 8; y < shaftBot; y += dash + 4 + i * 2) {
        sh += `M${fx.toFixed(1)} ${y.toFixed(1)} v${dash} `;
      }
    }
    el("path", { d: sh, fill: "none", stroke: "currentColor", "stroke-width": sw * 1.4, opacity: 0.85 }, col);

    // base
    el("path", { d: `M${x + inset * 0.3} ${shaftBot} h${w - inset * 0.6} v${baseH * 0.35} h-${w - inset * 0.6}z`, fill: "none", stroke: "currentColor", "stroke-width": sw }, col);
    el("rect", { x: x - w * 0.1, y: shaftBot + baseH * 0.35, width: w * 1.2, height: baseH * 0.65, fill: "url(#hatch-d)", stroke: "currentColor", "stroke-width": sw }, col);
    return col;
  }

  function drawEntablature(g, x1, x2, y, h) {
    el("rect", { x: x1, y, width: x2 - x1, height: h * 0.45, fill: "none", stroke: "currentColor", "stroke-width": 1.4 }, g);
    el("rect", { x: x1, y: y + h * 0.45, width: x2 - x1, height: h * 0.2, fill: "url(#hatch-h)", stroke: "currentColor", "stroke-width": 1.2 }, g);
    let dd = "";
    for (let dx = x1 + 6; dx < x2 - 10; dx += 22) dd += `M${dx} ${y + h * 0.65} h12 v${h * 0.2} h-12z `;
    el("path", { d: dd, fill: "currentColor" }, g);
    el("rect", { x: x1, y: y + h * 0.85, width: x2 - x1, height: h * 0.15, fill: "none", stroke: "currentColor", "stroke-width": 1.2 }, g);
  }

  function buildColonnade(svg) {
    if (!svg) return;
    const back = el("g", { class: "cols-back", opacity: 0.28 }, svg);
    for (let i = 0; i < 12; i++) drawColumn(back, 30 + i * 135, 62, 300, 820, { sw: 0.9 });
    drawEntablature(back, 0, 1600, 248, 52);

    // piso com perspectiva
    const floor = el("g", { class: "floor" }, svg);
    let fd = "";
    for (let i = 0, y = 905; y < 1010; i++, y += 4 + i * 1.6) fd += `M0 ${y.toFixed(1)} H1600 `;
    el("path", { d: fd, stroke: "currentColor", "stroke-width": 1, fill: "none" }, floor);
    el("path", { d: "M0 902 H1600", stroke: "currentColor", "stroke-width": 2 }, floor);

    const left = el("g", { class: "cols-left" }, svg);
    const right = el("g", { class: "cols-right" }, svg);
    const xs = [-30, 150, 330];
    xs.forEach((x) => drawColumn(left, x, 118, 150, 902));
    xs.forEach((x) => drawColumn(right, 1600 - x - 118, 118, 150, 902));
    drawEntablature(left, -60, 500, 70, 80);
    drawEntablature(right, 1100, 1660, 70, 80);
  }
  buildColonnade($(".hero__columns"));

  /* ------------------------------------------------------------------
     3. Manifesto — palavras
  ------------------------------------------------------------------ */
  const words = $("[data-words]");
  if (words) {
    const wrap = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else {
              const s = document.createElement("span");
              s.className = "w";
              s.textContent = part;
              frag.appendChild(s);
            }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    };
    wrap(words);
  }

  /* ------------------------------------------------------------------
     4. Animações de scroll (GSAP + fallback)
  ------------------------------------------------------------------ */
  function initGSAP() {
    const gsap = window.gsap;
    const ST = window.ScrollTrigger;
    if (!gsap || !ST || reduced) {
      $$(".manifesto__text .w").forEach((w) => (w.style.opacity = 1));
      return;
    }
    gsap.registerPlugin(ST);

    // Portal: o círculo magenta engole a tela
    const disc = $(".portal__disc");
    const portal = $(".portal");
    const coverScale = () => {
      const r = portal.getBoundingClientRect();
      const diag = Math.hypot(window.innerWidth, window.innerHeight);
      return (diag / r.width) * 1.15;
    };
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "+=140%",
        scrub: 0.8,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
    tl.to(".hero__copy, .hero__scroll, .hero__tag", { opacity: 0, y: -40, duration: 0.25, ease: "none" }, 0)
      .to(".cols-left", { xPercent: -60, duration: 1, ease: "power2.in" }, 0)
      .to(".cols-right", { xPercent: 60, duration: 1, ease: "power2.in" }, 0)
      .to(".cols-back", { scale: 1.3, transformOrigin: "50% 60%", opacity: 0, duration: 1, ease: "none" }, 0)
      .to(".hero__rays", { rotate: 25, scale: 1.6, opacity: 0, duration: 1, ease: "none" }, 0)
      .to(".portal__mono", { scale: 2.4, opacity: 0, duration: 0.7, ease: "power2.in" }, 0.15)
      .to(disc, { scale: coverScale, boxShadow: "0 0 0 0 #f3ece4", duration: 1, ease: "power2.in" }, 0.05);

    // Manifesto: palavras acendem
    gsap.to(".manifesto__text .w", {
      opacity: 1,
      stagger: 0.05,
      ease: "none",
      scrollTrigger: { trigger: ".manifesto__text", start: "top 80%", end: "bottom 45%", scrub: true },
    });

    // KAZER: palavra de fundo desliza
    gsap.fromTo(".kazer__bg-word", { xPercent: 12 }, { xPercent: -12, ease: "none", scrollTrigger: { trigger: ".kazer", scrub: true } });
    gsap.from(".phone", { y: 120, rotate: 6, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".kazer", start: "top 70%" } });

    // Livro: brilho magenta cresce
    gsap.from(".library__glow", { scale: 0.3, opacity: 0, ease: "none", scrollTrigger: { trigger: ".library", start: "top 85%", end: "center center", scrub: true } });
    gsap.from([".book__body", ".library__pedestal"], { y: 140, opacity: 0, duration: 1.4, stagger: 0.1, ease: "expo.out", clearProps: "transform,opacity", scrollTrigger: { trigger: ".library__stage", start: "top 75%" } });

    // Rodapé: wordmark sobe
    gsap.from(".footer__word", { yPercent: 40, opacity: 0, ease: "none", scrollTrigger: { trigger: ".footer", start: "top bottom", end: "top 40%", scrub: true } });
  }
  // GSAP carrega com defer antes deste arquivo
  initGSAP();

  /* Reveal genérico */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }),
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );
  $$("[data-reveal]").forEach((n, i) => { n.style.transitionDelay = `${(i % 3) * 0.12}s`; io.observe(n); });

  /* ------------------------------------------------------------------
     5. Header
  ------------------------------------------------------------------ */
  const header = $(".header");
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle("is-solid", y > window.innerHeight * 0.6);
    const goingDown = y > lastY && y > window.innerHeight;
    header.classList.toggle("is-hidden", goingDown && !document.body.classList.contains("menu-open"));
    lastY = y;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const burger = $(".header__burger");
  const menu = $("#mobile-menu");
  const setMenu = (open) => {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    document.body.classList.toggle("menu-open", open);
    if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add("is-open")); }
    else { menu.classList.remove("is-open"); setTimeout(() => { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 800); }
  };
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  $$("#mobile-menu a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /* ------------------------------------------------------------------
     6. Cursor
  ------------------------------------------------------------------ */
  const cursor = $(".cursor");
  if (cursor && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const label = $(".cursor__label", cursor);
    let cx = 0, cy = 0, tx = 0, ty = 0;
    window.addEventListener("mousemove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    const loop = () => {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener("mouseover", (e) => {
      const t = e.target.closest("[data-cursor]");
      if (t && !t.classList.contains("is-disabled")) { cursor.classList.add("is-hover"); label.textContent = t.dataset.cursor; }
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest("[data-cursor]")) cursor.classList.remove("is-hover");
    });
  }

  /* ------------------------------------------------------------------
     7. Mock do app (digitação)
  ------------------------------------------------------------------ */
  const typing = $(".typing");
  if (typing) {
    const full = typing.dataset.typing;
    const run = () => {
      if (reduced) { typing.textContent = full; return; }
      let i = 0;
      const step = () => { typing.textContent = full.slice(0, ++i); if (i < full.length) setTimeout(step, 22 + Math.random() * 30); };
      step();
    };
    const tio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { run(); tio.disconnect(); } }), { threshold: 0.5 });
    tio.observe(typing);
  }

  /* ------------------------------------------------------------------
     8. O LIVRO → Codex (site dentro do livro)
  ------------------------------------------------------------------ */
  const book = $(".book");
  const codex = $("#codex");
  const tpl = $("#chapters");
  const chapters = tpl ? $$("article", tpl.content) : [];
  const pageL = $(".codex__page--l");
  const pageR = $(".codex__page--r");
  const toc = $(".codex__toc");
  const folio = $("[data-folio]");
  const total = $("[data-total]");
  const prevBtn = $('.codex__nav[data-dir="-1"]');
  const nextBtn = $('.codex__nav[data-dir="1"]');
  let current = 0;
  let turning = false;
  let lastFocus = null;

  if (total) total.textContent = chapters.length ? chapters[chapters.length - 1].dataset.numeral : "";
  chapters.forEach((ch, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = `${ch.dataset.numeral}. ${ch.dataset.title}`;
    b.addEventListener("click", () => goTo(i));
    toc.appendChild(b);
  });

  function render(i) {
    const ch = chapters[i];
    pageL.innerHTML = "";
    pageR.innerHTML = "";
    pageL.appendChild($('[data-side="l"]', ch).cloneNode(true));
    pageR.appendChild($('[data-side="r"]', ch).cloneNode(true));
    pageL.scrollTop = pageR.scrollTop = 0;
    $(".codex__spread").scrollTop = 0;
    folio.textContent = ch.dataset.numeral;
    $$("button", toc).forEach((b, k) => b.setAttribute("aria-current", String(k === i)));
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === chapters.length - 1;
    $$("[data-close-codex]", codex).forEach((a) => a.addEventListener("click", () => closeCodex(true)));
  }

  function goTo(i) {
    if (turning || i === current || i < 0 || i >= chapters.length) return;
    const dir = i > current ? "next" : "prev";
    if (reduced) { current = i; render(i); return; }
    turning = true;
    const outEl = dir === "next" ? pageR : pageL;
    const inEl = dir === "next" ? pageL : pageR;
    outEl.classList.add(`turn-out-${dir}`);
    setTimeout(() => {
      current = i;
      render(i);
      outEl.classList.remove(`turn-out-${dir}`);
      inEl.classList.add(`turn-in-${dir}`);
      setTimeout(() => { inEl.classList.remove(`turn-in-${dir}`); turning = false; }, 520);
    }, 440);
  }

  function openCodex() {
    if (!chapters.length) return;
    lastFocus = document.activeElement;
    book.classList.add("is-open");
    const delay = reduced ? 0 : 900;
    setTimeout(() => {
      current = 0;
      render(0);
      codex.hidden = false;
      document.documentElement.style.overflow = "hidden";
      requestAnimationFrame(() => requestAnimationFrame(() => codex.classList.add("is-open")));
      setTimeout(() => $(".codex__close").focus(), 300);
    }, delay);
  }

  function closeCodex(followLink) {
    codex.classList.remove("is-open");
    setTimeout(() => {
      codex.hidden = true;
      document.documentElement.style.overflow = "";
      book.classList.remove("is-open");
      if (!followLink && lastFocus) lastFocus.focus();
    }, reduced ? 0 : 700);
  }

  if (book && codex) {
    book.addEventListener("click", openCodex);
    $(".codex__close").addEventListener("click", () => closeCodex(false));
    $(".codex__veil").addEventListener("click", () => closeCodex(false));
    prevBtn.addEventListener("click", () => goTo(current - 1));
    nextBtn.addEventListener("click", () => goTo(current + 1));

    document.addEventListener("keydown", (e) => {
      if (codex.hidden) return;
      if (e.key === "Escape") closeCodex(false);
      if (e.key === "ArrowRight") goTo(current + 1);
      if (e.key === "ArrowLeft") goTo(current - 1);
      if (e.key === "Tab") { // foco preso dentro do livro
        const f = $$("button:not([disabled]), a[href]", codex).filter((n) => n.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // swipe no celular
    let sx = null, sy = null;
    codex.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    codex.addEventListener("touchend", (e) => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(current + (dx < 0 ? 1 : -1));
      sx = sy = null;
    });

    // inclinação suave com o mouse
    const stage = $(".library__stage");
    if (!reduced && window.matchMedia("(hover: hover)").matches) {
      stage.addEventListener("mousemove", (e) => {
        if (book.classList.contains("is-open")) return;
        const r = stage.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        book.style.transform = `translateY(-52px) rotateX(${8 - py * 10}deg) rotateY(${-18 + px * 22}deg)`;
      });
      stage.addEventListener("mouseleave", () => { book.style.transform = ""; });
      book.addEventListener("click", () => { book.style.transform = ""; });
    }
  }

  /* ------------------------------------------------------------------
     9. Download — lê assets/js/config.js
  ------------------------------------------------------------------ */
  const cfg = (window.ANTHROXIA_CONFIG && window.ANTHROXIA_CONFIG.kazer) || {};
  const android = cfg.android || {};
  const isHttps = (u) => typeof u === "string" && /^https:\/\/[^\s]+$/i.test(u.trim());
  const isSha = (h) => typeof h === "string" && /^[a-f0-9]{64}$/i.test(h.trim());
  const fmtSize = (b) => {
    if (!Number.isFinite(b) || b <= 0) return null;
    const u = ["B", "KB", "MB", "GB"]; let i = 0;
    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
    return `${b.toFixed(i > 1 ? 1 : 0)} ${u[i]}`;
  };
  const fmtDate = (d) => {
    if (!d) return null;
    const t = new Date(d + (d.length === 10 ? "T12:00:00" : ""));
    return isNaN(t) ? null : t.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const setField = (name, val) => { const n = $(`[data-dl-field="${name}"]`); if (n && val) n.textContent = val; };
  setField("version", android.version ? `v${String(android.version).replace(/^v/i, "")}` : null);
  setField("size", fmtSize(android.sizeBytes));
  setField("minAndroid", android.minAndroid);
  setField("publishedAt", fmtDate(android.publishedAt));

  const enable = (sel, url, label, labelSel) => {
    const a = $(sel);
    if (!a || !isHttps(url)) return false;
    a.href = url.trim();
    a.classList.remove("is-disabled");
    a.removeAttribute("aria-disabled");
    a.removeAttribute("role");
    a.removeAttribute("tabindex");
    a.rel = "noopener";
    if (sel !== "[data-dl-apk]") a.target = "_blank";
    $(labelSel).textContent = label;
    a.dataset.cursor = "Ir";
    return true;
  };
  const live = cfg.status === "available" || cfg.status === "beta";
  const apkOk = live && enable("[data-dl-apk]", android.apkUrl, cfg.status === "beta" ? "Baixar APK (beta)" : "Baixar APK", "[data-dl-apk-label]");
  const playOk = live && enable("[data-dl-play]", android.playStoreUrl, "Google Play", "[data-dl-play-label]");
  const webOk = enable("[data-dl-web]", cfg.web && cfg.web.url, "Abrir na web", "[data-dl-web-label]");

  const pill = $("[data-dl-status]");
  if (live && (apkOk || playOk)) { pill.textContent = cfg.status === "beta" ? "Beta disponível" : "Disponível"; pill.classList.add("is-live"); }
  else if (webOk) { pill.textContent = "Android em breve"; }

  if (apkOk && isSha(android.sha256)) {
    $("[data-dl-sha]").textContent = android.sha256.trim().toLowerCase();
    $("[data-dl-verify]").hidden = false;
  }
  const copyBtn = $("[data-copy]");
  if (copyBtn) copyBtn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("[data-dl-sha]").textContent); copyBtn.textContent = "Copiado"; }
    catch { copyBtn.textContent = "Selecione e copie"; }
    setTimeout(() => (copyBtn.textContent = "Copiar"), 2000);
  });

  if (isHttps(cfg.privacyPolicyUrl)) {
    const p = $("[data-dl-privacy]");
    $("a", p).href = cfg.privacyPolicyUrl.trim();
    p.hidden = false;
  }

  /* Rodapé */
  const yr = $("[data-year]");
  if (yr) yr.textContent = new Date().getFullYear();
  const contact = (window.ANTHROXIA_CONFIG && window.ANTHROXIA_CONFIG.contact) || {};
  const cBox = $("[data-contact]");
  if (cBox) {
    if (contact.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      const a = document.createElement("a"); a.href = `mailto:${contact.email}`; a.textContent = "Contato"; cBox.appendChild(a);
    }
    if (isHttps(contact.instagram)) {
      const a = document.createElement("a"); a.href = contact.instagram; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Instagram"; cBox.appendChild(a);
    }
  }
})();
