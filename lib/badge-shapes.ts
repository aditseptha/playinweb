// The 3D badge shapes (#30), as flat polygons. components/badges/badge-engine.ts extrudes them
// with three.js; components/badges/BadgeSvg.tsx draws them flat. No three.js in here, so the
// shapes are cheap to import and easy to test.
//
// A badge is a list of parts. The first part is the main frame with its holes. Thinner parts sit
// behind it (rings, ribbons, stems) and thicker parts sit in front (gems, bridges). The level
// stripes are clipped to a convex region inside the main hole.
import type { BadgeId } from "./badges.ts";

export type Point = readonly [number, number];
export type Polygon = readonly Point[];

export type BadgePart = {
  outer: Polygon;
  holes: readonly Polygon[];
  /** Extrusion depth before the bevel. 0.18 is the main frame. */
  depth: number;
  bevel: number;
};

export type StripeSpec = {
  /** Convex region the stripes are clipped to. */
  region: Polygon;
  width?: number;
  gap?: number;
  /** Degrees from the x axis. */
  angle?: number;
};

export type BadgeShape = { parts: readonly BadgePart[]; stripe: StripeSpec };

// Polygon helpers ------------------------------------------------------------------------------

export function signedArea(p: Polygon): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** The same polygon, counter-clockwise. */
export function ccw(p: Polygon): Polygon {
  return signedArea(p) < 0 ? [...p].reverse() : p;
}

function lineX(p1: Point, v1: Point, p2: Point, v2: Point): Point {
  const den = v1[0] * v2[1] - v1[1] * v2[0];
  if (Math.abs(den) < 1e-9) return [p2[0], p2[1]];
  const t = ((p2[0] - p1[0]) * v2[1] - (p2[1] - p1[1]) * v2[0]) / den;
  return [p1[0] + v1[0] * t, p1[1] + v1[1] * t];
}

/** Keep the part of a polygon on the left of the line through `a` along `e`. */
function clipHalfPlane(poly: readonly Point[], a: Point, e: Point): Point[] {
  const inside = (q: Point) => e[0] * (q[1] - a[1]) - e[1] * (q[0] - a[0]) >= 0;
  const out: Point[] = [];
  for (let j = 0; j < poly.length; j++) {
    const cur = poly[j];
    const prev = poly[(j - 1 + poly.length) % poly.length];
    const hit = () => lineX(prev, [cur[0] - prev[0], cur[1] - prev[1]], a, e);
    if (inside(cur)) {
      if (!inside(prev)) out.push(hit());
      out.push(cur);
    } else if (inside(prev)) out.push(hit());
  }
  return out;
}

/**
 * Move every edge of a convex polygon inward by d. Clipping against the shifted edges, rather
 * than intersecting neighbours, stays correct when d is longer than the short edges of a curve.
 */
export function inset(poly: Polygon, d: number): Polygon {
  const p = ccw(poly);
  let out: Point[] = [...p];
  for (let i = 0; i < p.length && out.length; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    const e: Point = [b[0] - a[0], b[1] - a[1]];
    const len = Math.hypot(e[0], e[1]);
    if (len < 1e-12) continue;
    out = clipHalfPlane(out, [a[0] - (e[1] / len) * d, a[1] + (e[0] / len) * d], e);
  }
  return out;
}

/** Sutherland–Hodgman: clip a polygon against a convex region. */
export function clip(subject: Polygon, region: Polygon): Polygon {
  const r = ccw(region);
  let out: Point[] = [...subject];
  for (let i = 0; i < r.length && out.length; i++) {
    const a = r[i];
    const b = r[(i + 1) % r.length];
    out = clipHalfPlane(out, a, [b[0] - a[0], b[1] - a[1]]);
  }
  return out;
}

export function isConvex(p: Polygon): boolean {
  const q = ccw(p);
  for (let i = 0; i < q.length; i++) {
    const a = q[i];
    const b = q[(i + 1) % q.length];
    const c = q[(i + 2) % q.length];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (cross < -1e-9) return false;
  }
  return true;
}

/** True when the point lies inside the polygon (even-odd rule). */
export function contains(p: Polygon, [x, y]: Point): boolean {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i];
    const [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The level stripes for a badge: `count` diagonal bars clipped to its stripe region. */
export function stripes(spec: StripeSpec, count: number): Polygon[] {
  const { region, angle = 62, width = 0.16, gap = 0.27 } = spec;
  const r = inset(region, 0.075);
  const t = (angle * Math.PI) / 180;
  const u: Point = [Math.cos(t), Math.sin(t)];
  const n: Point = [-Math.sin(t), Math.cos(t)];
  const cx = r.reduce((s, p) => s + p[0], 0) / r.length;
  const cy = r.reduce((s, p) => s + p[1], 0) / r.length;
  const out: Polygon[] = [];
  for (let i = 0; i < count; i++) {
    const off = (i - (count - 1) / 2) * gap;
    const L = 3;
    const w = width / 2;
    const c: Point = [cx + n[0] * off, cy + n[1] * off];
    const band: Polygon = [
      [c[0] - u[0] * L - n[0] * w, c[1] - u[1] * L - n[1] * w],
      [c[0] + u[0] * L - n[0] * w, c[1] + u[1] * L - n[1] * w],
      [c[0] + u[0] * L + n[0] * w, c[1] + u[1] * L + n[1] * w],
      [c[0] - u[0] * L + n[0] * w, c[1] - u[1] * L + n[1] * w],
    ];
    const piece = clip(band, r);
    if (piece.length >= 3) out.push(piece);
  }
  return out;
}

// Shape builders ------------------------------------------------------------------------------

const D = Math.PI / 180;

const circle = (r: number, n = 48, cx = 0, cy = 0, a0 = 0): Polygon =>
  Array.from({ length: n }, (_, i) => {
    const a = a0 + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Point;
  });

const rect = (x0: number, y0: number, x1: number, y1: number): Polygon => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

const arcBand = (r0: number, r1: number, a0: number, a1: number, cx = 0, cy = 0, n = 48): Polygon => {
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]);
  }
  for (let i = n; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0]);
  }
  return out;
};

const halfDisc = (r: number, cx: number, cy: number, n = 20): Polygon =>
  Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos((Math.PI * i) / n) * r, cy + Math.sin((Math.PI * i) / n) * r] as Point);

const gear = (ro: number, ri: number, teeth: number, cx = 0, cy = 0): Polygon => {
  const out: Point[] = [];
  const step = (Math.PI * 2) / teeth;
  for (let k = 0; k < teeth; k++) {
    const a = k * step + Math.PI / 2;
    for (const [r, f] of [
      [ro, 0.08],
      [ro, 0.42],
      [ri, 0.58],
      [ri, 0.92],
    ]) {
      out.push([cx + Math.cos(a + f * step) * r, cy + Math.sin(a + f * step) * r]);
    }
  }
  return out;
};

const rhombus = (cx: number, cy: number, len: number, w: number, ang = 0): Polygon => {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return (
    [
      [len / 2, 0],
      [0, w / 2],
      [-len / 2, 0],
      [0, -w / 2],
    ] as const
  ).map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c] as Point);
};

const mirrorX = (pts: Polygon): Polygon => pts.map(([x, y]) => [-x, y] as Point).reverse();

const plus = (cx: number, cy: number, arm: number, hw: number): Polygon =>
  (
    [
      [hw, arm], [hw, hw], [arm, hw], [arm, -hw], [hw, -hw], [hw, -arm],
      [-hw, -arm], [-hw, -hw], [-arm, -hw], [-arm, hw], [-hw, hw], [-hw, arm],
    ] as const
  ).map(([x, y]) => [cx + x, cy + y] as Point);

const ray = (a: number, r0: number, r1: number, w0: number, w1: number, cx: number, cy: number): Polygon => {
  const u = [Math.cos(a), Math.sin(a)];
  const n = [-u[1], u[0]];
  const at = (r: number, w: number): Point => [cx + u[0] * r + n[0] * w, cy + u[1] * r + n[1] * w];
  return [at(r0, -w0), at(r1, -w1), at(r1, w1), at(r0, w0)];
};

/** A polyline with thickness 2h and mitred joins, as one polygon. */
function thickLine(pts: Polygon, h: number): Polygon {
  const nrm = (a: Point, b: Point): Point => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy);
    return [-dy / l, dx / l];
  };
  const left: Point[] = [];
  const right: Point[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    let off: Point;
    if (i === 0 || i === n - 1) {
      const [nx, ny] = i === 0 ? nrm(pts[0], pts[1]) : nrm(pts[n - 2], pts[n - 1]);
      off = [nx * h, ny * h];
    } else {
      const n1 = nrm(pts[i - 1], pts[i]);
      const n2 = nrm(pts[i], pts[i + 1]);
      const mx = n1[0] + n2[0];
      const my = n1[1] + n2[1];
      const ml = Math.hypot(mx, my);
      const k = h / ((mx / ml) * n1[0] + (my / ml) * n1[1]);
      off = [(mx / ml) * k, (my / ml) * k];
    }
    left.push([pts[i][0] + off[0], pts[i][1] + off[1]]);
    right.push([pts[i][0] - off[0], pts[i][1] - off[1]]);
  }
  return [...left, ...right.reverse()];
}

const HEART: Polygon = [
  [0, 0.42], [-0.3, 0.8], [-0.66, 0.8], [-0.98, 0.46], [-0.98, 0.08],
  [0, -0.95], [0.98, 0.08], [0.98, 0.46], [0.66, 0.8], [0.3, 0.8],
];
const heart = (s: number, cx: number, cy: number): Polygon => HEART.map(([x, y]) => [cx + x * s, cy + (y + 0.075) * s] as Point);

const part = (outer: Polygon, o: Partial<Omit<BadgePart, "outer">> = {}): BadgePart => ({
  outer,
  holes: o.holes ?? [],
  depth: o.depth ?? 0.18,
  bevel: o.bevel ?? 0.07,
});

// The badges ---------------------------------------------------------------------------------

function explorer(): BadgeShape {
  const hole: Polygon = [[0, 0.56], [0.31, 0], [0, -0.56], [-0.31, 0]];
  return {
    parts: [
      part([[0, 1.0], [0.56, 0], [0, -1.0], [-0.56, 0]], { holes: [hole] }),
      part(circle(0.8, 72), { holes: [circle(0.68, 72)], depth: 0.07, bevel: 0.035 }),
    ],
    stripe: { region: hole, width: 0.11, gap: 0.18 },
  };
}

function talk(): BadgeShape {
  const hole: Polygon = [[-0.55, 0.56], [0.55, 0.56], [0.71, 0.4], [0.71, -0.15], [0.55, -0.31], [-0.55, -0.31], [-0.71, -0.15], [-0.71, 0.4]];
  return {
    parts: [
      part(
        [[-0.73, 0.8], [0.73, 0.8], [0.95, 0.58], [0.95, -0.33], [0.73, -0.55], [-0.15, -0.55], [-0.75, -1.0], [-0.62, -0.55], [-0.73, -0.55], [-0.95, -0.33], [-0.95, 0.58]],
        { holes: [hole] },
      ),
    ],
    stripe: { region: hole },
  };
}

function fan(): BadgeShape {
  const tf = ([x, y]: Point): Point => [x * 0.58, (y + 0.075) * 0.58 - 0.04];
  return {
    parts: [part(heart(1, 0, 0), { holes: [HEART.map(tf)] })],
    stripe: { region: ([[-0.98, 0.42], [-0.98, 0.08], [0, -0.95], [0.98, 0.08], [0.98, 0.42]] as Polygon).map(tf) },
  };
}

function supporter(): BadgeShape {
  const ribbon: Polygon = [[-0.42, -0.42], [-0.14, -0.55], [-0.3, -1.0], [-0.43, -0.86], [-0.6, -0.96]];
  return {
    parts: [
      part(gear(0.86, 0.77, 18, 0, 0.1), { holes: [circle(0.5, 48, 0, 0.1)] }),
      part(plus(0, 0.1, 0.6, 0.085), { depth: 0.26, bevel: 0.04 }),
      part(ribbon, { depth: 0.08, bevel: 0.04 }),
      part(mirrorX(ribbon), { depth: 0.08, bevel: 0.04 }),
    ],
    stripe: { region: circle(0.5, 32, 0, 0.1) },
  };
}

function firstgame(): BadgeShape {
  const label: Polygon = [[-0.52, 0.5], [0.3, 0.5], [0.52, 0.28], [0.52, -0.46], [-0.52, -0.46]];
  const slots = [-0.5, -0.22, 0.06].map((x) => rect(x, 0.64, x + 0.1, 0.8));
  return {
    parts: [
      part(
        [[-0.78, 0.95], [0.38, 0.95], [0.78, 0.55], [0.78, -0.72], [0.56, -0.72], [0.56, -0.95], [-0.56, -0.95], [-0.56, -0.72], [-0.78, -0.72]],
        { holes: [label, ...slots] },
      ),
    ],
    stripe: { region: label },
  };
}

function following(): BadgeShape {
  const hole: Polygon = [[0, 0.6], [0.4, 0.24], [0.4, -0.6], [0, -0.38], [-0.4, -0.6], [-0.4, 0.24]];
  return {
    parts: [
      part([[-0.62, 0.9], [0.62, 0.9], [0.62, -0.98], [0, -0.62], [-0.62, -0.98]], { holes: [hole] }),
      part(rect(-0.84, 0.82, 0.84, 1.0), { depth: 0.26, bevel: 0.05 }),
    ],
    stripe: { region: [[0, 0.6], [0.4, 0.24], [0.4, -0.38], [-0.4, -0.38], [-0.4, 0.24]] },
  };
}

function wellliked(): BadgeShape {
  const cy = -0.05;
  const leaves: BadgePart[] = [];
  for (const s of [1, -1]) {
    for (let i = 0; i < 5; i++) {
      const phi = (-90 + s * (28 + i * 30)) * D;
      leaves.push(
        part(rhombus(Math.cos(phi) * 0.8, cy + Math.sin(phi) * 0.8, 0.36, 0.16, phi + (s * Math.PI) / 3), {
          depth: i % 2 ? 0.12 : 0.14,
          bevel: 0.035,
        }),
      );
    }
  }
  return {
    parts: [
      part(circle(0.62, 72, 0, cy), { holes: [circle(0.46, 72, 0, cy)], bevel: 0.05 }),
      part(arcBand(0.6, 0.68, 110 * D, 430 * D, 0, cy, 64), { depth: 0.07, bevel: 0.03 }),
      ...leaves,
      part(heart(0.24, 0, 0.74), { depth: 0.24, bevel: 0.04 }),
    ],
    stripe: { region: circle(0.46, 32, 0, cy) },
  };
}

function crowd(): BadgeShape {
  const hole: Polygon = [[0, 0.5], [0.32, 0.04], [0, -0.42], [-0.32, 0.04]];
  const tips: Point[] = [[-0.95, 0.75], [0, 0.95], [0.95, 0.75]];
  return {
    parts: [
      part(
        [[-0.95, 0.75], [-0.55, 0.15], [0, 0.95], [0.55, 0.15], [0.95, 0.75], [0.82, -0.5], [0.9, -0.56], [0.9, -0.86], [-0.9, -0.86], [-0.9, -0.56], [-0.82, -0.5]],
        { holes: [hole] },
      ),
      ...tips.map(([x, y]) => part(circle(0.11, 8, x, y, Math.PI / 8), { depth: 0.26, bevel: 0.04 })),
    ],
    stripe: { region: hole, width: 0.12, gap: 0.2 },
  };
}

function complete(): BadgeShape {
  const hole: Polygon = [[-0.56, 0.68], [0.56, 0.68], [0.56, 0.14], [0.33, -0.38], [0, -0.68], [-0.33, -0.38], [-0.56, 0.14]];
  return {
    parts: [
      part([[-0.8, 0.92], [0.8, 0.92], [0.8, 0.1], [0.5, -0.55], [0, -0.98], [-0.5, -0.55], [-0.8, 0.1]], { holes: [hole] }),
      part(thickLine([[-0.64, 0.22], [-0.14, -0.3], [0.64, 0.6]], 0.085), { depth: 0.26, bevel: 0.04 }),
    ],
    stripe: { region: hole },
  };
}

function earlybird(): BadgeShape {
  const wing: Polygon = [[-0.06, 0.0], [-0.4, 0.3], [-0.98, 0.88], [-0.84, 0.48], [-0.94, 0.4], [-0.66, 0.2], [-0.76, 0.1], [-0.46, -0.04], [-0.54, -0.14], [-0.2, -0.22], [-0.06, -0.2]];
  const sy = 0.08;
  return {
    parts: [
      part(arcBand(0.36, 0.5, 0, Math.PI, 0, sy, 40), { depth: 0.12, bevel: 0.04 }),
      ...[60, 90, 120].map((a) => part(ray(a * D, 0.58, 0.82, 0.06, 0.03, 0, sy), { depth: 0.12, bevel: 0.025 })),
      part(wing, { depth: 0.16, bevel: 0.045 }),
      part(mirrorX(wing), { depth: 0.16, bevel: 0.045 }),
      part(rhombus(0, -0.25, 0.48, 0.32, Math.PI / 2), { depth: 0.26, bevel: 0.05 }),
    ],
    stripe: { region: halfDisc(0.36, 0, sy), width: 0.1, gap: 0.16 },
  };
}

function claimed(): BadgeShape {
  const hole: Polygon = [[-0.26, 0.76], [0.52, 0.47], [-0.26, 0.22]];
  return {
    parts: [
      part([[-0.5, 0.92], [0.0, 0.98], [0.4, 0.84], [0.86, 0.92], [0.86, 0.0], [0.4, -0.08], [0.0, 0.06], [-0.5, 0.0]], {
        holes: [hole],
        depth: 0.14,
        bevel: 0.05,
      }),
      part(rect(-0.62, -0.72, -0.48, 0.96), { depth: 0.16, bevel: 0.04 }),
      part(circle(0.1, 8, -0.55, 1.0, Math.PI / 8), { depth: 0.22, bevel: 0.035 }),
      part([[-0.95, -0.98], [-0.15, -0.98], [-0.32, -0.7], [-0.78, -0.7]], { depth: 0.2, bevel: 0.05 }),
    ],
    stripe: { region: hole, width: 0.11, gap: 0.18 },
  };
}

export const BADGE_SHAPES: Record<BadgeId, BadgeShape> = {
  explorer: explorer(),
  talk: talk(),
  fan: fan(),
  supporter: supporter(),
  firstgame: firstgame(),
  following: following(),
  wellliked: wellliked(),
  crowd: crowd(),
  complete: complete(),
  earlybird: earlybird(),
  claimed: claimed(),
};
