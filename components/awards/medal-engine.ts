// three.js renderer for award medals (#30). Loaded with a dynamic import, so three.js only downloads
// on a page with an award, once the medal scrolls near the screen.
//
// One medal per canvas: a gold Sunburst plate with blue enamel and a lettered medallion, hanging on a
// simulated neck ribbon whose two ends are fixed at the top edge of the canvas (the lamp rail drawn in
// HTML over it). The clasp swings between the ribbon ends and the medal swings under the clasp. A
// warm spotlight from the rail lights it. Moving the pointer across the medal brushes it, dragging
// pulls it, and a tap calls onOpen. Frames run only while the canvas is on screen.
//
// The design was explored in the "Best of PlayInWeb: award visuals" canvas; this is the production
// subset (Sunburst only, one medal, no auras).
import * as THREE from "three";
import type { AwardMedal } from "@/lib/awards";

export type MedalOptions = {
  medal: AwardMedal;
  /** Game title, on the back of the medal. */
  title: string;
  /** Short date, on the back under "Awarded to". */
  date: string;
  /** CSS font-family stacks (the DS display and body faces, read from the page). */
  fonts: { display: string; body: string };
  /** Vertical ribbon length, in medal units (the medal is about 2 across). */
  ribbonLength: number;
  /** Half the distance between the two ribbon ends at the top. */
  spread: number;
  /** Longest reach of the medal from its centre, in units. */
  size: number;
  /** Half the width of what the camera shows, in units. Larger = smaller medal. */
  frameHalf: number;
  /** A warm spotlight from the rail. */
  lamp: boolean;
  reducedMotion: boolean;
  /** A tap (no drag) on the medal. */
  onOpen?: () => void;
};

export type MedalView = {
  /** Repaint lettering after the page fonts load. */
  repaint: () => void;
  dispose: () => void;
};

const GRAVITY = 30;
const FACE_Z = 0.116;
const CLASP_DROP = 0.08;
const MEDALLION = 0.62;
const DT = 1 / 120;

type Stripe = [string, number];
const RIBBONS: Record<string, { stripes: Stripe[]; text?: string }> = {
  brand: { stripes: [["#031654", 0.085], ["#ffb641", 0.035], ["#0871ed", 0.2], ["#2f8dff", 0.18]], text: "rgba(255,255,255,0.6)" },
  night: { stripes: [["#02060e", 0.085], ["#ffb641", 0.035], ["#0c1a26", 0.2], ["#132535", 0.18]], text: "rgba(255,196,43,0.85)" },
  gold: { stripes: [["#a35f00", 0.085], ["#0658d7", 0.035], ["#f2a93b", 0.2], ["#ffc42b", 0.18]], text: "rgba(42,26,0,0.6)" },
};

const METALS: Record<string, { color: number; rough: number; face: [string, string]; hi: string; lo: string }> = {
  gold: { color: 0xffd36a, rough: 0.2, face: ["#fde9a6", "#d9a23c"], hi: "#fff3c9", lo: "#7a4e10" },
  silver: { color: 0xf2f6fb, rough: 0.16, face: ["#ffffff", "#b4c0cf"], hi: "#ffffff", lo: "#56616f" },
  bronze: { color: 0xf3ab6c, rough: 0.24, face: ["#ffd8b0", "#c27c42"], hi: "#ffe9d2", lo: "#6e3a12" },
};

// The Sunburst: 16 rays, long and short in turn. Half-width 1.16, loop at the top ray's tip.
const SUN = { half: 1.16, loopY: 1.17, bottom: 1.16 };
function sunPoints(): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 32; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 16;
    const r = i % 2 ? 0.72 : i % 4 === 0 ? 1.16 : 0.96;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return pts;
}
function polyShape(pts: [number, number][], k: number) {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x * k, y * k) : s.moveTo(x * k, y * k)));
  s.closePath();
  return s;
}
function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// ---- Lettering --------------------------------------------------------------------------------------

function arcText(g: CanvasRenderingContext2D, text: string, r: number, font: string, spacing: number, top: boolean) {
  g.font = font;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const chars = Array.from(text);
  const ws = chars.map((ch) => g.measureText(ch).width);
  const total = ws.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let a = -total / 2;
  chars.forEach((ch, i) => {
    const ang = (a + ws[i] / 2) / r;
    g.save();
    g.translate(512, 512);
    if (top) {
      g.rotate(ang);
      g.fillText(ch, 0, -r);
    } else {
      g.rotate(-ang);
      g.fillText(ch, 0, r);
    }
    g.restore();
    a += ws[i] + spacing;
  });
}
function spacedText(g: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, spacing: number) {
  g.font = font;
  g.textAlign = "left";
  g.textBaseline = "middle";
  const chars = Array.from(text);
  const ws = chars.map((ch) => g.measureText(ch).width);
  let cx = x - (ws.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1)) / 2;
  chars.forEach((ch, i) => {
    g.fillText(ch, cx, y);
    cx += ws[i] + spacing;
  });
}
function fitFont(g: CanvasRenderingContext2D, text: string, pattern: (size: number) => string, size: number, maxWidth: number, spacing: number) {
  while (size > 36) {
    g.font = pattern(size);
    const w = Array.from(text).reduce((a, ch) => a + g.measureText(ch).width + spacing, 0);
    if (w <= maxWidth) break;
    size -= 4;
  }
  return pattern(size);
}
function splitLines(g: CanvasRenderingContext2D, text: string, maxW: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function star2d(g: CanvasRenderingContext2D, x: number, y: number, R: number) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? R * 0.45 : R;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    g.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  g.closePath();
  g.fill();
}

/** Paints one face (1024 units) as colour or as a height map for bump. */
function paintFace(g: CanvasRenderingContext2D, size: number, side: "front" | "back", o: MedalOptions, color: boolean) {
  const C = 512;
  const M = METALS[o.medal.metal] ?? METALS.gold;
  const display = (s: number) => `italic 800 ${s}px ${o.fonts.display}`;
  const body = (s: number) => `800 ${s}px ${o.fonts.body}`;
  g.save();
  g.setTransform(size / 1024, 0, 0, size / 1024, 0, 0);
  g.filter = "none";
  if (color) {
    const bg = g.createRadialGradient(C, C * 0.75, 40, C, C, 560);
    bg.addColorStop(0, M.face[0]);
    bg.addColorStop(1, M.face[1]);
    g.fillStyle = bg;
    g.fillRect(0, 0, 1024, 1024);
    g.lineWidth = 1;
    for (let rr = 6; rr < 520; rr += 4) {
      g.strokeStyle = `rgba(255,255,255,${0.04 + (0.05 * ((rr * 7919) % 13)) / 13})`;
      g.beginPath();
      g.arc(C, C, rr, 0, Math.PI * 2);
      g.stroke();
    }
  } else {
    g.fillStyle = "#808080";
    g.fillRect(0, 0, 1024, 1024);
  }
  const raised = (draw: () => void) => {
    if (color) {
      g.save();
      g.translate(3, 5);
      g.globalAlpha = 0.32;
      g.fillStyle = g.strokeStyle = M.lo;
      draw();
      g.restore();
      g.fillStyle = g.strokeStyle = M.hi;
      draw();
    } else {
      g.filter = `blur(${(1.6 * size) / 1024}px)`;
      g.fillStyle = g.strokeStyle = "#ffffff";
      draw();
      g.filter = "none";
    }
  };
  raised(() => {
    for (let k = 0; k < 64; k++) {
      const a = (k * Math.PI) / 32;
      g.beginPath();
      g.arc(C + 470 * Math.cos(a), C + 470 * Math.sin(a), 8, 0, Math.PI * 2);
      g.fill();
    }
  });
  if (side === "front") {
    const top = o.medal.top.toUpperCase();
    const bottom = o.medal.bottom.toUpperCase();
    const topFont = fitFont(g, top, display, 112, 368 * 2.6, 4);
    const bottomFont = fitFont(g, bottom, body, 60, 392 * 2.4, 10);
    raised(() => arcText(g, top, 368, topFont, 4, true));
    raised(() => arcText(g, bottom, 392, bottomFont, 10, false));
    raised(() => {
      star2d(g, C - 388, C, 26);
      star2d(g, C + 388, C, 26);
    });
    raised(() => {
      g.lineWidth = 6;
      g.beginPath();
      g.arc(C, C, 224, 0, Math.PI * 2);
      g.stroke();
    });
  } else {
    raised(() => {
      for (const dir of [-1, 1]) {
        for (let j = 0; j < 10; j++) {
          const th = Math.PI / 2 + dir * (0.3 + j * 0.11);
          const r = 405 + (j % 2 ? 16 : -16);
          g.save();
          g.translate(C + r * Math.cos(th), C + r * Math.sin(th));
          g.rotate(th + (dir * Math.PI) / 2 + (j % 2 ? 0.5 : -0.5) * dir);
          g.beginPath();
          g.ellipse(0, 0, 30, 11, 0, 0, Math.PI * 2);
          g.fill();
          g.restore();
        }
        g.lineWidth = 5;
        g.beginPath();
        g.arc(C, C, 405, Math.PI / 2 + dir * 0.24, Math.PI / 2 + dir * 1.36, dir < 0);
        g.stroke();
      }
    });
    raised(() => spacedText(g, "AWARDED TO", C, 300, body(40), 9));
    let titleSize = 140;
    g.font = display(titleSize);
    let lines = splitLines(g, o.title.toUpperCase(), 600);
    while ((lines.length > 2 || lines.some((l) => g.measureText(l).width > 620)) && titleSize > 60) {
      titleSize -= 6;
      g.font = display(titleSize);
      lines = splitLines(g, o.title.toUpperCase(), 600);
    }
    const lh = titleSize * 0.92;
    const y0 = 465 - ((lines.length - 1) * lh) / 2;
    raised(() => {
      g.font = display(titleSize);
      g.textAlign = "center";
      g.textBaseline = "middle";
      lines.forEach((l, i) => g.fillText(l, C, y0 + i * lh));
    });
    raised(() => g.fillRect(C - 110, 600, 220, 6));
    raised(() => spacedText(g, o.date.toUpperCase(), C, 680, body(44), 8));
  }
  g.restore();
}

function paintRibbon(g: CanvasRenderingContext2D, name: string, font: string) {
  const W = 256;
  const H = 1024;
  const spec = RIBBONS[name] ?? RIBBONS.brand;
  let x = 0;
  g.fillStyle = spec.stripes[spec.stripes.length - 1][0];
  g.fillRect(0, 0, W, H);
  for (const [c, f] of spec.stripes) {
    const w = f * W;
    g.fillStyle = c;
    g.fillRect(x, 0, w + 0.5, H);
    g.fillRect(W - x - w - 0.5, 0, w + 0.5, H);
    x += w;
  }
  for (let y = 0; y < H; y += 3) {
    g.fillStyle = "rgba(0,0,0,0.05)";
    g.fillRect(0, y, W, 1);
  }
  if (spec.text) {
    g.save();
    g.translate(W / 2, 0);
    g.rotate(Math.PI / 2);
    g.fillStyle = spec.text;
    g.font = `800 40px ${font}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (let y = 128; y < H; y += 256) g.fillText("PLAYINWEB", y, 0);
    g.restore();
  }
}

// ---- Ribbon strip -----------------------------------------------------------------------------------

const RIB_N = 70;
const RIB_W = 0.34;
function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function ribbonMesh(material: THREE.Material) {
  const geo = new THREE.BufferGeometry();
  const idx: number[] = [];
  for (let i = 0; i < RIB_N; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((RIB_N + 1) * 6), 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array((RIB_N + 1) * 4), 2));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  return mesh;
}
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const side = new THREE.Vector3();
function writeRibbon(mesh: THREE.Mesh, curve: THREE.CatmullRomCurve3, twist: number) {
  const pos = (mesh.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
  const uv = (mesh.geometry.attributes.uv as THREE.BufferAttribute).array as Float32Array;
  let s = 0;
  let prev: THREE.Vector3 | null = null;
  for (let i = 0; i <= RIB_N; i++) {
    const t = i / RIB_N;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    if (prev) s += p.distanceTo(prev);
    prev = p;
    side.crossVectors(tan, Z_AXIS).normalize().applyAxisAngle(tan, twist * Math.sin(Math.PI * t));
    const w = (RIB_W * (1 - 0.42 * smooth(0.8, 1, t))) / 2;
    const j = i * 6;
    pos[j] = p.x - side.x * w;
    pos[j + 1] = p.y - side.y * w;
    pos[j + 2] = p.z - side.z * w;
    pos[j + 3] = p.x + side.x * w;
    pos[j + 4] = p.y + side.y * w;
    pos[j + 5] = p.z + side.z * w;
    const v = s / (RIB_W * 4);
    const q = i * 4;
    uv[q] = 1;
    uv[q + 1] = v;
    uv[q + 2] = 0;
    uv[q + 3] = v;
  }
  mesh.geometry.attributes.position.needsUpdate = true;
  mesh.geometry.attributes.uv.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}

function studio(renderer: THREE.WebGLRenderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x16243a);
  const box = (w: number, h: number, hex: number, power: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(power), side: THREE.DoubleSide }),
    );
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  box(7, 2.4, 0xffffff, 6, 0, 5, 3);
  box(2.4, 6, 0xfff3dc, 3.6, -5, 1, 2.5);
  box(2.2, 6, 0xbfdcff, 3, 5, 0, 2);
  box(9, 1.4, 0xffffff, 2, 0, -4, 4);
  box(3, 3, 0xffe2a8, 1.8, 0, 1, -6);
  const env = pm.fromScene(scene, 0.035).texture;
  pm.dispose();
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
  return env;
}

// ---- The medal --------------------------------------------------------------------------------------

export function createMedal(canvas: HTMLCanvasElement, o: MedalOptions): MedalView {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  const scene = new THREE.Scene();
  scene.environment = studio(renderer);
  const key = new THREE.DirectionalLight(0xffffff, o.lamp ? 1.0 : 1.8);
  key.position.set(-2, 4, 5);
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };

  // Textures painted on canvases: the two faces (colour and bump each) and the ribbon.
  const S = 1024;
  const canvases = Array.from({ length: 4 }, () => Object.assign(document.createElement("canvas"), { width: S, height: S }));
  const ribbonCanvas = Object.assign(document.createElement("canvas"), { width: 256, height: 1024 });
  const tex = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = keep(new THREE.CanvasTexture(c));
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    return t;
  };
  const [frontColor, frontBump, backColor, backBump] = canvases.map((c, i) => tex(c, i % 2 === 0));
  const ribbonTex = tex(ribbonCanvas, true);
  ribbonTex.wrapT = THREE.RepeatWrapping;
  ribbonTex.flipY = false;
  const paint = () => {
    const ctx = (c: HTMLCanvasElement) => c.getContext("2d");
    const [fc, fh, bc, bh] = canvases.map(ctx);
    const rc = ctx(ribbonCanvas);
    if (!fc || !fh || !bc || !bh || !rc) return;
    paintFace(fc, S, "front", o, true);
    paintFace(fh, S, "front", o, false);
    paintFace(bc, S, "back", o, true);
    paintFace(bh, S, "back", o, false);
    paintRibbon(rc, o.medal.ribbon, o.fonts.body);
    for (const t of [frontColor, frontBump, backColor, backBump, ribbonTex]) t.needsUpdate = true;
  };
  paint();

  const M = METALS[o.medal.metal] ?? METALS.gold;
  const gold = keep(new THREE.MeshStandardMaterial({ color: M.color, metalness: 1, roughness: M.rough, side: THREE.DoubleSide }));
  const polish = keep(
    new THREE.MeshStandardMaterial({ color: new THREE.Color(M.color).lerp(new THREE.Color(0xffffff), 0.25), metalness: 1, roughness: 0.1 }),
  );
  const enamel = keep(
    new THREE.MeshPhysicalMaterial({ color: new THREE.Color(o.medal.enamel), metalness: 0, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.04 }),
  );
  const faceMat = (map: THREE.Texture, bump: THREE.Texture) =>
    keep(new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.6, metalness: 1, roughness: 0.3 }));
  const frontMat = faceMat(frontColor, frontBump);
  const backMat = faceMat(backColor, backBump);
  const ribbonMat = keep(
    new THREE.MeshPhysicalMaterial({ map: ribbonTex, roughness: 0.5, metalness: 0, sheen: 1, sheenRoughness: 0.3, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide }),
  );

  // hang: placed under the clasp each frame. body: the medal, offset so its ring tops out at hang's origin.
  const scale = o.size / Math.max(SUN.half, SUN.bottom);
  const hang = new THREE.Group();
  hang.scale.setScalar(scale);
  scene.add(hang);
  const body = new THREE.Group();
  body.position.y = -(SUN.loopY + 0.2);
  hang.add(body);
  const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, z = 0) => {
    keep(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = z;
    parent.add(mesh);
    return mesh;
  };

  const plate = new THREE.ExtrudeGeometry(polyShape(sunPoints(), 1), {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.03,
    bevelSegments: 3,
    curveSegments: 24,
  });
  plate.translate(0, 0, -0.06);
  add(body, plate, gold);
  const inlay = new THREE.ExtrudeGeometry(polyShape(sunPoints(), 0.84), { depth: 0.014, bevelEnabled: false });
  add(body, inlay, enamel, 0.09);
  add(body, inlay, enamel, -0.104);

  const medallion = new THREE.Group();
  medallion.scale.set(MEDALLION, MEDALLION, 1);
  body.add(medallion);
  const profile = [
    [0.775, -FACE_Z], [0.8, -0.13], [0.83, -0.17], [0.955, -0.18], [0.995, -0.15], [1.0, 0],
    [0.995, 0.15], [0.955, 0.18], [0.83, 0.17], [0.8, 0.13], [0.775, FACE_Z],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const rim = new THREE.LatheGeometry(profile, 112);
  rim.rotateX(Math.PI / 2);
  add(medallion, rim, gold);
  add(medallion, new THREE.CircleGeometry(0.78, 112), frontMat, FACE_Z);
  const backFace = new THREE.CircleGeometry(0.78, 112);
  backFace.rotateY(Math.PI);
  add(medallion, backFace, backMat, -FACE_Z);
  const boss = new THREE.LatheGeometry(
    [[0.3, 0], [0.29, 0.022], [0.24, 0.038], [0.12, 0.047], [0, 0.049]].map(([x, y]) => new THREE.Vector2(x, y)),
    64,
  );
  boss.rotateX(Math.PI / 2);
  add(medallion, boss, gold, FACE_Z);
  const tri = new THREE.Shape();
  tri.moveTo(-0.085, 0.12);
  tri.lineTo(0.135, 0);
  tri.lineTo(-0.085, -0.12);
  tri.closePath();
  add(
    medallion,
    new THREE.ExtrudeGeometry(tri, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.012, bevelSegments: 3 }),
    polish,
    FACE_Z + 0.044,
  );
  add(body, new THREE.TorusGeometry(0.075, 0.03, 16, 40), gold).position.y = SUN.loopY;
  const ringGeo = new THREE.TorusGeometry(0.11, 0.026, 16, 48);
  ringGeo.rotateY(Math.PI / 2);
  add(body, ringGeo, gold).position.y = SUN.loopY + 0.09;

  // An invisible disc to hit-test the pointer against.
  const hitMat = keep(new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
  const hit = add(hang, new THREE.CircleGeometry(1.2, 32), hitMat);
  hit.position.y = body.position.y;

  const claspGeo = keep(
    new THREE.ExtrudeGeometry(roundedRect(0.44, 0.16, 0.05), {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.018,
      bevelSegments: 3,
      curveSegments: 8,
    }),
  );
  claspGeo.center();
  const clasp = new THREE.Mesh(claspGeo, gold);
  scene.add(clasp);
  const ribbons = [ribbonMesh(ribbonMat), ribbonMesh(ribbonMat)];
  for (const r of ribbons) {
    keep(r.geometry);
    scene.add(r);
  }

  // The lamp in the rail.
  if (o.lamp) {
    const lamp = new THREE.SpotLight(0xffe7b8, 42, 0, 0.85, 0.9, 2);
    lamp.position.set(0, 0.35, 2.2);
    lamp.target.position.set(0, -2.6, 0);
    scene.add(lamp, lamp.target);
  }

  // ---- Physics: the clasp hangs on two ribbons of fixed length; the medal is a pendulum under it.
  const drop = Math.max(0.3, o.ribbonLength);
  const anchors = [new THREE.Vector3(-o.spread, 0, -0.03), new THREE.Vector3(o.spread, 0, -0.03)];
  const rest = new THREE.Vector3(0, -drop, 0);
  const lens = anchors.map((a) => a.distanceTo(rest));
  const P = { pos: rest.clone(), prev: rest.clone(), v: new THREE.Vector3(), lastV: new THREE.Vector3(), acc: new THREE.Vector3() };
  const swing = { z: 0, zv: 0, x: 0, xv: 0 };
  const look = { yaw: 0, yawT: 0, hoverYaw: 0, pitch: 0, pitchT: 0 };
  if (!o.reducedMotion) {
    P.pos.add(new THREE.Vector3(0.15, 0.06, 0.2));
    P.prev.copy(P.pos);
    swing.z = 0.14;
  }
  const grab = { on: false, target: new THREE.Vector3(), offset: new THREE.Vector3(), moved: 0, lastX: 0, lastY: 0 };
  const tmp = new THREE.Vector3();
  const force = new THREE.Vector3();

  function step(t: number) {
    force.set(0, -GRAVITY, 0);
    if (!o.reducedMotion) {
      force.x += 0.5 * (1.6 * Math.sin(t * 0.9) + 0.7 * Math.sin(t * 2.3));
      force.z += 0.5 * 1.8 * Math.sin(t * 0.7 + 1);
    }
    if (grab.on) force.add(tmp.copy(grab.target).add(grab.offset).sub(P.pos).multiplyScalar(140));
    tmp.copy(P.pos).sub(P.prev).multiplyScalar(grab.on ? 0.9 : 0.988);
    P.prev.copy(P.pos);
    P.pos.add(tmp).addScaledVector(force, DT * DT);
    for (let it = 0; it < 4; it++) {
      anchors.forEach((A, a) => {
        const d = tmp.copy(P.pos).sub(A);
        const l = d.length();
        if (l > lens[a]) P.pos.copy(A).addScaledVector(d, lens[a] / l);
      });
      if (P.pos.y > -0.2) P.pos.y = -0.2;
    }
    P.v.copy(P.pos).sub(P.prev).divideScalar(DT);
    P.acc.lerp(tmp.copy(P.v).sub(P.lastV).divideScalar(DT), 0.15);
    P.lastV.copy(P.v);
    const arm = 1.25;
    const ax = Math.max(-60, Math.min(60, P.acc.x));
    const az = Math.max(-60, Math.min(60, P.acc.z));
    swing.zv += ((-GRAVITY * Math.sin(swing.z) - ax * Math.cos(swing.z)) / arm - 2.2 * swing.zv) * DT;
    swing.z += swing.zv * DT;
    swing.xv += ((-GRAVITY * Math.sin(swing.x) + az * Math.cos(swing.x)) / arm - 2.2 * swing.xv) * DT;
    swing.x += swing.xv * DT;
  }

  const curve = new THREE.CatmullRomCurve3(Array.from({ length: 5 }, () => new THREE.Vector3()), false, "centripetal");
  curve.arcLengthDivisions = 80;
  const dL = new THREE.Vector3();
  const dR = new THREE.Vector3();
  const end = new THREE.Vector3();
  const exit = new THREE.Vector3();
  const mid = new THREE.Vector3();
  function pose() {
    dL.copy(anchors[0]).sub(P.pos).normalize();
    dR.copy(anchors[1]).sub(P.pos).normalize();
    const b = dL.add(dR).normalize();
    const ang = Math.atan2(-b.x, b.y);
    const co = Math.cos(ang);
    const si = Math.sin(ang);
    clasp.position.copy(P.pos);
    clasp.rotation.set(0, 0, ang);
    hang.position.set(P.pos.x + CLASP_DROP * si, P.pos.y - CLASP_DROP * co, P.pos.z);
    look.yaw += (look.yawT + look.hoverYaw - look.yaw) * (o.reducedMotion ? 0.3 : 0.1);
    look.pitch += (look.pitchT - look.pitch) * 0.1;
    hang.rotation.set(swing.x + look.pitch, look.yaw, swing.z);
    anchors.forEach((A, r) => {
      const dir = r ? 1 : -1;
      end.set(P.pos.x + dir * 0.07 * co, P.pos.y + dir * 0.07 * si + 0.02, P.pos.z - dir * 0.012);
      exit.set(A.x, A.y - Math.min(0.3, drop * 0.25), A.z);
      const slack = Math.max(0, lens[r] - A.distanceTo(P.pos));
      mid.copy(exit).lerp(end, 0.5);
      mid.x += dir * (0.03 + slack * 0.7);
      mid.z -= 0.02 + slack * 0.2;
      const pts = curve.points;
      pts[0].set(A.x, A.y + 0.6, A.z);
      pts[1].copy(A);
      pts[2].copy(exit);
      pts[3].copy(mid);
      pts[4].copy(end);
      curve.updateArcLengths();
      writeRibbon(ribbons[r], curve, dir * 0.22);
    });
  }

  function fit() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const H = drop + CLASP_DROP + (SUN.loopY + 0.2 + SUN.bottom) * scale + 0.15;
    const d = Math.max(H / 2 / tan, o.frameHalf / (tan * camera.aspect));
    const cy = -tan * d + 0.02;
    camera.position.set(0, cy, d);
    camera.lookAt(0, cy, 0);
    camera.updateProjectionMatrix();
  }
  fit();

  // ---- Pointer: brush on hover, drag to pull, tap to open.
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const ndc = new THREE.Vector2();
  const hitPoint = new THREE.Vector3();
  const ptr = { x: 0, y: 0, t: 0, ok: false };
  const setRay = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  const overMedal = (e: PointerEvent) => {
    setRay(e);
    return ray.intersectObject(hit, false).length > 0;
  };
  const toWorld = (e: PointerEvent) => {
    setRay(e);
    return ray.ray.intersectPlane(plane, hitPoint);
  };
  function brush(e: PointerEvent, over: boolean) {
    const w = toWorld(e);
    const now = performance.now();
    if (!w) {
      ptr.ok = false;
      return;
    }
    if (over && ptr.ok && !o.reducedMotion && now - ptr.t < 120) {
      const dx = Math.max(-0.3, Math.min(0.3, w.x - ptr.x));
      const dy = Math.max(-0.3, Math.min(0.3, w.y - ptr.y));
      P.prev.x -= dx * 0.07;
      P.prev.y -= dy * 0.02;
      swing.zv = Math.max(-6, Math.min(6, swing.zv + (dx * 9) / scale));
      swing.xv = Math.max(-4, Math.min(4, swing.xv - (dy * 3) / scale));
    }
    ptr.x = w.x;
    ptr.y = w.y;
    ptr.t = now;
    ptr.ok = true;
  }
  function onMove(e: PointerEvent) {
    if (grab.on) {
      grab.moved += Math.abs(e.clientX - grab.lastX) + Math.abs(e.clientY - grab.lastY);
      grab.lastX = e.clientX;
      grab.lastY = e.clientY;
      const w = toWorld(e);
      if (w) grab.target.copy(w);
      return;
    }
    const over = overMedal(e);
    canvas.style.cursor = over ? "pointer" : "default";
    brush(e, over);
    const r = canvas.getBoundingClientRect();
    look.hoverYaw = over ? (((e.clientX - r.left) / r.width) * 2 - 1) * 0.3 : 0;
    look.pitchT = over ? (((e.clientY - r.top) / r.height) * 2 - 1) * 0.1 : 0;
  }
  function onDown(e: PointerEvent) {
    if (!overMedal(e)) return;
    const w = toWorld(e);
    if (!w) return;
    grab.on = true;
    grab.moved = 0;
    grab.lastX = e.clientX;
    grab.lastY = e.clientY;
    grab.target.copy(w);
    grab.offset.copy(P.pos).sub(w);
    canvas.style.cursor = "grabbing";
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* the pointer may already be gone */
    }
  }
  function onUp() {
    if (!grab.on) return;
    grab.on = false;
    canvas.style.cursor = "pointer";
    if (grab.moved < 6) o.onOpen?.();
  }
  function onLeave() {
    ptr.ok = false;
    if (grab.on) return;
    look.hoverYaw = 0;
    look.pitchT = 0;
  }
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.style.touchAction = "pan-y";

  const ro = new ResizeObserver(fit);
  ro.observe(canvas);
  let visible = true;
  const io = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
  });
  io.observe(canvas);

  let raf = 0;
  const t0 = performance.now();
  let last = t0;
  let acc = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) {
      last = now;
      return;
    }
    acc += Math.min(0.05, (now - last) / 1000);
    last = now;
    if (o.reducedMotion && !grab.on) {
      P.pos.copy(rest);
      P.prev.copy(rest);
      swing.z = swing.zv = swing.x = swing.xv = 0;
      acc = 0;
    } else {
      while (acc >= DT) {
        step((now - t0) / 1000);
        acc -= DT;
      }
    }
    pose();
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return {
    repaint: paint,
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      for (const d of disposables) d.dispose();
      scene.environment?.dispose();
      renderer.dispose();
    },
  };
}
