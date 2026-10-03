import { useId, useMemo } from "react";
import { cn } from "@/lib/cn";

/**
 * 16 divides both sidebar widths (240 expanded, 96 collapsed) and the 336px
 * footer, so the grid lands flush in either state and no cell is ever sliced.
 */
const CELL = 16;
const COLS = 15;
const ROWS = 21;
/** Rows always filled, counted from the bottom. Footer text starts 196px up. */
const SOLID_ROWS = 13;
/** Extra rows a column's edge can step up by, above the solid block. */
const STEP_ROWS = 2;
/** Height the left edge gains over the right, tapering across the width. */
const SLOPE_ROWS = 4;

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Cells vary in tone rather than in alpha over the sidebar surface, so the
 * footer links keep their contrast no matter which cell lands behind them.
 * Negative shades tint white, positive tint black.
 *
 * Brand blue alone only reaches 4.37:1 against white, so cells behind the text
 * darken rather than lighten to clear WCAG AA. Cells above the text are free to
 * lift, which softens the dissolving edge.
 */
const TEXT_ZONE_SHADE = [0.08, 0.3];
const EDGE_ZONE_SHADE = [-0.1, 0.2];

type Cell = { x: number; y: number; shade: number };

/** Deterministic so server and client markup match. */
function buildCells(cols: number, fade: number) {
  const rows = ROWS + fade;
  const random = mulberry32(0x5eed);
  const cells: Cell[] = [];

  for (let col = 0; col < cols; col++) {
    const slope = Math.round(SLOPE_ROWS * (1 - col / (cols - 1)));
    const edge = SOLID_ROWS + slope + Math.floor(random() * (STEP_ROWS + 1));
    const filled = new Set<number>();
    for (let row = 0; row < edge; row++) filled.add(row);

    // Punching a cell out of the top step and floating one above it keeps the
    // boundary from reading as a staircase. Both stay clear of SOLID_ROWS.
    if (random() < 0.4 && edge > SOLID_ROWS) filled.delete(edge - 1);
    if (random() < 0.45) filled.add(edge + 1 + Math.floor(random() * 2));

    // Optional longer dissolve: stray cells above the edge, thinning out with height.
    for (let step = 1; step <= fade; step++) {
      if (random() < 0.5 * (1 - step / (fade + 1))) filled.add(edge + step);
    }

    for (const row of filled) {
      if (row >= rows) continue;
      const [min, max] = row < SOLID_ROWS ? TEXT_ZONE_SHADE : EDGE_ZONE_SHADE;
      cells.push({
        x: col * CELL,
        y: (rows - 1 - row) * CELL,
        shade: min + random() * (max - min),
      });
    }
  }

  return cells;
}

export function MosaicGrid({
  className,
  cols = COLS,
  fade = 0,
}: {
  className?: string;
  cols?: number;
  /** Extra rows the edge dissolves over. */
  fade?: number;
}) {
  const cells = useMemo(() => buildCells(cols, fade), [cols, fade]);
  const height = (ROWS + fade) * CELL;
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const cellsId = `mosaic-cells-${id}`;
  const grainId = `mosaic-grain-${id}`;

  return (
    <svg
      // Intrinsic size matches the viewBox 1:1 so cells stay the same size and
      // stay put when the sidebar collapses, which trims whole columns off the right.
      width={cols * CELL}
      height={height}
      viewBox={`0 0 ${cols * CELL} ${height}`}
      className={cn("absolute bottom-0 left-0", className)}
      aria-hidden
      focusable="false"
    >
      <defs>
        <filter id={grainId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.8" intercept="-0.35" />
          </feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      <g id={cellsId} fill="currentColor" stroke="rgba(0,0,0,0.09)" strokeWidth={1}>
        {cells.map((cell) => (
          <rect key={`${cell.x}-${cell.y}`} x={cell.x} y={cell.y} width={CELL} height={CELL} />
        ))}
      </g>

      <g stroke="none">
        {cells.map((cell) => (
          <rect
            key={`${cell.x}-${cell.y}`}
            x={cell.x}
            y={cell.y}
            width={CELL}
            height={CELL}
            fill={cell.shade < 0 ? "#fff" : "#000"}
            fillOpacity={Math.abs(cell.shade)}
          />
        ))}
      </g>

      <use href={`#${cellsId}`} filter={`url(#${grainId})`} className="mix-blend-overlay" />
    </svg>
  );
}
