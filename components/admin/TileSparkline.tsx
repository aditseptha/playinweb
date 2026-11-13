import type { AdminTrendDay } from "@/components/admin/shared";
import { formatCompact } from "@/lib/format-core";

const VB_W = 100;
const PAD_TOP = 10;
const CHART_H = 22;
const BASE_Y = PAD_TOP + CHART_H;
const VB_H = BASE_Y + 11;

export function sparklineFromTrend(
  days: AdminTrendDay[] | null,
  pick: (day: AdminTrendDay) => number,
): number[] | null {
  if (days === null) return null;
  return days.map(pick);
}

function dayInitial(days: AdminTrendDay[] | null): string[] | null {
  if (days === null) return null;
  return days.map((d) => {
    const date = new Date(`${d.day}T12:00:00Z`);
    const narrow = date.toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" });
    return narrow.charAt(0).toUpperCase();
  });
}

export function TileTrend7d({
  values,
  days,
  stroke = "currentColor",
  className,
}: {
  values: number[] | null;
  days: AdminTrendDay[] | null;
  stroke?: string;
  className?: string;
}) {
  const labels = dayInitial(days);

  if (values === null || labels === null) {
    return <div className={`mt-1.5 h-11 w-full rounded-sm bg-surface-1/80 ${className ?? ""}`} aria-hidden />;
  }

  if (values.length === 0) return null;

  const max = Math.max(1, ...values);
  const step = values.length <= 1 ? 0 : VB_W / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * step;
    const y = BASE_Y - (v / max) * CHART_H;
    return { x, y, v, label: labels[i] ?? "" };
  });
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className={`mt-1.5 h-11 w-full text-text ${className ?? ""}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Last seven days"
    >
      <path
        d={pathD}
        fill="none"
        stroke={stroke}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity={0.9}
      />
      {points.map((p, i) => (
        <g key={i}>
          <text
            x={p.x}
            y={Math.max(PAD_TOP + 1, p.y - 2)}
            textAnchor="middle"
            fontSize={7}
            fontWeight={600}
            className="fill-text"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            <title>{String(p.v)}</title>
            {formatCompact(p.v)}
          </text>
          <text x={p.x} y={VB_H - 1} textAnchor="middle" fontSize={6.5} className="fill-text-subtle">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
