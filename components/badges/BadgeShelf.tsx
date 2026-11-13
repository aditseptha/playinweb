"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { BadgeSvg } from "@/components/badges/BadgeSvg";
import type { BadgeRenderer, BadgeView } from "@/components/badges/badge-engine";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ds/popover";
import { PortalScope } from "@/components/ds/portal";
import { Skeleton } from "@/components/ds/skeleton";
import { Tooltip, TooltipProvider } from "@/components/ds/tooltip";
import { focusRing } from "@/components/ds/styles";
import {
  badgeBoard,
  levelLabel,
  maxLevel,
  progressLabel,
  stripeCount,
  tierFor,
  type BadgeBoardRow,
  type BadgeId,
  type BadgeState,
} from "@/lib/badges";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { usePrefersReducedMotion } from "@/lib/reduced-motion";
import { createClient } from "@/lib/supabase/client";

type Load = { status: "loading" } | { status: "ready"; board: BadgeState[] } | { status: "error" };

/** Fetches a profile's badges. Supporter progress depends on who is looking, so this runs in the browser. */
function useBadgeBoard(profileId: string, viewerId: string | null): Load {
  const [result, setResult] = useState<{ key: string; load: Load } | null>(null);
  const key = `${profileId}:${viewerId ?? ""}`;
  useEffect(() => {
    let live = true;
    void createClient()
      .rpc("profile_badge_board", { p_profile: profileId })
      .then(({ data, error }) => {
        if (!live) return;
        setResult({ key, load: error ? { status: "error" } : { status: "ready", board: badgeBoard(data as BadgeBoardRow[]) } });
      });
    return () => {
      live = false;
    };
  }, [key, profileId]);
  return result?.key === key ? result.load : { status: "loading" };
}

/**
 * The Badges panel on a profile. Draws flat badges first, then swaps in the three.js renderer
 * once the panel is on screen. Hidden when the board cannot load (for example before the
 * migration is applied), so a profile never shows a broken panel.
 */
export function BadgeShelf({
  profileId,
  viewerId,
  showCount = false,
  id,
  className,
}: {
  profileId: string;
  viewerId: string | null;
  /** "7 of 11 unlocked" beside the heading. On for the owner's own channel page. */
  showCount?: boolean;
  /** Anchor for links such as /profile#badges. */
  id?: string;
  className?: string;
}) {
  const load = useBadgeBoard(profileId, viewerId);
  if (load.status === "error") return null;
  const unlocked = load.status === "ready" ? load.board.filter((b) => b.level > 0).length : 0;
  return (
    <section id={id} aria-labelledby="badges-heading" className={cn("scroll-mt-28 rounded-pw-lg border border-pw-line bg-pw-surface-1 p-5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="badges-heading" className="font-pw-pixel text-pw-label uppercase tracking-[0.18em] text-pw-highlight">
          Badges
        </h2>
        {showCount && load.status === "ready" ? (
          <p className="text-pw-caption text-pw-muted">
            <span className="font-pw-display text-pw-title font-extrabold italic tabular-nums text-pw-highlight">{unlocked}</span> of {load.board.length} unlocked
          </p>
        ) : null}
      </div>
      {load.status === "loading" ? (
        <ul className="mt-4 grid grid-cols-3 gap-x-2 gap-y-4" aria-busy="true" aria-label="Loading badges">
          {Array.from({ length: 9 }, (_, i) => (
            <li key={i} className="grid justify-items-center gap-2">
              <Skeleton className="size-20 rounded-pw-md" />
              <Skeleton className="h-3 w-16" />
            </li>
          ))}
        </ul>
      ) : (
        // Popovers open inside the panel's scope, so they keep the design system fonts on any page.
        <PortalScope>
          <TooltipProvider>
            <BadgeGrid board={load.board} />
          </TooltipProvider>
        </PortalScope>
      )}
    </section>
  );
}

function BadgeGrid({ board }: { board: BadgeState[] }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<BadgeRenderer | null>(null);
  const views = useRef(new Map<BadgeId, BadgeView>());
  const reducedMotion = usePrefersReducedMotion();
  const [engine, setEngine] = useState<"waiting" | "ready" | "off">("waiting");

  // Load three.js only once the panel scrolls near the screen.
  useEffect(() => {
    const grid = gridRef.current;
    const canvas = canvasRef.current;
    const live = views.current;
    if (!grid || !canvas) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        import("@/components/badges/badge-engine")
          .then(({ createBadgeRenderer }) => {
            if (cancelled) return;
            renderer.current = createBadgeRenderer(canvas, { reducedMotion });
            setEngine("ready");
          })
          .catch(() => {
            if (!cancelled) setEngine("off");
          });
      },
      { rootMargin: "200px" },
    );
    io.observe(grid);
    return () => {
      cancelled = true;
      io.disconnect();
      for (const v of live.values()) v.remove();
      live.clear();
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, [reducedMotion]);

  // Keep one 3D view per badge, in step with the board.
  useEffect(() => {
    const r = renderer.current;
    const grid = gridRef.current;
    if (engine !== "ready" || !r || !grid) return;
    for (const b of board) {
      const look = { badge: b.def.id, tier: tierFor(b.def, b.level), stripes: stripeCount(b.def, b.level) };
      const existing = views.current.get(b.def.id);
      if (existing) existing.update(look);
      else {
        const el = grid.querySelector<HTMLElement>(`[data-badge-view="${b.def.id}"]`);
        if (el) views.current.set(b.def.id, r.add(el, look));
      }
    }
  }, [board, engine]);

  const view = (id: BadgeId) => views.current.get(id);

  return (
    <div ref={gridRef} className="relative mt-4">
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-10 size-full" />
      <ul className="grid grid-cols-3 gap-x-1 gap-y-3">
        {board.map((b) => (
          <BadgeCell
            key={b.def.id}
            state={b}
            flat={engine !== "ready"}
            onHover={(on) => view(b.def.id)?.hover(on)}
            onTilt={(x, y) => view(b.def.id)?.tilt(x, y)}
            onTap={() => view(b.def.id)?.spin()}
          />
        ))}
      </ul>
    </div>
  );
}

function BadgeCell({
  state,
  flat,
  onHover,
  onTilt,
  onTap,
}: {
  state: BadgeState;
  flat: boolean;
  onHover: (on: boolean) => void;
  onTilt: (x: number, y: number) => void;
  onTap: () => void;
}) {
  const { def, level, progress, earnedAt } = state;
  const tier = tierFor(def, level);
  const label = levelLabel(def, level);
  const detail = progressLabel(def, level, progress);
  const tiered = def.kind === "tiered";

  function onMove(e: PointerEvent<HTMLButtonElement>) {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    onTilt(((e.clientX - r.left) / r.width - 0.5) * 2, ((e.clientY - r.top) / r.height - 0.5) * 2);
  }

  return (
    <li>
      <Popover>
        <Tooltip content={detail}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`${def.name}, ${label}. ${detail}`}
              onPointerEnter={(e) => e.pointerType === "mouse" && onHover(true)}
              onPointerMove={onMove}
              onPointerLeave={() => onHover(false)}
              onPointerDown={(e) => e.pointerType !== "mouse" && onTap()}
              onFocus={() => onHover(true)}
              onBlur={() => onHover(false)}
              className={cn("grid w-full justify-items-center gap-1 rounded-pw-md px-0.5 pt-1 pb-2", focusRing)}
            >
              <span data-badge-view={def.id} className="relative block size-20">
                {flat ? <BadgeSvg badge={def.id} tier={tier} stripeCount={stripeCount(def, level)} className="absolute inset-[12%] size-[76%]" /> : null}
              </span>
              <span className="text-center text-pw-caption font-semibold leading-tight text-pw-text">{def.name}</span>
              <span className="text-pw-caption text-pw-muted">{label}</span>
              {tiered ? <LevelDots level={level} max={maxLevel(def)} /> : <span className="h-1.5" aria-hidden />}
            </button>
          </PopoverTrigger>
        </Tooltip>
        <PopoverContent align="center" className="w-64">
          <p className="font-pw-display text-pw-title font-extrabold uppercase italic leading-none text-pw-text">{def.name}</p>
          <p className="mt-1 text-pw-caption font-semibold text-pw-highlight">{label}</p>
          <p className="mt-3 text-pw-body-sm text-pw-text">{detail}</p>
          {detail !== def.mission ? <p className="mt-1 text-pw-caption text-pw-muted">{def.mission}</p> : null}
          {earnedAt && level > 0 ? <p className="mt-3 text-pw-caption text-pw-muted">Earned {formatDate(earnedAt)}</p> : null}
        </PopoverContent>
      </Popover>
    </li>
  );
}

function LevelDots({ level, max }: { level: number; max: number }) {
  return (
    <span className="flex h-1.5 gap-1" aria-hidden>
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={cn("size-1.5 rounded-full", i < level ? "bg-pw-highlight" : "bg-pw-line-strong")} />
      ))}
    </span>
  );
}
