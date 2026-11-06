# ANTHROXIA — Biblioteca

Site oficial da **ANTHROXIA**, casa do **KAZER** (*a product by ANTHROXIA*).

O site é uma sala em 3D: uma estante debaixo de uma luminária, o "A" da marca em neon magenta na parede e uma janela cujo céu acompanha a hora de quem visita. Cada livro da estante é um volume sobre o estúdio e o KAZER.

Estático, sem etapa de build: HTML, CSS e módulos JavaScript, com [three.js](https://threejs.org) (MIT) hospedado em `assets/vendor/three/`.

## Como funciona

| Interação | O que acontece |
|---|---|
| **Apontar para um livro** | O livro sai um pouco da estante e uma prévia ao vivo sobe acima dele. |
| **Clicar no livro** | Ele sai da estante, vira a capa para você e abre como um livro: página da esquerda com a prévia, página da direita com o texto. |
| **Rolar sobre o livro** | A câmera se aproxima e a prévia cresce até ocupar a tela, onde dá para interagir com ela. |
| **Lista** | O botão "Lista" mostra as capas lado a lado. Funciona também em aparelhos sem 3D. |
| **Relógio** | A luz da sala segue o horário local. No relógio do topo, dá para ver a sala em outra hora. |
| **Luminária** | Clique na luminária para apagar ou acender. |
| **No celular** | Toque num livro para ver a prévia, toque de novo (ou em "Abrir") para abrir. Deslize para trocar de volume. |
| **Teclado** | Tab chega aos volumes, setas trocam de livro, Enter abre, Esc fecha. |
| **Link direto** | `/#kazer`, `/#download` etc. abrem o volume direto. |

Os nove volumes: O estúdio · Manifesto · KAZER · IA no celular · Como tudo se conecta · Privacidade · Roteiro · Identidade · Baixar o KAZER.

## Editar os textos dos volumes

Os textos ficam no `index.html`, um `<template id="vol-...">` por livro:

- `data-page="left"`: título, subtítulo e a prancha com a prévia;
- `data-page="right"`: o texto da página da direita.

Título da capa, lombada, cor do tecido e gravação de cada livro ficam em [`assets/js/library/volumes.js`](assets/js/library/volumes.js).

## Liberar o download do KAZER

Tudo fica em **um arquivo**: [`assets/js/config.js`](assets/js/config.js).

1. No GitHub, abra `assets/js/config.js` e toque no lápis.
2. Preencha `version`, `sizeBytes`, `minAndroid`, `sha256`, `apkUrl` (e `playStoreUrl` quando existir).
3. Mude `status` de `"coming-soon"` para `"beta"` ou `"available"`.
4. Salve com um commit.

Enquanto os campos estiverem vazios, o volume IX mostra **"Em breve"** e os botões ficam desligados. O site só aceita links `https://` e só mostra o SHA-256 se ele tiver 64 caracteres hexadecimais. O mesmo arquivo guarda e-mail e Instagram de contato (aparecem no volume I quando preenchidos).

> ⚠️ Se o APK for publicado aqui **e** na Google Play com o mesmo ID de pacote, as duas versões precisam ter a mesma assinatura; senão uma não atualiza a outra.

## Publicar

**GitHub Pages (grátis):** Settings → Pages → Source: **GitHub Actions**. O workflow `.github/workflows/pages.yml` publica a cada push na `main`.

**Vercel / Netlify:** importe o repositório; não há comando de build, a pasta raiz já é o site.

## Rodar localmente

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

(Os módulos JavaScript não abrem direto do arquivo; use um servidor local como esse.)

## Estrutura

```
index.html                 a sala, a interface e o texto dos 9 volumes
assets/
  css/library.css          visual da interface e do livro aberto
  js/config.js             download do KAZER e contato (edite aqui)
  js/library/
    main.js                carregamento e inicialização
    scene.js               a sala em three.js (estante, livros, luz, neon, janela)
    ui.js                  prévia, livro aberto, lista, tela cheia, relógio, teclado
    samples.js             as 9 prévias ao vivo (Canvas 2D)
    covers.js              capas, lombadas e texturas desenhadas em código
    volumes.js             dados dos volumes
    time.js                céu e luz conforme a hora
    download.js            liga o volume IX ao config.js
  img/                     logo, monograma, wordmark, favicon, imagem de compartilhamento
  vendor/three/            three.js r186 (MIT)
  vendor/gsap/             GSAP 3.12.5 (usado só pela v1)
v1/                        a primeira versão do site (rolagem com portal), arquivada
```

## Compatibilidade

- Sem WebGL (aparelhos antigos ou bloqueados), o site abre direto na **Lista**, com os mesmos livros e textos.
- Com "reduzir movimento" ativado no sistema, as animações de câmera e de luz são cortadas.
- Fontes: Bodoni Moda e Jost (Google Fonts, licença OFL).

## Referência

O conceito de "uma sala com uma estante, cada caderno guardando uma prévia ao vivo" foi inspirado na *Interaction Library*, de Jungik Lee. A implementação, o visual, os textos e o código daqui são originais da ANTHROXIA.
