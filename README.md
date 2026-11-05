# ANTHROXIA — Site Oficial

Site oficial da **ANTHROXIA**, casa do **KAZER** (*a product by ANTHROXIA*).

Estático, sem build: HTML + CSS + JS puro, com [GSAP](https://gsap.com) hospedado localmente em `assets/vendor/`.

## O que tem no site

| Seção | O que faz |
|---|---|
| **Portal** | Colunata em nanquim gerada em SVG; ao rolar, o círculo magenta com o "A" engole a tela. |
| **Manifesto** | Texto que acende palavra por palavra conforme a rolagem. |
| **Pilares** | Arquitetura · Inteligência · Estética. |
| **KAZER** | Apresentação do produto com prévia conceitual do app. |
| **Planta baixa** | Diagrama: backend único → KAZER Web + KAZER Android → IA local / nuvem. |
| **O Livro** | Livro 3D: toque → a capa abre → um "site dentro do livro" com 6 capítulos (setas, teclado e swipe). |
| **Download** | Card do KAZER para Android, controlado por `assets/js/config.js`. |

## Liberar o download do KAZER (pelo celular)

Tudo fica em **um arquivo**: [`assets/js/config.js`](assets/js/config.js).

1. No GitHub, abra `assets/js/config.js` → ícone de lápis.
2. Preencha `version`, `sizeBytes`, `minAndroid`, `sha256`, `apkUrl` (e `playStoreUrl` quando existir).
3. Mude `status` de `"coming-soon"` para `"beta"` ou `"available"`.
4. Commit.

Enquanto os campos estiverem vazios o site mostra **"Em breve"** e os botões ficam desativados.
O site só aceita links `https://` e só mostra o SHA-256 se ele tiver 64 caracteres hexadecimais.

> ⚠️ Se você publicar um APK aqui **e** também na Google Play com o mesmo ID de pacote, eles precisam ter a mesma assinatura — senão um não atualiza o outro. Veja a seção 14 do plano do KAZER.

## Editar os capítulos do Livro

Os capítulos estão no `index.html`, dentro de `<template id="chapters">`.
Cada `<article>` é um capítulo: `data-side="l"` é a página da esquerda, `data-side="r"` a da direita.

## Publicar o site

**GitHub Pages (grátis):** Settings → Pages → Source: **GitHub Actions**. O workflow `.github/workflows/pages.yml` publica a cada push na `main`.

**Vercel / Netlify:** importe o repositório; não há comando de build — a pasta raiz já é o site.

## Rodar localmente

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Estrutura

```
index.html
assets/
  css/style.css
  js/config.js      ← downloads (edite aqui)
  js/main.js
  img/              ← logo, monograma, wordmark, favicon, og
  vendor/           ← GSAP 3.12.5 (licença padrão gratuita da GreenSock)
```
