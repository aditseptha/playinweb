import { useId } from "react";
import { BADGE_PALETTES } from "@/lib/badge-art";
import { BADGE_SHAPES, stripes, type Polygon } from "@/lib/badge-shapes";
import type { BadgeId, BadgeTier } from "@/lib/badges";

// The flat version of a badge: the first paint, and what devices without WebGL keep.
// Same polygons as the 3D badge, filled with the tier's metal from top light to bottom shade.

const ring = (p: Polygon) => `M${p.map(([x, y]) => `${x.toFixed(3)},${(-y).toFixed(3)}`).join("L")}Z`;

export function BadgeSvg({ badge, tier, stripeCount, className }: { badge: BadgeId; tier: BadgeTier; stripeCount: number; className?: string }) {
  const id = useId();
  const shape = BADGE_SHAPES[badge];
  const pal = BADGE_PALETTES[tier];
  // Thin parts sit behind the frame, thick parts in front.
  const parts = [...shape.parts].sort((a, b) => a.depth - b.depth);
  return (
    <svg viewBox="-1.2 -1.2 2.4 2.4" aria-hidden className={className}>
      <defs>
        <linearGradient id={`${id}m`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={pal.light} />
          <stop offset="0.5" stopColor={pal.base} />
          <stop offset="1" stopColor={pal.deep} />
        </linearGradient>
      </defs>
      {parts.map((p, i) => (
        <path
          key={i}
          d={[p.outer, ...p.holes].map(ring).join("")}
          fillRule="evenodd"
          fill={`url(#${id}m)`}
          stroke={pal.hi}
          strokeOpacity={tier === "locked" ? 0.15 : 0.55}
          strokeWidth={0.03}
          strokeLinejoin="round"
        />
      ))}
      {stripes(shape.stripe, stripeCount).map((piece, i) => (
        <path key={`s${i}`} d={ring(piece)} fill={`url(#${id}m)`} stroke={pal.hi} strokeOpacity={0.55} strokeWidth={0.025} />
      ))}
    </svg>
  );
}
