import Image from "next/image";
import { hueFromId, initials } from "@/lib/format";
import { IconUser } from "@/components/icons";
import { cn } from "@/lib/cn";
import { canOptimizeImage } from "@/lib/optimize-image";

export function Avatar({
  name,
  src,
  size = 36,
  className = "",
}: {
  name: string;
  src?: string;
  size?: number;
  className?: string;
}) {
  if (src) {
    return (
      <span
        className={cn("relative block shrink-0 overflow-hidden rounded-full bg-surface-2", className)}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        {canOptimizeImage(src) ? (
          <Image src={src} alt="" fill sizes={`${size}px`} className="rounded-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" loading="lazy" decoding="async" className="size-full rounded-full object-cover" />
        )}
      </span>
    );
  }

  if (!name.trim()) {
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-surface-2 text-text-subtle",
          className,
        )}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <IconUser style={{ width: size * 0.5, height: size * 0.5 }} />
      </span>
    );
  }

  const lightness = 0.22 + (hueFromId(name) % 18) / 100;

  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full font-semibold text-text", className)}
      style={{
        width: size,
        height: size,
        background: `oklch(${lightness} 0 0)`,
        fontSize: Math.max(11, size * 0.34),
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
