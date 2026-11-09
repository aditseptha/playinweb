import Image from "next/image";
import { initials } from "@/lib/format";
import { canOptimizeImage } from "@/lib/optimize-image";
import { cn } from "@/lib/cn";

const SIZES = {
  xs: { box: "size-6", text: "text-[9px]", px: 24 },
  sm: { box: "size-8", text: "text-[10px]", px: 32 },
  md: { box: "size-10", text: "text-pw-label", px: 40 },
  lg: { box: "size-12", text: "text-[13px]", px: 48 },
  xl: { box: "size-16", text: "text-[16px]", px: 64 },
} as const;

const PASTELS = [
  "bg-pw-pastel-1",
  "bg-pw-pastel-2",
  "bg-pw-pastel-3",
  "bg-pw-pastel-4",
  "bg-pw-pastel-5",
  "bg-pw-pastel-6",
];

/** Same name, same pastel, everywhere. */
export function pastelFor(name: string) {
  // FNV-1a: spreads similar names across the six pastels.
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 0x01000193) >>> 0;
  return PASTELS[h % PASTELS.length];
}

/**
 * Creator photo, or pastel initials when there is none ("Kreator di depan": a face, never a blank).
 * Decorative by default; pass `label` when the avatar is the only thing naming the person.
 */
export function Avatar({
  name,
  src,
  size = "md",
  ring = false,
  label,
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  /** A thin light ring, for avatars that overlap art or each other. */
  ring?: boolean;
  label?: string;
  className?: string;
}) {
  const s = SIZES[size];
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const };
  const frame = cn(
    "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full",
    s.box,
    ring && "ring-2 ring-[color-mix(in_srgb,var(--pw-white)_85%,transparent)]",
    className,
  );

  if (src) {
    return (
      <span className={cn(frame, "bg-pw-surface-3")} {...a11y}>
        {canOptimizeImage(src) ? (
          <Image src={src} alt="" fill sizes={`${s.px}px`} className="object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        )}
      </span>
    );
  }

  return (
    <span className={cn(frame, pastelFor(name), "font-pw-pixel text-pw-navy", s.text)} {...a11y}>
      {initials(name || "?")}
    </span>
  );
}
