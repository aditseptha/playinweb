"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as RDialog } from "radix-ui";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AwardMedal3D } from "@/components/awards/AwardMedal3D";
import { Rays, ShareAwardButton } from "@/components/awards/AwardsCard";
import { Button } from "@/components/ds/button";
import { PortalScope, usePortalContainer } from "@/components/ds/portal";
import { floatingSurface, focusRing } from "@/components/ds/styles";
import { IconClose } from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { markAwardsSeen, medalFromJson, type GameAward, type MyAwardRow } from "@/lib/awards";
import { isPlaying, subscribePlaying } from "@/lib/badge-events";
import { cn } from "@/lib/cn";
import { projectPublicUrl, sitePath } from "@/lib/host";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/umami";

// The winner's popup (#30, PR 3). Mounted once in HomeShell for signed-in accounts.
//
// When a game the account owns gets an award, the owner sees this popup once, the next time they open
// PlayInWeb (or move to another page). It waits while a game runs and while another popup (a badge
// spotlight, say) is open. Showing it marks the award seen, so it never comes back on any device; the
// bell keeps a notice.

const CHECK_GAP_MS = 15_000;
// Awards already shown in this tab: every page mounts its own HomeShell.
const shownThisTab = new Set<string>();

/** True while another modal dialog (a badge spotlight, a form) is open. Checked twice a second. */
function useOtherDialogOpen(active: boolean) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (!active) return;
    const check = () => setOpen(Boolean(document.querySelector('[role="dialog"][data-state="open"]')));
    const first = window.setTimeout(check, 0);
    const id = window.setInterval(check, 500);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [active]);
  return open;
}

export function AwardCelebration() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const pathname = usePathname();
  const playing = useSyncExternalStore(subscribePlaying, isPlaying, () => false);
  const [state, setState] = useState<{ owner: string | null; queue: MyAwardRow[] }>({ owner: null, queue: [] });
  const lastCheck = useRef(0);

  /** Fetches the account's unseen awards; null when there is nothing new or it is too soon to ask again. */
  const load = useCallback(async (): Promise<MyAwardRow[] | null> => {
    if (!userId) return null;
    const now = Date.now();
    if (now - lastCheck.current < CHECK_GAP_MS) return null;
    lastCheck.current = now;
    const { data, error } = await createClient().rpc("my_awards");
    if (error || !data?.length) return null;
    const fresh = data.filter((row) => !shownThisTab.has(row.id));
    return fresh.length ? fresh : null;
  }, [userId]);

  const check = useCallback(
    () =>
      load().then((fresh) => {
        if (!fresh) return;
        setState((s) => {
          const queue = s.owner === userId ? s.queue : [];
          const queued = new Set(queue.map((r) => r.id));
          const add = fresh.filter((r) => !queued.has(r.id));
          return add.length ? { owner: userId, queue: [...queue, ...add] } : s;
        });
      }),
    [load, userId],
  );

  useEffect(() => {
    void check();
  }, [check, pathname]);

  const queue = state.owner === userId ? state.queue : [];
  const waiting = queue[0];
  const otherDialog = useOtherDialogOpen(Boolean(waiting) && !playing);
  // Once it opens it stays open, even though its own dialog now counts as "another dialog".
  const [showing, setShowing] = useState<string | null>(null);
  if (waiting && showing !== waiting.id && !playing && !otherDialog) setShowing(waiting.id);
  const current = waiting && showing === waiting.id ? waiting : undefined;

  // Mark it seen the moment it appears.
  useEffect(() => {
    if (!current || shownThisTab.has(current.id)) return;
    shownThisTab.add(current.id);
    trackEvent("award-winner-popup", { award: current.award_slug });
    void markAwardsSeen(createClient(), [current.id]);
  }, [current]);

  const done = useCallback(() => {
    setShowing(null);
    setState((s) => ({ ...s, queue: s.queue.slice(1) }));
  }, []);

  if (!current) return null;
  return (
    <PortalScope>
      <WinnerDialog key={current.id} row={current} onDone={done} />
    </PortalScope>
  );
}

function WinnerDialog({ row, onDone }: { row: MyAwardRow; onDone: () => void }) {
  const container = usePortalContainer();
  const award: GameAward = {
    id: row.id,
    slug: row.award_slug,
    name: row.award_name,
    description: "",
    howChosen: "",
    citation: row.citation,
    awardedAt: row.awarded_at,
    medal: medalFromJson(null),
  };
  const gameUrl = projectPublicUrl(row.owner_handle, row.slug);
  return (
    <RDialog.Root open onOpenChange={(next) => !next && onDone()}>
      <RDialog.Portal container={container}>
        <RDialog.Overlay className="fixed inset-0 z-[var(--pw-z-dialog)] bg-pw-overlay backdrop-blur-[2px] motion-safe:animate-[pw-fade-in_0.2s_var(--pw-ease-out)]" />
        <RDialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed top-1/2 left-1/2 z-[var(--pw-z-dialog)] flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 flex-col items-center overflow-hidden overflow-y-auto rounded-pw-2xl px-6 pb-7 text-center sm:px-9",
            floatingSurface,
            "border-[rgba(255,182,65,0.4)] motion-safe:animate-[pw-dialog-in_0.25s_var(--pw-ease-out)]",
            focusRing,
          )}
        >
          <Rays />
          <div className="relative h-[230px] w-[260px] flex-none">
            <AwardMedal3D
              award={award}
              gameTitle={row.title}
              layout={{ ribbonLength: 0.5, spread: 0.35, size: 1.05, frameHalf: 0, lamp: false }}
              className="size-full"
              fallbackClassName="mt-2 h-[210px] w-auto"
            />
            <div
              aria-hidden
              className="absolute -top-px left-1/2 h-3 w-24 -translate-x-1/2 rounded-b-[8px] border border-t-0 border-[rgba(255,182,65,0.6)] bg-[#02060e] shadow-[inset_0_3px_6px_rgba(0,0,0,0.85)]"
            />
          </div>
          <div className="absolute top-3 right-3">
            <RDialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <IconClose />
              </Button>
            </RDialog.Close>
          </div>
          <span className="relative mt-2 font-pw-pixel text-pw-label tracking-[0.08em] text-pw-highlight-ink uppercase">Your game is now</span>
          <RDialog.Title className="relative mt-2.5 font-pw-display text-[clamp(34px,8vw,44px)] leading-[0.95] font-extrabold text-pw-text uppercase italic">
            {row.award_name}
          </RDialog.Title>
          <p className="relative mt-2.5 text-pw-body text-pw-text-soft">
            <strong className="font-semibold text-pw-text">{row.title}</strong> · picked by the PlayInWeb team
          </p>
          {row.citation ? <p className="relative mt-3 text-pw-body-sm leading-relaxed text-pw-muted">“{row.citation}”</p> : null}
          <div className="relative mt-6 flex w-full flex-col gap-2">
            <ShareAwardButton
              gameUrl={gameUrl}
              gameTitle={row.title}
              awardName={row.award_name}
              from="winner"
              label="Share the news"
              variant="highlight"
              size="lg"
              className="w-full"
            />
            <Button variant="secondary" asChild className="w-full">
              <Link href={`${sitePath(row.owner_handle, row.slug)}#awards`} onClick={onDone}>
                See it on the game page
              </Link>
            </Button>
          </div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
