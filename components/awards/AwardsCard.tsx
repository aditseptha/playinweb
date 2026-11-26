"use client";

import { Dialog as RDialog } from "radix-ui";
import { useState } from "react";
import { AwardMedal3D } from "@/components/awards/AwardMedal3D";
import { shareAward } from "@/components/awards/share-award";
import { Button } from "@/components/ds/button";
import { PortalScope, usePortalContainer } from "@/components/ds/portal";
import { floatingSurface, focusRing } from "@/components/ds/styles";
import { IconClose, IconShare } from "@/components/icons";
import type { GameAward } from "@/lib/awards";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { trackEvent } from "@/lib/umami";

// Awards on a game page (#30). The sidebar card holds the medal hanging from a lit rail; a click on the
// medal (or the hidden button for keyboards and screen readers) opens the popup with what the award is,
// why this game got it, and how it is chosen.

/** Sidebar card: the medal under its lamp, the award name, and a line on what to do. */
export function AwardsCard({
  awards,
  gameTitle,
  ownerShareUrl,
  className,
}: {
  awards: GameAward[];
  gameTitle: string;
  /** The game's public address, passed only when the viewer owns the game: they get "Share your award". */
  ownerShareUrl?: string | null;
  className?: string;
}) {
  const [open, setOpenState] = useState<GameAward | null>(null);
  const award = awards[0];
  if (!award) return null;
  const setOpen = (a: GameAward | null) => {
    if (a) trackEvent("award-open", { award: a.slug });
    setOpenState(a);
  };
  return (
    <section
      id="awards"
      aria-labelledby="awards-title"
      className={cn("relative flex scroll-mt-28 flex-col rounded-pw-xl border border-pw-line bg-pw-surface-1", className)}
    >
      <div className="relative h-[200px] flex-none">
        {/* A soft cone of light falling from the rail, behind the medal. */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-[9px] left-[12%] h-[196px] w-[76%] [clip-path:polygon(16%_0,84%_0,100%_100%,0_100%)] bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(255,226,170,0.26)_0%,rgba(255,214,150,0.1)_45%,rgba(255,214,150,0)_78%)]"
        />
        <AwardMedal3D
          award={award}
          gameTitle={gameTitle}
          layout={{ ribbonLength: 2.4, spread: 0.22, size: 0.95, frameHalf: 3.4, lamp: true }}
          onOpen={() => setOpen(award)}
          className="size-full"
          fallbackClassName="mt-1 h-[180px] w-auto"
        />
        {/* The lamp rail: a dark bar with a warm light strip along its underside. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-[9px] left-[22%] h-[18px] w-[56%] rounded-[9px] border border-[rgba(255,214,150,0.55)] bg-[linear-gradient(180deg,#1c2a3a_0%,#0a1420_55%,#ffe7b8_82%,#fff6e0_100%)] shadow-[inset_0_2px_3px_rgba(255,255,255,0.08),0_4px_10px_rgba(255,214,140,0.55),0_10px_26px_rgba(255,200,120,0.28)]"
        />
      </div>
      <div className="flex flex-col items-center gap-1.5 px-5 pt-1.5 pb-5 text-center">
        <h2 id="awards-title" className="font-pw-pixel text-pw-label tracking-[0.08em] text-pw-highlight-ink uppercase">
          Awards
        </h2>
        <p className="font-pw-display text-[32px] leading-[0.95] font-extrabold text-pw-text uppercase italic">{award.name}</p>
        <p className="max-w-[260px] text-pw-body-sm text-pw-text-soft">
          {awards.length === 1
            ? "Picked by the PlayInWeb team as one of the games we love most. Click the medal for details."
            : `${gameTitle} has ${awards.length} awards. Open one to see what it is for.`}
        </p>
        <ul className="contents">
          {awards.map((a) => (
            <li key={a.id} className="contents">
              <button
                type="button"
                onClick={() => setOpen(a)}
                className={cn(
                  "sr-only rounded-pw-sm text-pw-body-sm font-semibold text-pw-link focus-visible:not-sr-only focus-visible:mt-1",
                  focusRing,
                )}
              >
                {a.name}: details
              </button>
            </li>
          ))}
        </ul>
        {ownerShareUrl ? (
          <div className="mt-2.5 flex w-full flex-col items-center gap-1.5">
            <ShareAwardButton gameUrl={ownerShareUrl} gameTitle={gameTitle} awardName={award.name} from="card" variant="secondary" className="w-full" />
            <span className="text-pw-caption text-pw-muted">Only you see this button.</span>
          </div>
        ) : null}
      </div>
      {/* The popup opens inside the card's scope, so it keeps the design system fonts (and the medal lettering matches). */}
      <PortalScope>
        <AwardDialog award={open} gameTitle={gameTitle} ownerShareUrl={ownerShareUrl} onClose={() => setOpen(null)} />
      </PortalScope>
    </section>
  );
}

/** The award popup: the medal turning slowly under soft rays, then what, why and how. */
export function AwardDialog({
  award,
  gameTitle,
  ownerShareUrl,
  onClose,
}: {
  award: GameAward | null;
  gameTitle: string;
  ownerShareUrl?: string | null;
  onClose: () => void;
}) {
  const container = usePortalContainer();
  return (
    <RDialog.Root open={Boolean(award)} onOpenChange={(next) => !next && onClose()}>
      <RDialog.Portal container={container}>
        <RDialog.Overlay className="fixed inset-0 z-[var(--pw-z-dialog)] bg-pw-overlay backdrop-blur-[2px] motion-safe:animate-[pw-fade-in_0.2s_var(--pw-ease-out)]" />
        {award ? (
          <RDialog.Content
            aria-describedby={undefined}
            className={cn(
              "fixed top-1/2 left-1/2 z-[var(--pw-z-dialog)] flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-pw-2xl",
              floatingSurface,
              "border-[rgba(255,182,65,0.4)] motion-safe:animate-[pw-dialog-in_0.25s_var(--pw-ease-out)]",
              focusRing,
            )}
          >
            <Rays />
            <div className="relative flex h-[250px] flex-none justify-center">
              <div className="relative h-[250px] w-[300px]">
                <AwardMedal3D
                  award={award}
                  gameTitle={gameTitle}
                  layout={{ ribbonLength: 0.6, spread: 0.35, size: 1.05, frameHalf: 0, lamp: false }}
                  className="size-full"
                  fallbackClassName="mt-2 h-[230px] w-auto"
                />
                {/* The clip the ribbon hangs from. */}
                <div
                  aria-hidden
                  className="absolute -top-px left-1/2 h-3 w-[92px] -translate-x-1/2 rounded-b-[8px] border border-t-0 border-[rgba(255,182,65,0.6)] bg-[#02060e] shadow-[inset_0_3px_6px_rgba(0,0,0,0.85)]"
                />
              </div>
            </div>
            <div className="absolute top-3 right-3">
              <RDialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close">
                  <IconClose />
                </Button>
              </RDialog.Close>
            </div>
            <div className="relative flex min-h-0 flex-col gap-4 overflow-y-auto px-6 pt-1.5 pb-7 sm:px-8">
              <div className="flex flex-col items-center gap-1.5 text-center">
                <span className="font-pw-pixel text-pw-label tracking-[0.08em] text-pw-highlight-ink uppercase">
                  Awarded {formatDate(award.awardedAt)}
                </span>
                <RDialog.Title className="font-pw-display text-[clamp(34px,8vw,44px)] leading-[0.95] font-extrabold text-pw-text uppercase italic">
                  {award.name}
                </RDialog.Title>
                <span className="text-pw-body-sm text-pw-text-soft">
                  Won by <strong className="font-semibold text-pw-text">{gameTitle}</strong>
                </span>
              </div>
              <Detail label="What it is" text={award.description} />
              <Detail label="Why this game" text={award.citation} />
              <Detail label="How it is chosen" text={award.howChosen} />
              {ownerShareUrl ? (
                <ShareAwardButton gameUrl={ownerShareUrl} gameTitle={gameTitle} awardName={award.name} from="popup" variant="highlight" size="lg" className="mt-1 w-full" />
              ) : null}
            </div>
          </RDialog.Content>
        ) : null}
      </RDialog.Portal>
    </RDialog.Root>
  );
}

/** "Share your award": the share sheet on phones, copy on computers. Says "Copied" for a moment. */
export function ShareAwardButton({
  gameUrl,
  gameTitle,
  awardName,
  from,
  label = "Share your award",
  variant,
  size,
  className,
}: {
  gameUrl: string;
  gameTitle: string;
  awardName: string;
  from: string;
  label?: string;
  variant: "secondary" | "highlight";
  size?: "md" | "lg";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() =>
        void shareAward({ gameUrl, gameTitle, awardName, from }).then((result) => {
          if (result !== "copied") return;
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        })
      }
    >
      <IconShare aria-hidden />
      <span aria-live="polite">{copied ? "Copied. Paste it anywhere" : label}</span>
    </Button>
  );
}

function Detail({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-pw-body-sm font-bold text-pw-text">{label}</h3>
      <p className="text-pw-body-sm leading-relaxed whitespace-pre-line text-pw-text-soft">{text}</p>
    </div>
  );
}

/** Slow light rays and a soft glow behind the medal, with four small stars. Still when motion is reduced. */
export function Rays() {
  const stars = [
    { left: "calc(50% - 88px)", top: 78, delay: "0s", size: 11 },
    { left: "calc(50% + 76px)", top: 66, delay: "0.9s", size: 9 },
    { left: "calc(50% - 96px)", top: 196, delay: "1.7s", size: 8 },
    { left: "calc(50% + 84px)", top: 190, delay: "0.5s", size: 10 },
  ];
  const mask = (inner: number, outer: number) => `radial-gradient(circle, #000 ${inner}%, transparent ${outer}%)`;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[300px] overflow-hidden">
      <div className="absolute top-2.5 left-1/2 -ml-[140px] size-[280px] rounded-full bg-[radial-gradient(circle,rgba(255,222,140,0.38)_0%,rgba(255,182,65,0.14)_32%,rgba(255,182,65,0)_62%)] motion-safe:animate-[pw-award-glow_3.2s_ease-in-out_infinite]" />
      <div
        className="absolute -top-10 left-1/2 -ml-[190px] size-[380px] rounded-full mix-blend-screen bg-[repeating-conic-gradient(from_0deg,rgba(255,214,120,0.18)_0deg_5deg,rgba(255,214,120,0)_5deg_22deg)] motion-safe:animate-[pw-award-spin_26s_linear_infinite]"
        style={{ maskImage: mask(18, 58), WebkitMaskImage: mask(18, 58) }}
      />
      <div
        className="absolute -top-10 left-1/2 -ml-[190px] size-[380px] rounded-full mix-blend-screen bg-[repeating-conic-gradient(from_7deg,rgba(255,244,214,0.1)_0deg_3deg,rgba(255,244,214,0)_3deg_15deg)] motion-safe:animate-[pw-award-spin-back_40s_linear_infinite]"
        style={{ maskImage: mask(14, 50), WebkitMaskImage: mask(14, 50) }}
      />
      {stars.map((s) => (
        <svg
          key={s.delay}
          viewBox="0 0 24 24"
          className="absolute opacity-60 drop-shadow-[0_0_4px_rgba(255,214,120,0.8)] motion-safe:animate-[pw-award-twinkle_2.6s_ease-in-out_infinite] motion-safe:opacity-0"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay }}
        >
          <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill="#fff4d6" />
        </svg>
      ))}
    </div>
  );
}
