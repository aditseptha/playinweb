// Mosaic theme reveal: the new theme arrives square by square from the toggle, with a band of
// brand-blue squares running ahead of it — the same 16px cells as the footer's MosaicGrid.
//
// How it works: during a View Transition the old and new page snapshots are each clipped to a
// union of squares. A square goes old → blue → new. While it's blue, neither snapshot covers it,
// so the blue mosaic background of the transition group (globals.css) shows through.

/** Same cell size as components/ui/mosaic-grid.tsx. */
const CELL = 16;
/** How long the front takes to cross the screen. */
const SPREAD_MS = 460;
/** How long each square stays blue before the new theme lands on it. */
const BAND_MS = 70;
export const MOSAIC_TOTAL_MS = SPREAD_MS + BAND_MS;
/** Stepped frames, for a pixel-art feel (~40 per second). */
const FRAMES = 22;
/** Randomness in each square's arrival, as a share of the spread: a dissolving edge, not a circle. */
const JITTER = 0.12;

/** Deterministic, so the edge looks the same every time (same generator as MosaicGrid). */
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A clip-path that covers the given cells, merging horizontal runs so the path stays small. */
function cellsPath(rows: boolean[][]) {
  let d = "";
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    let c = 0;
    while (c < row.length) {
      if (!row[c]) {
        c++;
        continue;
      }
      const start = c;
      while (c < row.length && row[c]) c++;
      d += `M${start * CELL} ${r * CELL}h${(c - start) * CELL}v${CELL}h${-(c - start) * CELL}z`;
    }
  }
  // An empty path clips everything away.
  return `path("${d || "M0 0z"}")`;
}

/**
 * Keyframes for the old and new snapshots. `x`, `y` is where the front starts (the toggle).
 * Each frame holds until the next one (step-end), so the reveal moves in crisp steps.
 */
export function mosaicKeyframes(x: number, y: number, width: number, height: number) {
  const cols = Math.ceil(width / CELL);
  const rows = Math.ceil(height / CELL);
  const far = Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) || 1;
  const random = mulberry32(0x5eed);

  // When each square turns blue (touch) and when the new theme lands on it (touch + band).
  const touch: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const line: number[] = [];
    for (let c = 0; c < cols; c++) {
      const d = Math.hypot(c * CELL + CELL / 2 - x, r * CELL + CELL / 2 - y) / far;
      line.push((d * (1 - JITTER) + random() * JITTER) * SPREAD_MS);
    }
    touch.push(line);
  }

  const oldFrames: Keyframe[] = [];
  const newFrames: Keyframe[] = [];
  for (let f = 0; f <= FRAMES; f++) {
    const now = (f / FRAMES) * MOSAIC_TOTAL_MS;
    const offset = f / FRAMES;
    const last = f === FRAMES;
    oldFrames.push({
      offset,
      easing: "step-end",
      clipPath: last ? 'path("M0 0z")' : cellsPath(touch.map((line) => line.map((t) => t > now))),
    });
    newFrames.push({
      offset,
      easing: "step-end",
      clipPath: last ? "inset(0)" : cellsPath(touch.map((line) => line.map((t) => t + BAND_MS <= now))),
    });
  }
  return { oldFrames, newFrames };
}
