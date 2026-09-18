"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface Thumb {
  left: number;
  top: number;
  width: number;
  height: number;
}

const SIZES = {
  sm: {
    root: "h-8 gap-0.5 rounded-lg p-0.5",
    item: "h-7 rounded-[6px] px-2.5 text-caption",
    pill: "rounded-[6px]",
  },
  lg: {
    root: "h-11 gap-1 rounded-xl p-1",
    item: "h-8 rounded-lg px-4 text-ui",
    pill: "rounded-lg",
  },
} as const;

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "sm",
  className,
  "aria-label": ariaLabel,
}: {
  value: T;
  options: { value: T; label: React.ReactNode; href?: string }[];
  onChange?: (value: T) => void;
  size?: keyof typeof SIZES;
  className?: string;
  "aria-label"?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<Thumb | null>(null);
  const [sliding, setSliding] = useState(false);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const active = list.querySelector<HTMLElement>('[aria-checked="true"]');
      setThumb(
        active
          ? {
              left: active.offsetLeft,
              top: active.offsetTop,
              width: active.offsetWidth,
              height: active.offsetHeight,
            }
          : null,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    for (const child of Array.from(list.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [value, options]);

  useEffect(() => {
    if (!thumb || sliding) return;
    const frame = requestAnimationFrame(() => setSliding(true));
    return () => cancelAnimationFrame(frame);
  }, [thumb, sliding]);

  return (
    <div
      ref={listRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("relative inline-flex items-center bg-surface-2", SIZES[size].root, className)}
    >
      {thumb ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-0 left-0 bg-surface shadow-sm",
            SIZES[size].pill,
            sliding && "transition-[transform,width] duration-200 ease-out-quint motion-reduce:transition-none",
          )}
          style={{
            transform: `translate(${thumb.left}px, ${thumb.top}px)`,
            width: thumb.width,
            height: thumb.height,
          }}
        />
      ) : null}
      {options.map((opt) => {
        const active = opt.value === value;
        const cls = cn(
          "relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-colors",
          SIZES[size].item,
          active ? "text-text" : "text-text-subtle hover:text-text-muted",
        );
        if (opt.href) {
          return (
            <Link key={opt.value} href={opt.href} role="radio" aria-checked={active} className={cls}>
              {opt.label}
            </Link>
          );
        }
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange?.(opt.value)}
            className={cls}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
