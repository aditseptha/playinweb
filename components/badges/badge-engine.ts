// three.js renderer for profile badges (#30). Loaded with a dynamic import, so three.js only
// downloads when a badge panel scrolls into view.
//
// One WebGL context per panel: a canvas laid over the panel draws every badge into its own
// rectangle (scissor). Browsers cap WebGL contexts at about 16, and a profile shows 11 badges.
// The canvas lives inside the panel, so scrolling moves it with the badges and needs no redraw.
//
// Frames are drawn on demand: while a badge spins or tilts, while a Foil aura is on screen, and
// once after a resize or a change. A still panel costs nothing.
import * as THREE from "three";
import { BADGE_SHAPES, stripes, type BadgePart, type Polygon } from "@/lib/badge-shapes";
import { BADGE_PALETTES as PALETTES, FOIL_FILM } from "@/lib/badge-art";
import type { BadgeId, BadgeTier } from "@/lib/badges";

export type BadgeLook = { badge: BadgeId; tier: BadgeTier; stripes: number };

export type BadgeView = {
  update(look: BadgeLook): void;
  /** Hover or focus on (true) or off. Starts a spin when it turns on. */
  hover(on: boolean): void;
  /** Tilt toward a pointer at x, y in -1..1 across the badge. */
  tilt(x: number, y: number): void;
  spin(): void;
  remove(): void;
};

export type BadgeRenderer = {
  add(el: HTMLElement, look: BadgeLook): BadgeView;
  dispose(): void;
};

// Polished metal ---------------------------------------------------------------------------------
// A painted studio sphere (matcap) per tier: bevels facing up flash white, bevels facing down fall
// into deep shade, and a coloured bounce sits on the lower rim.

function paintMatcap(tier: BadgeTier): THREE.Texture {
  const p = PALETTES[tier];
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const lg = g.createLinearGradient(0, 0, 0, S);
  lg.addColorStop(0, p.hi);
  lg.addColorStop(0.22, p.light);
  lg.addColorStop(0.5, p.base);
  lg.addColorStop(0.8, p.deep);
  lg.addColorStop(1, p.deep);
  g.fillStyle = lg;
  g.fillRect(0, 0, S, S);
  if (tier === "foil" && "createConicGradient" in g) {
    const cg = g.createConicGradient(0, S / 2, S / 2);
    FOIL_FILM.forEach((col, i) => cg.addColorStop(i / (FOIL_FILM.length - 1), col));
    g.globalCompositeOperation = "overlay";
    g.globalAlpha = 0.9;
    g.fillStyle = cg;
    g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
  }
  const rg = g.createRadialGradient(S * 0.44, S * 0.42, 0, S * 0.5, S * 0.5, S * 0.34);
  rg.addColorStop(0, p.base);
  rg.addColorStop(0.75, p.base);
  rg.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, S, S);
  g.save();
  g.filter = "blur(3px)";
  g.fillStyle = p.hi;
  g.globalAlpha = 0.95;
  g.beginPath();
  g.ellipse(S * 0.5, S * 0.17, S * 0.32, S * 0.07, 0, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 0.8;
  g.beginPath();
  g.ellipse(S * 0.18, S * 0.36, S * 0.05, S * 0.16, 0.35, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
  g.beginPath();
  g.arc(S * 0.3, S * 0.24, S * 0.035, 0, Math.PI * 2);
  g.fill();
  g.restore();
  g.save();
  g.filter = "blur(5px)";
  g.strokeStyle = p.bounce;
  g.lineWidth = S * 0.05;
  g.globalAlpha = 0.9;
  g.beginPath();
  g.arc(S / 2, S / 2, S * 0.46, Math.PI * 0.2, Math.PI * 0.8);
  g.stroke();
  g.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const METAL_VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vView; varying vec3 vPos;
  void main() {
    vPos = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }`;

const METAL_FRAG = /* glsl */ `
  uniform sampler2D matcap; uniform vec3 rimColor; uniform float rimAmt;
  uniform float sweep; uniform float sweepAmt; uniform float uvRot; uniform float bright;
  varying vec3 vN; varying vec3 vView; varying vec3 vPos;
  void main() {
    vec3 n = normalize(vN), v = normalize(vView);
    vec3 x = normalize(vec3(v.z, 0.0, -v.x)), y = cross(v, x);
    vec2 uv = vec2(dot(x, n), dot(y, n)) * 0.495;
    float c = cos(uvRot), s = sin(uvRot);
    uv = mat2(c, -s, s, c) * uv + 0.5;
    vec3 col = texture2D(matcap, uv).rgb;
    float g = clamp(vPos.y * 0.5 - vPos.x * 0.22 + 0.5, 0.0, 1.0);
    col *= mix(0.42, 1.35, g * g * (3.0 - 2.0 * g)) * bright;
    float d = (vPos.x + vPos.y * 0.65) - sweep;
    col += vec3(1.0) * (exp(-d * d * 55.0) + 0.55 * exp(-(d - 0.2) * (d - 0.2) * 260.0)) * sweepAmt;
    float fr = pow(1.0 - abs(dot(n, v)), 2.5);
    col += rimColor * fr * rimAmt;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;

// Foil aura: rotating rainbow rays, a breathing ring, rising sparkles --------------------------------

const HSV = /* glsl */ `vec3 hsv2rgb(vec3 c){ vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }`;

const AURA_FRAG = /* glsl */ `
  uniform float time; uniform float strength; varying vec2 vUv;
  ${HSV}
  void main() {
    vec2 p = vUv * 2.0 - 1.0; float r = length(p), a = atan(p.y, p.x);
    float rays = pow(0.5 + 0.5 * sin(a * 9.0 + time * 1.1), 7.0)
               + 0.8 * pow(0.5 + 0.5 * sin(a * 5.0 - time * 0.7 + 1.3), 9.0)
               + 0.5 * pow(0.5 + 0.5 * sin(a * 13.0 + time * 1.9 + 2.1), 12.0);
    float flick = 0.7 + 0.3 * sin(time * 3.0 + a * 3.0);
    float ring = exp(-pow((r - 0.6 - 0.035 * sin(time * 2.2)) * 10.0, 2.0));
    float core = exp(-r * r * 6.0);
    float fall = smoothstep(1.0, 0.3, r);
    float i = (rays * flick * 0.85 * smoothstep(0.08, 0.42, r) + ring * 0.55) * fall + core * 0.55;
    vec3 col = hsv2rgb(vec3(fract(a / 6.2832 + time * 0.08), 0.55, 1.0));
    gl_FragColor = vec4(col, clamp(i * strength, 0.0, 1.0));
    #include <colorspace_fragment>
  }`;

const SPARK_VERT = /* glsl */ `
  attribute float seed; uniform float time; uniform float scale;
  varying float vAlpha; varying float vHue;
  void main() {
    float rise = fract(time * (0.12 + seed * 0.1) + seed * 7.3);
    float ang = seed * 6.2832 + time * 0.25 * (seed > 0.5 ? 1.0 : -1.0);
    float rad = 0.95 + fract(seed * 13.7) * 0.5;
    vec3 pos = vec3(cos(ang) * rad, sin(ang) * rad * 0.9 + rise * 0.5 - 0.25, (fract(seed * 5.1) - 0.5) * 0.8);
    vAlpha = sin(rise * 3.1416) * (0.55 + 0.45 * sin(time * 6.0 + seed * 40.0));
    vHue = fract(seed + time * 0.1);
    gl_PointSize = (5.0 + fract(seed * 3.7) * 9.0) * scale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }`;

const SPARK_FRAG = /* glsl */ `
  uniform float strength; varying float vAlpha; varying float vHue;
  ${HSV}
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float star = exp(-dot(c, c) * 60.0) + exp(-abs(c.x) * 38.0) * exp(-abs(c.y) * 7.0) + exp(-abs(c.y) * 38.0) * exp(-abs(c.x) * 7.0);
    vec3 col = mix(vec3(1.0), hsv2rgb(vec3(vHue, 0.6, 1.0)), 0.55);
    gl_FragColor = vec4(col, clamp(star * vAlpha * strength, 0.0, 1.0));
    #include <colorspace_fragment>
  }`;

// Geometry ---------------------------------------------------------------------------------------

const v2 = (p: readonly [number, number]) => new THREE.Vector2(p[0], p[1]);

function extrude(outer: Polygon, holes: readonly Polygon[], depth: number, bevel: number) {
  const shape = new THREE.Shape(outer.map(v2));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(v2)));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 24,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 2,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const SPIN_MS = 1100;

export function createBadgeRenderer(canvas: HTMLCanvasElement, { reducedMotion = false } = {}): BadgeRenderer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const matcaps = new Map<BadgeTier, THREE.Texture>();
  const matcap = (tier: BadgeTier) => {
    let t = matcaps.get(tier);
    if (!t) matcaps.set(tier, (t = paintMatcap(tier)));
    return t;
  };
  const frameGeos = new Map<BadgeId, THREE.BufferGeometry[]>();
  const partGeos = (badge: BadgeId) => {
    let g = frameGeos.get(badge);
    if (!g) frameGeos.set(badge, (g = BADGE_SHAPES[badge].parts.map((p: BadgePart) => extrude(p.outer, p.holes, p.depth, p.bevel))));
    return g;
  };

  const glowTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,0.9)");
    grd.addColorStop(0.35, "rgba(255,255,255,0.35)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const glowGeo = new THREE.PlaneGeometry(3.3, 3.3);
  const auraGeo = new THREE.PlaneGeometry(3.2, 3.2);
  const sparkGeo = (() => {
    const n = 36;
    const g = new THREE.BufferGeometry();
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) seed[i] = (i * 0.6180339887) % 1;
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
    return g;
  })();

  type Internal = {
    el: HTMLElement;
    look: BadgeLook;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    root: THREE.Group;
    mat: THREE.ShaderMaterial | null;
    stripeGeos: THREE.BufferGeometry[];
    glow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    aura: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
    sparks: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
    tilt: { x: number; y: number };
    target: { x: number; y: number };
    hover: number;
    hoverT: number;
    spinStart: number;
    phase: number;
  };

  const views = new Set<Internal>();
  let raf = 0;
  let visible = true;
  let disposed = false;

  function build(v: Internal) {
    for (const g of v.stripeGeos) g.dispose();
    v.stripeGeos = [];
    v.mat?.dispose();
    v.root.clear();
    const { badge, tier } = v.look;
    const p = PALETTES[tier];
    v.mat = new THREE.ShaderMaterial({
      vertexShader: METAL_VERT,
      fragmentShader: METAL_FRAG,
      uniforms: {
        matcap: { value: matcap(tier) },
        rimColor: { value: new THREE.Color(p.glow) },
        rimAmt: { value: tier === "locked" ? 0.15 : 0.7 },
        sweep: { value: -9 },
        sweepAmt: { value: 0 },
        uvRot: { value: 0 },
        bright: { value: 1 },
      },
    });
    for (const g of partGeos(badge)) v.root.add(new THREE.Mesh(g, v.mat));
    for (const piece of stripes(BADGE_SHAPES[badge].stripe, v.look.stripes)) {
      const g = extrude(piece, [], 0.07, 0.045);
      v.stripeGeos.push(g);
      v.root.add(new THREE.Mesh(g, v.mat));
    }
    v.glow.material.color.set(p.glow);
    v.aura.visible = v.sparks.visible = tier === "foil";
  }

  function frame(now: number) {
    raf = 0;
    if (disposed) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    const size = renderer.getSize(new THREE.Vector2());
    if (size.x !== w || size.y !== h) renderer.setSize(w, h, false);
    const box = canvas.getBoundingClientRect();
    const t = now / 1000;
    let busy = false;

    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);

    for (const v of views) {
      v.tilt.x += (v.target.x - v.tilt.x) * 0.15;
      v.tilt.y += (v.target.y - v.tilt.y) * 0.15;
      v.hoverT += (v.hover - v.hoverT) * 0.12;
      if (Math.abs(v.target.x - v.tilt.x) + Math.abs(v.target.y - v.tilt.y) + Math.abs(v.hover - v.hoverT) > 0.002) busy = true;

      let spin = 0;
      let sweep = -9;
      let sweepAmt = 0;
      if (v.spinStart >= 0) {
        const p = (now - v.spinStart) / SPIN_MS;
        if (p >= 1) v.spinStart = -1;
        else {
          spin = easeOut(p) * Math.PI * 2;
          sweep = -2.2 + 4.4 * p;
          sweepAmt = 1.1;
          busy = true;
        }
      }

      const r = v.el.getBoundingClientRect();
      const x = r.left - box.left;
      const y = box.bottom - r.bottom;
      if (r.width === 0 || r.right < box.left || r.left > box.right || r.bottom < box.top || r.top > box.bottom) continue;

      v.root.rotation.set(v.tilt.x, v.tilt.y + spin, 0);
      v.root.scale.setScalar(1 + v.hoverT * 0.06);
      const u = v.mat!.uniforms;
      u.sweep.value = sweep;
      u.sweepAmt.value = sweepAmt;
      u.bright.value = 1 + v.hoverT * 0.12;
      const locked = v.look.tier === "locked";
      v.glow.material.opacity = locked ? 0.08 : 0.3 + v.hoverT * 0.4;
      v.glow.scale.setScalar(1 + v.hoverT * 0.1);

      if (v.look.tier === "foil") {
        const at = reducedMotion ? 2 : t + v.phase;
        if (!reducedMotion) busy = true;
        const hue = new THREE.Color().setHSL(at * 0.07 % 1, 0.85, 0.7);
        u.uvRot.value = reducedMotion ? 0 : at * 0.5;
        u.rimColor.value.copy(hue);
        v.glow.material.color.copy(hue);
        v.aura.material.uniforms.time.value = at;
        v.aura.material.uniforms.strength.value = 0.75 + v.hoverT * 0.5;
        v.aura.scale.setScalar(1 + v.hoverT * 0.08);
        const su = v.sparks.material.uniforms;
        su.time.value = reducedMotion ? 2 : t * (1 + v.hoverT * 0.8) + v.phase;
        su.scale.value = renderer.getPixelRatio() * (r.height / 230);
        su.strength.value = reducedMotion ? 0.6 : 0.8 + v.hoverT * 0.4;
      }

      renderer.setViewport(x, y, r.width, r.height);
      renderer.setScissor(x, y, r.width, r.height);
      const aspect = r.width / r.height;
      v.camera.aspect = aspect;
      v.camera.position.set(0, 0, aspect < 1 ? 6.2 / aspect : 6.2);
      v.camera.updateProjectionMatrix();
      renderer.render(v.scene, v.camera);
    }

    if (busy && visible) request();
  }

  function request() {
    if (!raf && !disposed) raf = requestAnimationFrame(frame);
  }

  const resize = new ResizeObserver(() => request());
  resize.observe(canvas);
  const seen = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (visible) request();
  });
  seen.observe(canvas);

  return {
    add(el, look) {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
      const root = new THREE.Group();
      scene.add(root);
      const glow = new THREE.Mesh(
        glowGeo,
        new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, toneMapped: false }),
      );
      glow.position.z = -0.7;
      scene.add(glow);
      const aura = new THREE.Mesh(
        auraGeo,
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          uniforms: { time: { value: 0 }, strength: { value: 0.8 } },
          vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: AURA_FRAG,
        }),
      );
      aura.position.z = -0.85;
      scene.add(aura);
      const sparks = new THREE.Points(
        sparkGeo,
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          uniforms: { time: { value: 0 }, scale: { value: 1 }, strength: { value: 1 } },
          vertexShader: SPARK_VERT,
          fragmentShader: SPARK_FRAG,
        }),
      );
      sparks.frustumCulled = false;
      scene.add(sparks);

      const v: Internal = {
        el,
        look,
        scene,
        camera,
        root,
        mat: null,
        stripeGeos: [],
        glow,
        aura,
        sparks,
        tilt: { x: 0, y: 0 },
        target: { x: 0, y: 0 },
        hover: 0,
        hoverT: 0,
        spinStart: -1,
        phase: views.size * 1.7,
      };
      build(v);
      views.add(v);
      request();

      return {
        update(next) {
          if (next.badge === v.look.badge && next.tier === v.look.tier && next.stripes === v.look.stripes) return;
          v.look = next;
          build(v);
          request();
        },
        hover(on) {
          v.hover = on ? 1 : 0;
          if (!on) v.target.x = v.target.y = 0;
          if (on) this.spin();
          request();
        },
        tilt(x, y) {
          const k = reducedMotion ? 0.4 : 1;
          v.target.y = Math.max(-1, Math.min(1, x)) * 0.55 * k;
          v.target.x = Math.max(-1, Math.min(1, y)) * 0.4 * k;
          request();
        },
        spin() {
          if (reducedMotion || v.spinStart >= 0) return;
          v.spinStart = performance.now();
          request();
        },
        remove() {
          views.delete(v);
          for (const g of v.stripeGeos) g.dispose();
          v.mat?.dispose();
          v.glow.material.dispose();
          v.aura.material.dispose();
          v.sparks.material.dispose();
          request();
        },
      };
    },
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      resize.disconnect();
      seen.disconnect();
      for (const gs of frameGeos.values()) for (const g of gs) g.dispose();
      for (const t of matcaps.values()) t.dispose();
      glowTex.dispose();
      glowGeo.dispose();
      auraGeo.dispose();
      sparkGeo.dispose();
      renderer.dispose();
    },
  };
}
