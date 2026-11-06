/* A sala da biblioteca em three.js. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import {
  spineCanvases, coverCanvases, clothCanvas, paperEdgeCanvas, flutedNormalCanvas,
  plasterCanvas, woodCanvas, glowCanvas, neonCanvas,
} from './covers.js';
import { skyAt } from './time.js';
import { tween, ease, damp, clamp } from './tween.js';

const SHELF_W = 2.5;
const SHELF_D = 0.66;
const SHELF_T = 0.06;
const BOOK_GAP = 0.006;
const PX_SPINE = 900;
const PX_COVER = 620;
const SPOT_POWER = 11;

const idle = () => new Promise((r) => setTimeout(r, 0));

function tex(canvas, srgb = true) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const CONE_VERT = /* glsl */ `
  uniform float uH;
  varying float vH;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vH = -position.y / uH;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const CONE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uI;
  varying float vH;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float edge = pow(abs(dot(vN, vV)), 1.7);
    float fall = smoothstep(0.0, 0.14, vH) * pow(clamp(1.0 - vH, 0.0, 1.0), 1.5);
    gl_FragColor = vec4(uColor, edge * fall * uI);
  }`;

const DUST_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  uniform float uH;
  uniform float uTan;
  uniform float uI;
  varying float vA;
  void main() {
    vec3 p = position;
    float fy = fract(aSeed * 7.13 + uTime * (0.006 + aSeed * 0.012));
    p.y = -fy * uH;
    float r = length(p.xz);
    vec2 dir = r > 0.0001 ? p.xz / r : vec2(1.0, 0.0);
    float maxR = -p.y * uTan * 0.92;
    p.xz = dir * min(r, maxR) + vec2(sin(uTime * 0.35 + aSeed * 30.0), cos(uTime * 0.28 + aSeed * 17.0)) * 0.025;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.45 + aSeed) / -mv.z;
    gl_Position = projectionMatrix * mv;
    float tw = 0.55 + 0.45 * sin(uTime * 1.6 + aSeed * 60.0);
    vA = uI * smoothstep(0.0, 0.12, fy) * (1.0 - fy) * tw;
  }`;
const DUST_FRAG = /* glsl */ `
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vA;
    gl_FragColor = vec4(vec3(1.0, 0.86, 0.68), a);
  }`;

const SKY_VERT = /* glsl */ `
  uniform vec2 uSize;
  varying vec2 vUv;
  void main() {
    vUv = vec2((position.x + uSize.x * 0.5) / uSize.x, position.y / uSize.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const SKY_FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBot;
  uniform vec3 uSun;
  uniform vec2 uSunPos;
  uniform float uSunI;
  uniform float uStars;
  uniform float uTime;
  uniform float uMoon;
  uniform float uAspect;
  varying vec2 vUv;
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    vec2 uv = vUv;
    vec3 col = mix(uBot, uTop, smoothstep(0.0, 1.0, pow(uv.y, 0.85)));
    vec2 g = floor(uv * vec2(44.0, 44.0 * uAspect));
    float h = hash(g);
    float tw = 0.55 + 0.45 * sin(uTime * 1.7 + h * 40.0);
    col += vec3(step(0.982, h) * tw * uStars * smoothstep(0.25, 0.8, uv.y));
    vec2 d = (uv - uSunPos) * vec2(1.0, uAspect);
    float r = length(d);
    float size = mix(0.085, 0.07, uMoon);
    float disc = smoothstep(size, size * 0.86, r);
    float glow = exp(-r * 6.5) * 0.6 + exp(-r * 20.0) * 0.5;
    col += uSun * glow * uSunI;
    col = mix(col, uSun * 1.25 + 0.12, disc * clamp(uSunI * 1.8, 0.0, 1.0));
    if (uMoon > 0.5) {
      float r2 = length(d - vec2(0.035, 0.025));
      col = mix(col, mix(uBot, uTop, 0.55), smoothstep(size, size * 0.85, r2) * disc * 0.9);
    }
    float n = noise(vec2(uv.x * 3.0 + uTime * 0.012, uv.y * 7.0)) * 0.65 + noise(vec2(uv.x * 8.0 - uTime * 0.02, uv.y * 15.0)) * 0.35;
    float cl = smoothstep(0.56, 0.86, n) * smoothstep(0.22, 0.55, uv.y) * (1.0 - uStars * 0.6);
    col = mix(col, mix(uBot, vec3(1.0), 0.4), cl * 0.3);
    float fx = floor(uv.x * 14.0 + 0.5);
    float fh = 0.1 + hash(vec2(fx, 3.0)) * 0.12;
    col = mix(col, mix(uBot, uTop, 0.35) * 0.62, step(uv.y, fh) * 0.85);
    float bx = floor(uv.x * 9.0);
    float bh = 0.06 + hash(vec2(bx, 7.0)) * 0.12;
    float roof = step(uv.y, bh);
    vec3 city = mix(uBot * 0.32, vec3(0.025, 0.012, 0.03), 0.55 + 0.45 * uStars);
    vec2 wg = floor(uv * vec2(54.0, 40.0 * uAspect));
    float lit = step(0.72, hash(wg + bx)) * smoothstep(0.1, 0.7, uStars);
    vec3 wcol = mix(vec3(1.0, 0.72, 0.42), vec3(1.0, 0.2, 0.9), step(0.86, hash(wg * 1.7)));
    float inWin = step(0.35, fract(uv.x * 54.0)) * step(0.4, fract(uv.y * 40.0 * uAspect));
    city += wcol * lit * inWin * 0.6;
    col = mix(col, city, roof);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;

export class LibraryScene {
  constructor(canvas, volumes, opts = {}) {
    this.canvas = canvas;
    this.volumes = volumes;
    this.reduced = !!opts.reduced;
    this.touch = !!opts.touch;
    this.listeners = {};
    this.hovered = -1;
    this.focused = -1;
    this.lampHover = false;
    this.lampOn = true;
    this.lampLevel = 0;
    this.lampBase = 1;
    this.flicker = null;
    this.neonLevel = 0;
    this.neonFlicker = 0;
    this.pointer = new THREE.Vector2(-10, -10);
    this.parallax = { x: 0, y: 0, tx: 0, ty: 0 };
    this.lean = { index: -1, amount: 0, target: 0 };
    this.intro = { y: 0, z: 0 };
    this.running = false;
    this.raycaster = new THREE.Raycaster();
    this.v = new THREE.Vector3();
    this.envTimer = 0;
  }

  on(evt, fn) {
    (this.listeners[evt] ||= []).push(fn);
  }

  emit(evt, ...args) {
    (this.listeners[evt] || []).forEach((fn) => fn(...args));
  }

  /* ------------------------------------------------------------ construção */
  async build(progress = () => {}) {
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer = r;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.touch ? 1.5 : 1.75));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.stop();
      this.emit('lost');
    });

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b0509');
    this.scene.fog = new THREE.Fog('#0b0509', 9, 19);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 40);
    this.camTarget = new THREE.Vector3();

    this.buildRoom();
    progress(0.2);
    await idle();
    this.buildShelf();
    this.buildBooks();
    progress(0.55);
    await idle();
    this.buildLamp();
    this.buildNeon();
    this.buildWindow();
    this.buildDust();
    this.buildLights();
    progress(0.8);
    await idle();
    this.resize();
    this.setHour(this.hour ?? 12);
    this.buildEnv();
    r.compile(this.scene, this.camera);
    progress(1);
  }

  buildRoom() {
    const flutes = tex(flutedNormalCanvas(), false);
    flutes.wrapS = flutes.wrapT = THREE.RepeatWrapping;
    flutes.repeat.set(150, 1);
    const plaster = tex(plasterCanvas());
    plaster.wrapS = plaster.wrapT = THREE.RepeatWrapping;
    plaster.repeat.set(5, 4);
    this.wallMat = new THREE.MeshStandardMaterial({
      color: '#46203b',
      map: plaster,
      normalMap: flutes,
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughness: 0.84,
      metalness: 0,
    });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 9), this.wallMat);
    wall.position.set(0, 1.4, 0);
    wall.receiveShadow = true;
    this.scene.add(wall);

    const wood = tex(woodCanvas());
    wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
    wood.repeat.set(4, 12);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 10),
      new THREE.MeshStandardMaterial({ map: wood, color: '#9a7a6a', roughness: 0.5 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -2.05, 5);
    floor.receiveShadow = true;
    this.scene.add(floor);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.16, 0.035),
      new THREE.MeshStandardMaterial({ color: '#1a0c16', roughness: 0.6 }),
    );
    base.position.set(0, -1.97, 0.018);
    this.scene.add(base);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), new THREE.MeshStandardMaterial({ color: '#120910', roughness: 1 }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 3.9, 5);
    this.scene.add(ceiling);
  }

  clothMaterial(color) {
    this.clothTex ||= tex(clothCanvas());
    return new THREE.MeshStandardMaterial({ map: this.clothTex, color, roughness: 0.86 });
  }

  buildShelf() {
    this.copper = new THREE.MeshStandardMaterial({ color: '#c98457', metalness: 1, roughness: 0.3 });
    this.copperPolished = new THREE.MeshStandardMaterial({ color: '#d49468', metalness: 1, roughness: 0.16 });
    const wood = tex(woodCanvas());
    const shelf = new THREE.Mesh(
      new RoundedBoxGeometry(SHELF_W, SHELF_T, SHELF_D, 2, 0.008),
      new THREE.MeshStandardMaterial({ map: wood, roughness: 0.48 }),
    );
    shelf.position.set(0, -SHELF_T / 2, SHELF_D / 2);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    this.scene.add(shelf);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(SHELF_W - 0.012, 0.012, 0.004), this.copper);
    lip.position.set(0, -SHELF_T / 2, SHELF_D + 0.002);
    this.scene.add(lip);
  }

  buildBooks() {
    this.paperMat = new THREE.MeshStandardMaterial({ map: tex(paperEdgeCanvas()), roughness: 0.92 });
    const total = this.volumes.reduce((a, v) => a + v.t, 0) + BOOK_GAP * (this.volumes.length - 1);
    let x = -0.86;
    this.books = this.volumes.map((v, i) => {
      const d = v.h * 0.7;
      const sp = spineCanvases(v, PX_SPINE);
      const rmTex = tex(sp.rm, false);
      const spineMat = new THREE.MeshStandardMaterial({
        map: tex(sp.color),
        roughnessMap: rmTex,
        metalnessMap: rmTex,
        roughness: 1,
        metalness: 1,
      });
      const clothMat = this.clothMaterial(v.cloth);
      const mesh = new THREE.Mesh(
        new RoundedBoxGeometry(v.t, v.h, d, 2, Math.min(0.01, v.t * 0.08)),
        [clothMat, clothMat, this.paperMat, this.paperMat, spineMat, this.paperMat],
      );
      mesh.position.set(x + v.t / 2, v.h / 2 + 0.001, SHELF_D - d / 2 - 0.025);
      x += v.t + BOOK_GAP;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = {
        index: i,
        h: v.h,
        t: v.t,
        d,
        home: mesh.position.clone(),
        homeQuat: mesh.quaternion.clone(),
        pull: 0,
        locked: false,
        coverReady: false,
      };
      this.scene.add(mesh);
      return mesh;
    });
    this.booksEnd = -0.86 + total;

    // aparador de livros em cobre
    const be = new THREE.Group();
    const plate = new THREE.Mesh(new RoundedBoxGeometry(0.018, 0.34, 0.26, 2, 0.004), this.copper);
    plate.position.set(0, 0.17, 0);
    const foot = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.01, 0.26, 2, 0.003), this.copper);
    foot.position.set(0.075, 0.005, 0);
    [plate, foot].forEach((m) => {
      m.castShadow = true;
      be.add(m);
    });
    be.position.set(-0.86 - 0.012, 0, SHELF_D - 0.2);
    this.scene.add(be);

    // pilha de livros deitados e a esfera de cobre
    const stack = [
      ['#3b1631', 0.44, 0.052, 0.31],
      ['#d9c7b8', 0.4, 0.046, 0.29],
      ['#7a1a46', 0.36, 0.058, 0.27],
    ];
    let y = 0;
    const sx = this.booksEnd + 0.33;
    stack.forEach(([c, len, th, dep], i) => {
      const cm = this.clothMaterial(c);
      const m = new THREE.Mesh(new RoundedBoxGeometry(len, th, dep, 2, 0.006), [this.paperMat, this.paperMat, cm, cm, cm, this.paperMat]);
      m.position.set(sx, y + th / 2, SHELF_D - dep / 2 - 0.05);
      m.rotation.y = (i - 1) * 0.08;
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
      y += th;
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.075, 48, 32), this.copperPolished);
    sphere.position.set(sx + 0.02, y + 0.075, SHELF_D - 0.2);
    sphere.castShadow = true;
    this.scene.add(sphere);
  }

  buildLamp() {
    const g = new THREE.Group();
    const profile = [
      [0.034, 0.34], [0.04, 0.3], [0.07, 0.26], [0.12, 0.2], [0.18, 0.13],
      [0.235, 0.07], [0.268, 0.026], [0.285, 0], [0.287, -0.004],
    ]
      .reverse() // de baixo para cima: assim as faces da LatheGeometry apontam para fora
      .map(([r, y]) => new THREE.Vector2(r, y));
    this.shade = new THREE.Mesh(
      new THREE.LatheGeometry(profile, 72),
      new THREE.MeshStandardMaterial({ color: '#21121b', metalness: 0.6, roughness: 0.42, envMapIntensity: 0.5 }),
    );
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.286, 0.006, 8, 72), this.copper);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.002;
    this.lampInnerMat = new THREE.MeshStandardMaterial({
      color: '#2a1a12',
      emissive: new THREE.Color('#ffd7a6'),
      emissiveIntensity: 0,
      side: THREE.BackSide,
      roughness: 0.9,
    });
    const inner = new THREE.Mesh(
      new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p.x * 0.985, p.y - 0.003)), 72),
      this.lampInnerMat,
    );
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.05, 32), this.copper);
    cap.position.y = 0.36;
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 4, 8), new THREE.MeshStandardMaterial({ color: '#0d0709', roughness: 0.6 }));
    cord.position.y = 0.36 + 2;
    this.bulbMat = new THREE.MeshBasicMaterial({ color: '#fff1dc' });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 24, 16), this.bulbMat);
    bulb.position.y = 0.07;
    this.lampGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex(glowCanvas()),
        color: '#ffcf9a',
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
      }),
    );
    this.lampGlow.scale.set(0.9, 0.9, 1);
    this.lampGlow.position.y = 0.04;
    g.add(this.shade, rim, inner, cap, cord, bulb, this.lampGlow);

    const coneH = 1.6;
    const coneAngle = 0.56;
    const coneGeo = new THREE.ConeGeometry(Math.tan(coneAngle) * coneH, coneH, 64, 1, true);
    coneGeo.translate(0, -coneH / 2, 0);
    this.coneMat = new THREE.ShaderMaterial({
      uniforms: { uH: { value: coneH }, uColor: { value: new THREE.Color('#ffc58f') }, uI: { value: 0 } },
      vertexShader: CONE_VERT,
      fragmentShader: CONE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const cone = new THREE.Mesh(coneGeo, this.coneMat);
    cone.position.y = 0.05;
    g.add(cone);
    this.coneInfo = { h: coneH, angle: coneAngle };

    this.spot = new THREE.SpotLight('#ffcf9a', 0, 7, 0.62, 0.7, 2);
    this.spot.position.set(0, 0.06, 0);
    this.spot.castShadow = true;
    const sm = this.touch ? 1024 : 2048;
    this.spot.shadow.mapSize.set(sm, sm);
    this.spot.shadow.radius = 7;
    this.spot.shadow.bias = -0.0005;
    this.spot.shadow.normalBias = 0.012;
    this.spot.shadow.camera.near = 0.25;
    this.spot.shadow.camera.far = 6;
    g.add(this.spot);
    this.scene.add(this.spot.target);

    this.lampFill = new THREE.PointLight('#ffb27a', 0, 3.4, 2);
    this.lampFill.position.set(0, 0.2, 0.05);
    g.add(this.lampFill);

    this.lamp = g;
    this.scene.add(g);
  }

  buildNeon() {
    const { canvas, aspect } = neonCanvas();
    this.neonMat = new THREE.MeshBasicMaterial({
      map: tex(canvas),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      color: new THREE.Color(0, 0, 0),
    });
    const H = 1.3;
    const g = new THREE.Group();
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(H * aspect, H), this.neonMat);
    plane.position.z = 0.05;
    g.add(plane);
    const pin = new THREE.CylinderGeometry(0.008, 0.008, 0.05, 10);
    [[-0.22, 0.32], [0.2, 0.32], [-0.22, -0.34], [0.22, -0.34]].forEach(([x, y]) => {
      const m = new THREE.Mesh(pin, this.copper);
      m.rotation.x = Math.PI / 2;
      m.position.set(x, y, 0.025);
      g.add(m);
    });
    this.neonLight = new THREE.PointLight('#ff2bf0', 0, 3.4, 2);
    this.neonLight.position.set(0, 0, 0.45);
    g.add(this.neonLight);
    this.neon = g;
    this.scene.add(g);
  }

  buildWindow() {
    const W = 0.86;
    const Hr = 1.28;
    const R = W / 2;
    const Ht = Hr + R;
    const arch = (inset) => {
      const s = new THREE.Shape();
      const w2 = W / 2 + inset;
      s.moveTo(-w2, -inset);
      s.lineTo(w2, -inset);
      s.lineTo(w2, Hr);
      s.absarc(0, Hr, R + inset, 0, Math.PI, false);
      s.lineTo(-w2, -inset);
      return s;
    };
    const g = new THREE.Group();
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color() },
        uBot: { value: new THREE.Color() },
        uSun: { value: new THREE.Color() },
        uSunPos: { value: new THREE.Vector2(0.5, 0.5) },
        uSunI: { value: 1 },
        uStars: { value: 0 },
        uTime: { value: 0 },
        uMoon: { value: 0 },
        uAspect: { value: Ht / W },
        uSize: { value: new THREE.Vector2(W, Ht) },
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
    });
    const glass = new THREE.Mesh(new THREE.ShapeGeometry(arch(0), 48), this.skyMat);
    glass.position.z = 0.004;
    g.add(glass);

    const frameShape = arch(0.06);
    const hole = new THREE.Path();
    hole.moveTo(-W / 2, 0);
    hole.lineTo(W / 2, 0);
    hole.lineTo(W / 2, Hr);
    hole.absarc(0, Hr, R, 0, Math.PI, false);
    hole.lineTo(-W / 2, 0);
    frameShape.holes.push(hole);
    const frameMat = new THREE.MeshStandardMaterial({ color: '#140c11', metalness: 0.55, roughness: 0.42 });
    const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(frameShape, { depth: 0.07, bevelEnabled: false, curveSegments: 48 }), frameMat);
    frame.castShadow = true;
    g.add(frame);
    const bar = (w, h, x, y, rz = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.028), frameMat);
      m.position.set(x, y, 0.03);
      m.rotation.z = rz;
      g.add(m);
    };
    bar(0.016, Ht, 0, Ht / 2);
    [0.34, 0.67, 1].forEach((f) => bar(W, 0.016, 0, Hr * f));
    [-0.8, 0.8].forEach((a) => bar(0.014, R, Math.sin(a) * R * 0.5, Hr + Math.cos(a) * R * 0.5, -a));
    const sill = new THREE.Mesh(new RoundedBoxGeometry(W + 0.26, 0.045, 0.16, 2, 0.008), new THREE.MeshStandardMaterial({ color: '#3a2731', roughness: 0.5 }));
    sill.position.set(0, -0.085, 0.07);
    sill.castShadow = true;
    sill.receiveShadow = true;
    g.add(sill);

    this.winGlowMat = new THREE.MeshBasicMaterial({
      map: tex(glowCanvas()),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.3,
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(W * 3.4, Ht * 1.9), this.winGlowMat);
    glow.position.set(0, Ht * 0.5, 0.002);
    g.add(glow);

    this.windowLight = new THREE.PointLight('#ffffff', 0, 5.5, 2);
    this.windowLight.position.set(0, Ht * 0.55, 0.9);
    g.add(this.windowLight);
    this.windowSize = { W, Ht };
    this.win = g;
    this.scene.add(g);
  }

  buildDust() {
    const N = this.touch ? 110 : 190;
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    const { h, angle } = this.coneInfo;
    for (let i = 0; i < N; i++) {
      const r = Math.sqrt(Math.random()) * Math.tan(angle) * h * 0.9;
      const th = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(th) * r;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = Math.sin(th) * r;
      seed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.dustMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 15 * this.renderer.getPixelRatio() },
        uH: { value: h * 0.95 },
        uTan: { value: Math.tan(angle) },
        uI: { value: 0 },
      },
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, this.dustMat);
    pts.frustumCulled = false;
    pts.position.y = 0.05;
    this.lamp.add(pts);
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight('#b9c6ff', '#1a0c14', 0.4);
    this.scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight('#4a2140', 0.32);
    this.scene.add(this.ambient);
  }

  buildEnv() {
    const env = new THREE.Scene();
    env.background = new THREE.Color('#120a10');
    const add = (color, w, h, pos) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      m.position.set(...pos);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    const sky = this.sky || skyAt(12);
    const skyCol = new THREE.Color().setRGB(...sky.bottom, THREE.SRGBColorSpace).multiplyScalar(0.6 + sky.day * 1.6);
    add(new THREE.Color(1, 0.72, 0.45).multiplyScalar(5 * (this.lampOn ? 1 : 0.05)), 2.2, 2.2, [0, 4.5, 1.2]);
    add(new THREE.Color(1, 0.12, 0.9).multiplyScalar(1.6), 1.6, 2.2, [-4.5, 1, 1.5]);
    add(skyCol, 1.6, 2.6, [4.5, 1.2, 1.5]);
    add(new THREE.Color(1.15, 0.78, 0.6), 7, 3.2, [0, 0.6, 5]);
    this.pmrem ||= new THREE.PMREMGenerator(this.renderer);
    const rt = this.pmrem.fromScene(env, 0.04);
    if (this.envRT) this.envRT.dispose();
    this.envRT = rt;
    this.scene.environment = rt.texture;
    this.scene.environmentIntensity = 0.55;
    env.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        o.material.dispose();
      }
    });
  }

  /* --------------------------------------------------------------- layout */
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.size = { w, h };
    this.renderer.setSize(w, h, false);
    const cam = this.camera;
    cam.aspect = w / h;
    const tall = cam.aspect < 1.05;
    this.tall = tall;
    const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const fitW = tall ? 1.9 : 4.45;
    const dist = clamp(fitW / 2 / (tanH * cam.aspect), tall ? 4.6 : 4.3, 10);
    const target = new THREE.Vector3(0, tall ? 1.08 : 0.76, 0.32);
    this.base = { target, pos: new THREE.Vector3(0, target.y + 0.12, target.z + dist) };

    if (tall) {
      this.lamp.position.set(0.04, 1.6, 0.56);
      this.lamp.scale.setScalar(0.8);
      this.neon.position.set(-0.6, 1.76, 0.001);
      this.neon.scale.setScalar(0.6);
      this.win.position.set(0.63, 1.12, 0.001);
      this.win.scale.setScalar(0.58);
    } else {
      this.lamp.position.set(0, 1.62, 0.6);
      this.lamp.scale.setScalar(1);
      this.neon.position.set(-1.6, 1.04, 0.001);
      this.neon.scale.setScalar(1);
      this.win.position.set(1.66, -0.3, 0.001);
      this.win.scale.setScalar(1);
    }
    this.spot.target.position.set(this.lamp.position.x * 0.4 - 0.1, 0.32, 0.32);
    cam.updateProjectionMatrix();
    this.placeCamera(0);
    if (!this.running) this.render();
  }

  placeCamera(dt) {
    const p = this.parallax;
    if (dt) {
      p.x = damp(p.x, p.tx, 2.6, dt);
      p.y = damp(p.y, p.ty, 2.6, dt);
      this.lean.amount = damp(this.lean.amount, this.lean.target, 7, dt);
    }
    const cam = this.camera;
    const pos = this.v.copy(this.base.pos);
    pos.x += p.x * 0.14;
    pos.y += p.y * 0.07 + this.intro.y;
    pos.z += this.intro.z;
    const tgt = this.camTarget.copy(this.base.target);
    tgt.x += p.x * 0.04;
    if (this.lean.index >= 0 && this.lean.amount > 0.001) {
      const b = this.books[this.lean.index].userData.home;
      const a = this.lean.amount;
      pos.lerp(new THREE.Vector3(b.x, b.y + 0.18, b.z + 1.9), a * 0.55);
      tgt.lerp(new THREE.Vector3(b.x, b.y + 0.12, b.z), a * 0.6);
    }
    cam.position.copy(pos);
    cam.lookAt(tgt);
    cam.updateMatrixWorld();
  }

  /* --------------------------------------------------------------- tempo */
  setHour(h) {
    this.hour = h;
    const s = (this.sky = skyAt(h));
    const u = this.skyMat.uniforms;
    u.uTop.value.setRGB(...s.top, THREE.SRGBColorSpace);
    u.uBot.value.setRGB(...s.bottom, THREE.SRGBColorSpace);
    u.uSun.value.setRGB(...s.sun, THREE.SRGBColorSpace);
    u.uSunPos.value.set(s.sunPos[0], s.sunPos[1]);
    u.uSunI.value = s.sunI;
    u.uStars.value = s.stars;
    u.uMoon.value = s.moon ? 1 : 0;
    const mid = s.bottom.map((v, i) => v * 0.6 + s.top[i] * 0.4);
    this.hemi.color.setRGB(...mid, THREE.SRGBColorSpace);
    this.hemi.intensity = 0.22 + s.day * 0.85;
    this.ambient.intensity = 0.26 + s.day * 0.2;
    this.windowLight.color.setRGB(...s.bottom, THREE.SRGBColorSpace);
    this.windowLight.intensity = 0.8 + s.day * 5.5;
    this.winGlowMat.color.setRGB(...s.bottom, THREE.SRGBColorSpace);
    this.winGlowMat.opacity = 0.16 + s.day * 0.4;
    this.lampBase = s.lamp;
    clearTimeout(this.envTimer);
    this.envTimer = setTimeout(() => this.buildEnv(), 250);
    if (!this.running) this.render();
  }

  /* -------------------------------------------------------------- luzes */
  powerOn() {
    if (this.reduced) {
      this.lampLevel = 1;
      this.neonLevel = 1;
      return;
    }
    this.flicker = { t0: performance.now(), seq: [[0, 0], [180, 0.75], [250, 0.08], [330, 0.95], [420, 0.25], [640, 1]] };
    setTimeout(() => {
      this.neonFlicker = performance.now();
    }, 700);
  }

  toggleLamp() {
    this.lampOn = !this.lampOn;
    clearTimeout(this.envTimer);
    this.envTimer = setTimeout(() => this.buildEnv(), 400);
    this.emit('lamp', this.lampOn);
  }

  /* ------------------------------------------------------- interação */
  setPointer(clientX, clientY) {
    const { w, h } = this.size;
    this.pointer.set((clientX / w) * 2 - 1, -(clientY / h) * 2 + 1);
    this.parallax.tx = this.pointer.x;
    this.parallax.ty = this.pointer.y;
    this.pick();
  }

  clearPointer() {
    this.pointer.set(-10, -10);
    this.parallax.tx = 0;
    this.parallax.ty = 0;
    this.setHover(-1, false);
  }

  hitTest(clientX, clientY) {
    const { w, h } = this.size;
    const ndc = new THREE.Vector2((clientX / w) * 2 - 1, -(clientY / h) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects([...this.books, this.shade], false);
    if (!hits.length) return { book: -1, lamp: false };
    const o = hits[0].object;
    if (o === this.shade) return { book: -1, lamp: true };
    return { book: o.userData.locked ? -1 : o.userData.index, lamp: false };
  }

  pick() {
    if (!this.camera) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects([...this.books, this.shade], false);
    let book = -1;
    let lamp = false;
    if (hits.length) {
      const o = hits[0].object;
      if (o === this.shade) lamp = true;
      else if (!o.userData.locked) book = o.userData.index;
    }
    this.setHover(book, lamp);
  }

  setHover(book, lamp) {
    if (book !== this.hovered) {
      this.hovered = book;
      this.emit('hover', book);
    }
    if (lamp !== this.lampHover) {
      this.lampHover = lamp;
      this.emit('lamphover', lamp);
    }
    this.canvas.style.cursor = book >= 0 || lamp ? 'pointer' : '';
  }

  setFocus(i) {
    this.focused = i;
  }

  setLean(index, amount) {
    this.lean.index = index;
    this.lean.target = clamp(amount, 0, 1);
  }

  anchor(i) {
    const m = this.books[i];
    const u = m.userData;
    this.v.set(m.position.x, m.position.y + u.h / 2 + 0.03, m.position.z + u.d / 2 - 0.02).project(this.camera);
    return { x: (this.v.x * 0.5 + 0.5) * this.size.w, y: (-this.v.y * 0.5 + 0.5) * this.size.h };
  }

  /* ------------------------------------------------ tirar e devolver livros */
  ensureCover(i) {
    const m = this.books[i];
    if (m.userData.coverReady) return;
    const c = coverCanvases(this.volumes[i], PX_COVER);
    const rmTex = tex(c.rm, false);
    m.material[0] = new THREE.MeshStandardMaterial({
      map: tex(c.color),
      roughnessMap: rmTex,
      metalnessMap: rmTex,
      roughness: 1,
      metalness: 1,
    });
    m.userData.coverReady = true;
  }

  frontPose(i) {
    const u = this.books[i].userData;
    const cam = this.camera;
    const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const byH = u.h / (0.6 * 2 * tanH);
    const byW = u.d / (0.72 * 2 * tanH * cam.aspect);
    const D = Math.max(byH, byW);
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    const pos = cam.position.clone().addScaledVector(dir, D + u.t / 2);
    const toCam = cam.position.clone().sub(pos).normalize();
    const zAxis = new THREE.Vector3().crossVectors(toCam, new THREE.Vector3(0, 1, 0)).normalize();
    const yAxis = new THREE.Vector3().crossVectors(zAxis, toCam).normalize();
    const quat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(toCam, yAxis, zAxis));
    return { pos, quat };
  }

  coverRect(i) {
    const m = this.books[i];
    m.updateMatrixWorld(true);
    this.camera.updateMatrixWorld();
    const u = m.userData;
    const xs = [];
    const ys = [];
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => {
      const v = new THREE.Vector3(u.t / 2, (a * u.h) / 2, (b * u.d) / 2).applyMatrix4(m.matrixWorld).project(this.camera);
      xs.push((v.x * 0.5 + 0.5) * this.size.w);
      ys.push((-v.y * 0.5 + 0.5) * this.size.h);
    });
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
  }

  async pullOut(i) {
    const m = this.books[i];
    const u = m.userData;
    u.locked = true;
    this.setHover(-1, false);
    this.ensureCover(i);
    const fast = this.reduced;
    const start = m.position.clone();
    const out = u.home.clone();
    out.z += 0.36;
    out.y += 0.03;
    await tween(fast ? 0 : 360, (e) => m.position.lerpVectors(start, out, e), ease.inOutCubic);
    this.parallax.tx = 0;
    this.parallax.ty = 0;
    this.setLean(-1, 0);
    const pose = this.frontPose(i);
    const p0 = m.position.clone();
    const q0 = m.quaternion.clone();
    await tween(
      fast ? 0 : 880,
      (e) => {
        m.position.lerpVectors(p0, pose.pos, e);
        m.position.y += Math.sin(e * Math.PI) * 0.12;
        m.quaternion.slerpQuaternions(q0, pose.quat, e);
      },
      ease.inOutCubic,
    );
    return this.coverRect(i);
  }

  /* Coloca um livro já na frente da câmera (quando se troca de volume
     com o livro aberto) e devolve o anterior para a estante. */
  swapFront(from, to) {
    if (from >= 0 && from !== to) this.resetBook(from);
    const m = this.books[to];
    this.ensureCover(to);
    m.userData.locked = true;
    const pose = this.frontPose(to);
    m.position.copy(pose.pos);
    m.quaternion.copy(pose.quat);
    m.visible = false;
  }

  frontRect(i) {
    this.parallax.x = this.parallax.tx = 0;
    this.parallax.y = this.parallax.ty = 0;
    this.placeCamera(0);
    const m = this.books[i];
    const pose = this.frontPose(i);
    m.position.copy(pose.pos);
    m.quaternion.copy(pose.quat);
    return this.coverRect(i);
  }

  resetBook(i) {
    const m = this.books[i];
    const u = m.userData;
    m.position.copy(u.home);
    m.quaternion.copy(u.homeQuat);
    m.visible = true;
    u.locked = false;
    u.pull = 0;
  }

  showBook(i, visible) {
    this.books[i].visible = visible;
    if (!this.running) this.render();
  }

  async putBack(i) {
    const m = this.books[i];
    const u = m.userData;
    m.visible = true;
    const p0 = m.position.clone();
    const q0 = m.quaternion.clone();
    const out = u.home.clone();
    out.z += 0.36;
    out.y += 0.03;
    const fast = this.reduced;
    await tween(
      fast ? 0 : 720,
      (e) => {
        m.position.lerpVectors(p0, out, e);
        m.position.y += Math.sin(e * Math.PI) * 0.1;
        m.quaternion.slerpQuaternions(q0, u.homeQuat, e);
      },
      ease.inOutCubic,
    );
    await tween(fast ? 0 : 300, (e) => m.position.lerpVectors(out, u.home, e), ease.inOutCubic);
    u.locked = false;
    u.pull = 0;
  }

  /* --------------------------------------------------------------- laço */
  async playIntro() {
    this.powerOn();
    if (this.reduced) return;
    this.intro.y = 0.32;
    this.intro.z = 2.3;
    await tween(2600, (e) => {
      this.intro.y = 0.32 * (1 - e);
      this.intro.z = 2.3 * (1 - e);
    }, ease.outQuint);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      this.update(now);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  update(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.placeCamera(dt);

    // livros que saem um pouco quando apontados
    this.books.forEach((m, i) => {
      const u = m.userData;
      if (u.locked) return;
      const target = i === this.hovered || i === this.focused || i === this.lean.index ? 1 : 0;
      u.pull = damp(u.pull, target, 11, dt);
      m.position.set(u.home.x, u.home.y + u.pull * 0.014, u.home.z + u.pull * 0.1);
    });

    // luminária
    let level = this.lampOn ? 1 : 0;
    if (this.flicker) {
      const el = now - this.flicker.t0;
      const seq = this.flicker.seq;
      let v = seq[0][1];
      for (const [t, val] of seq) if (el >= t) v = val;
      level = v;
      if (el > seq[seq.length - 1][0]) this.flicker = null;
      this.lampLevel = level;
    } else this.lampLevel = damp(this.lampLevel, level, 9, dt);
    const L = this.lampLevel;
    this.spot.intensity = L * this.lampBase * SPOT_POWER;
    this.lampFill.intensity = L * 0.9;
    this.lampInnerMat.emissiveIntensity = L * 1.5;
    this.bulbMat.color.setRGB(0.25 + L * 0.75, 0.22 + L * 0.72, 0.2 + L * 0.66);
    this.lampGlow.material.opacity = L * 0.85;
    this.coneMat.uniforms.uI.value = L * 0.13;
    this.dustMat.uniforms.uI.value = L * 0.85;
    this.dustMat.uniforms.uTime.value += dt;

    // neon
    let n = 0;
    if (this.neonFlicker) {
      const el = now - this.neonFlicker;
      if (el < 900) n = Math.random() < el / 900 ? 1 : 0.15;
      else n = 1;
      this.neonLevel = n;
    }
    const hum = this.reduced ? 1 : 0.96 + Math.sin(now * 0.013) * 0.02 + (Math.random() < 0.004 ? -0.25 : 0);
    const N = this.neonLevel * hum;
    this.neonMat.color.setRGB(N, N, N);
    this.neonLight.intensity = N * 1.7;

    this.skyMat.uniforms.uTime.value += dt;
    this.render();
    this.emit('frame', dt);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
