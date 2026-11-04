"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { IconChevron } from "@/components/icons";
import { cn } from "@/lib/cn";

/** Item widths per row size; the gap is 16px (gap-4). */
const ITEM_WIDTH = {
  feature: "w-[85%] sm:w-[calc((100%-16px)/2)] lg:w-[calc((100%-32px)/3)]",
  poster: "w-[44%] sm:w-[calc((100%-32px)/3)] md:w-[calc((100%-48px)/4)] xl:w-[calc((100%-80px)/6)]",
  wide: "w-[85%] sm:w-[calc((100%-16px)/2)] lg:w-[calc((100%-32px)/3)]",
} as const;

export type RowSize = keyof typeof ITEM_WIDTH;

function useScroller(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft >= max - 4 });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [count]);

  const page = useCallback((dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  }, []);

  return { ref, edges, page };
}

function ArrowButton({
  dir,
  disabled,
  onClick,
  label,
  floating,
}: {
  dir: -1 | 1;
  disabled: boolean;
  onClick: () => void;
  label: string;
  floating?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "grid place-items-center rounded-full border text-text transition-[opacity,background-color,transform] duration-200 disabled:pointer-events-none",
        floating
          ? "size-10 border-border bg-surface shadow-panel hover:bg-surface-2 disabled:opacity-0"
          : "size-9 border-border bg-surface-2 hover:bg-surface-3 disabled:opacity-35",
      )}
    >
      <IconChevron className={cn("h-4 w-4", dir === -1 && "rotate-180")} />
    </button>
  );
}

export function SectionHeading({
  icon,
  title,
  action,
  id,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface-2 text-home-amber-ink">
        {icon}
      </span>
      <h2 id={id} className="min-w-0 truncate text-[20px] font-semibold tracking-tight sm:text-[22px]">
        {title}
      </h2>
      {action ? <div className="ml-auto flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function SeeAll({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center rounded-full border border-border bg-surface-2 px-4 text-ui font-semibold transition-colors hover:bg-surface-3"
    >
      See all
    </Link>
  );
}

/**
 * A titled horizontal row. `arrows="header"` puts paging buttons next to the title;
 * `arrows="sides"` floats them over the row edges, as the featured row does in the comp.
 */
export function Section({
  id,
  icon,
  title,
  href,
  size,
  arrows = "header",
  items,
}: {
  id?: string;
  icon: ReactNode;
  title: string;
  href?: string;
  size: RowSize;
  arrows?: "header" | "sides";
  items: ReactNode[];
}) {
  const { ref, edges, page } = useScroller(items.length);
  const scrollable = !(edges.start && edges.end);
  const headingId = id ? `${id}-title` : undefined;

  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-24">
      <SectionHeading
        id={headingId}
        icon={icon}
        title={title}
        action={
          <>
            {arrows === "header" && scrollable ? (
              <>
                <ArrowButton dir={-1} disabled={edges.start} onClick={() => page(-1)} label={`Previous ${title}`} />
                <ArrowButton dir={1} disabled={edges.end} onClick={() => page(1)} label={`More ${title}`} />
              </>
            ) : null}
            {href ? <SeeAll href={href} /> : null}
          </>
        }
      />
      <div className="relative">
        <div
          ref={ref}
          className="scrollbar-hide -mx-1 -my-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 py-3"
        >
          {items.map((item, i) => (
            <div key={i} className={cn("shrink-0 snap-start", ITEM_WIDTH[size])}>
              {item}
            </div>
          ))}
        </div>
        {arrows === "sides" && scrollable ? (
          <>
            <div className="absolute left-0 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 sm:block">
              <ArrowButton dir={-1} disabled={edges.start} onClick={() => page(-1)} label={`Previous ${title}`} floating />
            </div>
            <div className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 translate-x-1/2 sm:block">
              <ArrowButton dir={1} disabled={edges.end} onClick={() => page(1)} label={`More ${title}`} floating />
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
