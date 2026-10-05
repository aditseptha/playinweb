"use client";

import Image from "next/image";
import { GameThumb } from "@/components/GameThumb";
import { cn } from "@/lib/cn";
import { canOptimizeImage } from "@/lib/optimize-image";
import type { Game } from "@/lib/types";

export type HomeHeroSlide = {
  id: string;
  label: string;
  src: string;
  game?: Game;
};

const THUMB_WIDTH = 112;

export function HomeHeroTopStrip({
  slides,
  activeIndex,
  onSelect,
  onKeyNavigate,
}: {
  slides: HomeHeroSlide[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onKeyNavigate: (direction: -1 | 1) => void;
}) {
  if (slides.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label="Featured images"
      className="scrollbar-hide flex w-full gap-1.5 overflow-x-auto lg:h-full lg:w-[112px] lg:shrink-0 lg:flex-col lg:justify-center lg:overflow-hidden"
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          onKeyNavigate(1);
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          onKeyNavigate(-1);
        }
      }}
    >
      {slides.map((slide, index) => {
        const active = index === activeIndex;
        return (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-current={active ? "true" : undefined}
            aria-label={slide.label}
            onClick={() => onSelect(index)}
            className={cn(
              "group relative aspect-video w-[112px] shrink-0 overflow-hidden rounded-lg bg-black/30 outline-none",
              "transition-[opacity,scale,filter] duration-300 ease-out-quint active:scale-[0.95] motion-reduce:transition-none",
              active
                ? "opacity-100"
                : "scale-[0.92] opacity-55 saturate-50 hover:scale-[0.96] hover:opacity-90 hover:saturate-100",
            )}
          >
            <SlideThumb slide={slide} priority={index === 0} />
            {/* Ring sits above the image: an outline on the button paints under its
                positioned children. Inset, because the strip clips its overflow. */}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 z-10 rounded-[inherit] ring-2 ring-inset transition-[box-shadow] duration-300 ease-out-quint",
                active ? "ring-white" : "ring-transparent group-focus-visible:ring-white/60",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

function SlideThumb({ slide, priority }: { slide: HomeHeroSlide; priority: boolean }) {
  if (slide.game) {
    return <GameThumb game={slide.game} src={slide.src} priority={priority} sizes={`${THUMB_WIDTH}px`} />;
  }

  const className = "absolute inset-0 h-full w-full object-cover object-[68%_48%]";
  if (canOptimizeImage(slide.src)) {
    return <Image src={slide.src} alt="" fill preload={priority} sizes={`${THUMB_WIDTH}px`} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={slide.src} alt="" className={className} />
  );
}
