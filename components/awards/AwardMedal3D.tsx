"use client";

import { useEffect, useRef, useState } from "react";
import type { MedalOptions, MedalView } from "@/components/awards/medal-engine";
import { MedalIcon } from "@/components/awards/MedalIcon";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { GameAward } from "@/lib/awards";
import { usePrefersReducedMotion } from "@/lib/reduced-motion";

type Layout = Pick<MedalOptions, "ribbonLength" | "spread" | "size" | "frameHalf" | "lamp">;

/** The design system faces, read from the page so the medal lettering matches the site. */
function pageFonts(el: Element) {
  const style = getComputedStyle(el);
  const read = (name: string) => style.getPropertyValue(name).trim() || "sans-serif";
  return { display: read("--pw-font-display"), body: read("--pw-font-body") };
}

/**
 * One award medal in 3D, hanging from the top edge of its box. three.js loads once the box comes near
 * the screen; until then (or if WebGL is missing) the flat medal stands in. A tap on the medal calls
 * onOpen; moving the pointer across it brushes it and dragging pulls it.
 */
export function AwardMedal3D({
  award,
  gameTitle,
  layout,
  onOpen,
  className,
  fallbackClassName,
}: {
  award: GameAward;
  gameTitle: string;
  layout: Layout;
  onOpen?: () => void;
  className?: string;
  /** Size and place of the flat medal shown before the 3D one is ready. */
  fallbackClassName?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const openRef = useRef(onOpen);
  const reducedMotion = usePrefersReducedMotion();
  const [engine, setEngine] = useState<"waiting" | "ready" | "off">("waiting");
  const { medal } = award;
  const { ribbonLength, spread, size, frameHalf, lamp } = layout;

  useEffect(() => {
    openRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    let cancelled = false;
    let view: MedalView | null = null;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        import("@/components/awards/medal-engine")
          .then(({ createMedal }) => {
            if (cancelled) return;
            const fonts = pageFonts(canvas);
            view = createMedal(canvas, {
              medal,
              title: gameTitle,
              date: formatDate(award.awardedAt),
              fonts,
              ribbonLength,
              spread,
              size,
              frameHalf,
              lamp,
              reducedMotion,
              onOpen: () => openRef.current?.(),
            });
            setEngine("ready");
            // Canvas lettering only uses a web font once it has loaded, so paint again after.
            void Promise.all([
              document.fonts.load(`italic 800 40px ${fonts.display}`),
              document.fonts.load(`800 40px ${fonts.body}`),
            ])
              .then(() => {
                if (!cancelled) view?.repaint();
              })
              .catch(() => {});
          })
          .catch(() => {
            if (!cancelled) setEngine("off");
          });
      },
      { rootMargin: "200px" },
    );
    io.observe(box);
    return () => {
      cancelled = true;
      io.disconnect();
      view?.dispose();
    };
  }, [medal, gameTitle, award.awardedAt, ribbonLength, spread, size, frameHalf, lamp, reducedMotion]);

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      {engine !== "ready" ? (
        <MedalIcon className={cn("pointer-events-none absolute left-1/2 top-0 -translate-x-1/2", fallbackClassName)} />
      ) : null}
      <canvas
        ref={canvasRef}
        aria-hidden
        onClick={engine === "off" ? onOpen : undefined}
        className={cn(
          "absolute inset-0 block size-full drop-shadow-[0_12px_16px_rgba(0,0,0,0.5)]",
          engine === "off" && "cursor-pointer",
        )}
      />
    </div>
  );
}
