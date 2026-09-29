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
      className="scrollbar-hide flex w-full gap-1.5 overflow-x-auto lg:h-full lg:w-[148px] lg:shrink-0 lg:flex-col lg:justify-center lg:overflow-hidden"
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
              "relative aspect-video w-[148px] shrink-0 overflow-hidden rounded-lg bg-black/30 transition-[box-shadow,opacity] duration-300 ease-out-quint",
              active ? "ring-2 ring-white/80 opacity-100" : "opacity-70 hover:opacity-100",
            )}
          >
            <SlideThumb slide={slide} priority={index === 0} />
          </button>
        );
      })}
    </div>
  );
}

function SlideThumb({ slide, priority }: { slide: HomeHeroSlide; priority: boolean }) {
  if (slide.game) {
    return <GameThumb game={slide.game} src={slide.src} priority={priority} sizes="148px" />;
  }

  const className = "absolute inset-0 h-full w-full object-cover object-[68%_48%]";
  if (canOptimizeImage(slide.src)) {
    return <Image src={slide.src} alt="" fill priority={priority} sizes="148px" className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={slide.src} alt="" className={className} />
  );
}
