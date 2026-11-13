"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { BadgeSvg } from "@/components/badges/BadgeSvg";
import type { BadgeRenderer } from "@/components/badges/badge-engine";
import c from "@/components/badges/celebration.module.css";
import { Button } from "@/components/ds/button";
import { Dialog, DialogContent } from "@/components/ds/dialog";
import { focusRing } from "@/components/ds/styles";
import { IconClose } from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { nextGoal, planCelebration, unlockDetail, unlockHeadline, unlockKey, type Moment, type Unlock } from "@/lib/badge-celebration";
import { isPlaying, onBadgeCheck, subscribePlaying } from "@/lib/badge-events";
import { maxLevel, stripeCount, tierFor } from "@/lib/badges";
import { cn } from "@/lib/cn";
import { apexHref } from "@/lib/host";
import { usePrefersReducedMotion } from "@/lib/reduced-motion";
import { createClient } from "@/lib/supabase/client";

// Badge popups (#30). Mounted once in HomeShell for signed-in accounts.
//
// The host fetches the account's badges when PlayInWeb opens, on every page change, when the tab
// comes back, and right after an action that can earn one (requestBadgeCheck). New levels become
// a corner card, a centred spotlight (Foil and the first badge ever) or one summary (three or
// more at once). Each popup marks its badges seen when it appears, so it shows once across
// devices. While a game is running, popups wait.

const CHECK_GAP_MS = 4000;
const CARD_MS = 6500;
const PROFILE_BADGES = apexHref("/profile#badges");

export function BadgeCelebrations() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const pathname = usePathname();
  const playing = useSyncExternalStore(subscribePlaying, isPlaying, () => false);
  const [state, setState] = useState<{ owner: string | null; queue: Moment[] }>({ owner: null, queue: [] });
  const shown = useRef(new Set<string>());
  const marked = useRef(new Set<Moment>());
  const lastCheck = useRef(0);

  const check = useCallback(
    async (force = false) => {
      if (!userId) return;
      const now = Date.now();
      if (!force && now - lastCheck.current < CHECK_GAP_MS) return;
      lastCheck.current = now;
      const { data, error } = await createClient().rpc("my_badges");
      if (error || !data) return;
      const moments = planCelebration(data).filter((m) => m.items.some((u) => !shown.current.has(unlockKey(u))));
      if (moments.length === 0) return;
      for (const m of moments) for (const u of m.items) shown.current.add(unlockKey(u));
      setState((s) => ({ owner: userId, queue: s.owner === userId ? [...s.queue, ...moments] : moments }));
    },
    [userId],
  );

  useEffect(() => {
    void check(true);
  }, [check]);

  useEffect(() => {
    void check();
  }, [check, pathname]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    const off = onBadgeCheck(() => void check(true));
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      off();
    };
  }, [check]);

  const queue = state.owner === userId ? state.queue : [];
  const current = !playing ? queue[0] : undefined;

  // Mark a popup's badges seen as soon as it appears.
  useEffect(() => {
    if (!current || marked.current.has(current)) return;
    marked.current.add(current);
    void createClient().rpc("mark_badges_seen", { p_badges: current.items.map((u) => u.def.id) });
  }, [current]);

  const done = useCallback(() => setState((s) => ({ ...s, queue: s.queue.slice(1) })), []);

  if (!current) return null;
  return current.kind === "card" ? (
    <BadgeCard key={unlockKey(current.items[0])} unlock={current.items[0]} onDone={done} />
  ) : (
    <BadgeSpotlight key={current.items.map(unlockKey).join(",")} moment={current} onDone={done} />
  );
}

// The 3D badges inside a popup ----------------------------------------------------------------

/** Draws `items` in 3D on one canvas, popping in one after another. Flat badges until three.js loads. */
function BadgeStage({ items, size, className }: { items: Unlock[]; size: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cells = useRef<(HTMLSpanElement | null)[]>([]);
  const reducedMotion = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: BadgeRenderer | null = null;
    let cancelled = false;
    const timers: number[] = [];
    import("@/components/badges/badge-engine")
      .then(({ createBadgeRenderer }) => {
        if (cancelled) return;
        renderer = createBadgeRenderer(canvas, { reducedMotion });
        const r = renderer;
        items.forEach((u, i) => {
          const el = cells.current[i];
          if (!el) return;
          const view = r.add(el, { badge: u.def.id, tier: tierFor(u.def, u.level), stripes: stripeCount(u.def, u.level) });
          timers.push(window.setTimeout(() => view.hover(true), 180 + i * 120));
          timers.push(window.setTimeout(() => view.hover(false), 1500 + i * 120));
        });
        r.keepAlive(1800 + items.length * 120);
        setReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      renderer?.dispose();
    };
    // The items of a popup never change while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  return (
    <div className={cn("relative", className)}>
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-10 size-full" />
      <ul className="flex flex-wrap justify-center gap-3">
        {items.map((u, i) => (
          <li key={unlockKey(u)} className={cn("grid justify-items-center gap-2", c.pop)} style={{ "--i": i } as CSSProperties}>
            <span
              ref={(el) => {
                cells.current[i] = el;
              }}
              className="relative block"
              style={{ width: size, height: size }}
            >
              {!ready ? (
                <BadgeSvg badge={u.def.id} tier={tierFor(u.def, u.level)} stripeCount={stripeCount(u.def, u.level)} className="absolute inset-[12%] size-[76%]" />
              ) : null}
            </span>
            {items.length > 1 ? (
              <span className="max-w-24 text-center text-pw-caption font-semibold leading-tight text-pw-text">{u.def.name}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Sparkles and confetti ------------------------------------------------------------------------

const SPARK_COLORS = ["var(--pw-gold)", "var(--pw-sky)", "var(--pw-pastel-6)", "var(--pw-pastel-4)", "var(--pw-white)"];

function Star() {
  return (
    <svg viewBox="0 0 20 20" className="size-full" aria-hidden>
      <path d="M10 0 L12.2 7.8 L20 10 L12.2 12.2 L10 20 L7.8 12.2 L0 10 L7.8 7.8 Z" fill="currentColor" />
    </svg>
  );
}

function Heart() {
  return (
    <svg viewBox="0 0 20 18" className="size-full" aria-hidden>
      <path d="M10 18 L1.5 9.5 A5 5 0 0 1 10 3 A5 5 0 0 1 18.5 9.5 Z" fill="currentColor" />
    </svg>
  );
}

/** A ring of stars and hearts that bursts out of the badge. Fixed positions, so every burst looks the same. */
function SparkleBurst({ count = 12, reach = 90 }: { count?: number; reach?: number }) {
  return (
    <div className={c.burst} aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + (i % 2) * 0.3;
        const dist = reach * (0.7 + ((i * 37) % 10) / 30);
        const style = {
          "--x": `${Math.cos(a) * dist}px`,
          "--y": `${Math.sin(a) * dist}px`,
          "--r": `${(i % 2 ? 1 : -1) * (90 + i * 15)}deg`,
          "--s": `${i % 3 === 0 ? 16 : 11}px`,
          "--c": SPARK_COLORS[i % SPARK_COLORS.length],
          "--d": `${0.25 + (i % 4) * 0.05}s`,
        } as CSSProperties;
        return (
          <span key={i} className={c.sparkle} style={style}>
            {i % 4 === 1 ? <Heart /> : <Star />}
          </span>
        );
      })}
    </div>
  );
}

function Confetti({ count = 28 }: { count?: number }) {
  return (
    <div className={c.confetti} aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const style = {
          "--l": `${(i * 37) % 100}%`,
          "--c": SPARK_COLORS[i % SPARK_COLORS.length],
          "--d": `${0.2 + ((i * 13) % 10) / 12}s`,
          "--t": `${1.8 + ((i * 7) % 10) / 8}s`,
          "--r": `${(i % 2 ? 1 : -1) * (180 + i * 25)}deg`,
          "--sway": `${((i * 29) % 60) - 30}px`,
        } as CSSProperties;
        return <span key={i} className={c.piece} style={style} />;
      })}
    </div>
  );
}

function LevelDots({ unlock }: { unlock: Unlock }) {
  if (unlock.def.kind !== "tiered") return null;
  return (
    <span className="flex gap-1.5" aria-hidden>
      {Array.from({ length: maxLevel(unlock.def) }, (_, i) => {
        const on = i < unlock.level;
        const fresh = on && i >= unlock.from;
        return (
          <i
            key={i}
            className={cn("size-2 rounded-full", on ? "bg-pw-highlight" : "bg-pw-line-strong", fresh && c.dot)}
            style={{ "--i": i - unlock.from } as CSSProperties}
          />
        );
      })}
    </span>
  );
}

// Corner card -----------------------------------------------------------------------------------

function BadgeCard({ unlock, onDone }: { unlock: Unlock; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const paused = useRef(false);
  const left = useRef(CARD_MS);

  const leave = useCallback(() => {
    setLeaving(true);
    window.setTimeout(onDone, 220);
  }, [onDone]);

  // Count down only while the card is not hovered or focused.
  useEffect(() => {
    const step = 250;
    const id = window.setInterval(() => {
      if (paused.current) return;
      left.current -= step;
      if (left.current <= 0) {
        window.clearInterval(id);
        leave();
      }
    }, step);
    return () => window.clearInterval(id);
  }, [leave]);

  return (
    <div
      role="status"
      aria-live="polite"
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
      className={cn(
        "fixed right-4 z-[var(--pw-z-toast)] w-[min(360px,calc(100vw-32px))] bottom-[max(16px,env(safe-area-inset-bottom,0px))]",
        leaving ? c.cardOut : c.cardIn,
      )}
    >
      <Image src="/illustrations/success.webp" alt="" width={64} height={64} className={cn("absolute -top-11 right-12 size-16", c.peek)} />
      <div className="relative flex items-center gap-3 rounded-pw-xl border border-pw-line-strong bg-pw-surface-raised p-3 pr-11 shadow-pw-3">
        <div className="relative">
          <SparkleBurst count={10} reach={60} />
          <BadgeStage items={[unlock]} size={84} />
        </div>
        <div className="min-w-0">
          <p className="font-pw-pixel text-pw-label uppercase tracking-[0.14em] text-pw-highlight">{unlockHeadline(unlock)}</p>
          <p className="mt-1 truncate font-pw-display text-pw-title font-extrabold uppercase italic leading-none text-pw-text">{unlock.def.name}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-pw-caption text-pw-muted">{unlockDetail(unlock)}</span>
            <LevelDots unlock={unlock} />
          </div>
          <Link href={PROFILE_BADGES} onClick={leave} className={cn("mt-2 inline-block rounded-pw-sm text-pw-caption font-semibold text-pw-sky hover:underline", focusRing)}>
            See your badges
          </Link>
        </div>
        <span className="absolute top-2 right-2">
          <Button variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={leave}>
            <IconClose />
          </Button>
        </span>
      </div>
    </div>
  );
}

// Spotlight and summary --------------------------------------------------------------------------

function BadgeSpotlight({ moment, onDone }: { moment: Moment; onDone: () => void }) {
  const summary = moment.kind === "summary";
  const first = moment.items[0];
  const title = summary ? `You've earned ${moment.items.length} badges!` : unlockHeadline(first);
  const description = summary
    ? "They're on your profile now. Keep playing to level them up."
    : `${first.def.name} · ${unlockDetail(first)}`;

  return (
    <Dialog open onOpenChange={(open) => !open && onDone()}>
      <DialogContent
        title={title}
        description={description}
        size={summary ? "lg" : "md"}
        footer={
          <>
            <Button variant="secondary" onClick={onDone}>
              Nice!
            </Button>
            <Button variant="primary" asChild>
              <Link href={PROFILE_BADGES} onClick={onDone}>
                See your badges
              </Link>
            </Button>
          </>
        }
      >
        <div className={cn("relative grid min-h-64 place-items-center overflow-hidden rounded-pw-xl bg-pw-bg-deep pb-6", summary ? "pt-24" : "pt-6")}>
          <Confetti count={summary ? 36 : 28} />
          <div className="relative">
            {summary ? null : <SparkleBurst count={14} reach={130} />}
            <BadgeStage items={moment.items} size={summary ? 96 : 200} />
          </div>
          <Image
            src="/illustrations/success.webp"
            alt=""
            width={112}
            height={112}
            className={cn("absolute top-3 right-3 size-20 sm:size-24", c.mascot)}
          />
          {summary ? null : (
            <div className="relative mt-2 flex flex-col items-center gap-2">
              <LevelDots unlock={first} />
              <p className="text-center text-pw-body-sm text-pw-muted">{nextGoal(first)}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
