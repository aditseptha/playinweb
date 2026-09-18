import Image from "next/image";
import { hueFromId } from "@/lib/format";
import { canOptimizeImage } from "@/lib/optimize-image";
import type { Game } from "@/lib/types";

const PATTERNS = ["orbit", "grid", "wave", "blocks", "dots"] as const;

export function GameThumb({
  game,
  src,
  priority = false,
  sizes = "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw",
}: {
  game: Game;
  src?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const image = src || game.thumbnailUrl;
  if (image) {
    const className =
      "absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out-quint group-hover:scale-[1.03]";
    if (canOptimizeImage(image)) {
      return (
        <Image
          src={image}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          className={className}
        />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt="" loading={priority ? "eager" : "lazy"} decoding="async" className={className} />
    );
  }

  const hue = hueFromId(game.id);
  const pattern = PATTERNS[hueFromId(game.id + "p") % PATTERNS.length];

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: `linear-gradient(145deg,
          oklch(0.28 0.08 ${hue}) 0%,
          oklch(0.18 0.05 ${hue + 40}deg) 55%,
          oklch(0.12 0.03 ${hue + 80}deg) 100%)`,
      }}
    >
      <Pattern kind={pattern} hue={hue} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
    </div>
  );
}

function Pattern({ kind, hue }: { kind: (typeof PATTERNS)[number]; hue: number }) {
  const c = `oklch(0.78 0.14 ${hue})`;
  if (kind === "orbit") {
    return (
      <svg className="absolute inset-0 h-full w-full opacity-70" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
        <ellipse cx="80" cy="45" rx="54" ry="22" fill="none" stroke={c} strokeWidth="1.2" opacity="0.5" />
        <ellipse cx="80" cy="45" rx="34" ry="14" fill="none" stroke={c} strokeWidth="1.2" opacity="0.7" />
        <circle cx="118" cy="38" r="6" fill={c} />
        <circle cx="80" cy="45" r="10" fill={`oklch(0.55 0.16 ${hue + 20})`} />
      </svg>
    );
  }
  if (kind === "grid") {
    return (
      <svg className="absolute inset-0 h-full w-full opacity-50" viewBox="0 0 160 90" preserveAspectRatio="none">
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`v${i}`} x1={20 * i} y1="0" x2={20 * i} y2="90" stroke={c} strokeWidth="0.6" />
        ))}
        {Array.from({ length: 5 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={18 * i} x2="160" y2={18 * i} stroke={c} strokeWidth="0.6" />
        ))}
        <rect x="48" y="28" width="28" height="16" fill={c} opacity="0.85" rx="2" />
      </svg>
    );
  }
  if (kind === "wave") {
    return (
      <svg className="absolute inset-0 h-full w-full opacity-80" viewBox="0 0 160 90" preserveAspectRatio="none">
        <path
          d="M0 55 Q40 30 80 55 T160 55 V90 H0 Z"
          fill={c}
          opacity="0.35"
        />
        <path
          d="M0 62 Q40 42 80 62 T160 62"
          fill="none"
          stroke={c}
          strokeWidth="2"
        />
      </svg>
    );
  }
  if (kind === "blocks") {
    return (
      <svg className="absolute inset-0 h-full w-full opacity-80" viewBox="0 0 160 90">
        {[0, 1, 2, 3, 4].map((row) =>
          Array.from({ length: 8 }, (_, col) => (
            <rect
              key={`${row}-${col}`}
              x={8 + col * 18}
              y={12 + row * 14}
              width="16"
              height="10"
              rx="1"
              fill={c}
              opacity={0.25 + ((row + col) % 4) * 0.2}
            />
          )),
        )}
      </svg>
    );
  }
  return (
    <svg className="absolute inset-0 h-full w-full opacity-70" viewBox="0 0 160 90">
      {Array.from({ length: 18 }, (_, i) => (
        <circle
          key={i}
          cx={12 + (i % 6) * 26}
          cy={16 + Math.floor(i / 6) * 28}
          r={4 + (i % 3) * 2}
          fill={c}
          opacity={0.35 + (i % 4) * 0.15}
        />
      ))}
    </svg>
  );
}
