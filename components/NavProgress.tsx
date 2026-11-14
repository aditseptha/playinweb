"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { finishNavigation, startNavigation, startsNavigation, subscribeNavigation } from "@/lib/nav-progress";

/** Fast navigations finish before the bar appears, so it never flashes. */
const SHOW_AFTER_MS = 150;
/** A navigation that never changes the address (it failed, or went nowhere) still clears the bar. */
const GIVE_UP_MS = 15_000;

/**
 * A thin bar at the top of the page while the next page loads (#45). Mounted once in the root
 * layout, inside <Suspense> because it reads the search params.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  // null: hidden. A number: how far the bar is (0 to 1).
  const [progress, setProgress] = useState<number | null>(null);

  // The address changed: the new page is in.
  useEffect(() => {
    finishNavigation();
  }, [pathname, search]);

  // Clicks on links. Capture phase, because <Link> cancels the click before it bubbles up.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor || anchor.dataset.navProgress === "off") return;
      const go = startsNavigation(
        {
          href: anchor.getAttribute("href") ? anchor.href : null,
          target: anchor.getAttribute("target"),
          download: anchor.hasAttribute("download"),
          button: event.button,
          modified: event.metaKey || event.ctrlKey || event.shiftKey || event.altKey,
          defaultPrevented: event.defaultPrevented,
        },
        window.location.href,
      );
      if (go) startNavigation();
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    let show: number | undefined;
    let trickle: number | undefined;
    let giveUp: number | undefined;
    let hide: number | undefined;
    let visible = false;

    const clear = () => {
      window.clearTimeout(show);
      window.clearInterval(trickle);
      window.clearTimeout(giveUp);
      window.clearTimeout(hide);
    };

    const off = subscribeNavigation((running) => {
      clear();
      if (running) {
        show = window.setTimeout(() => {
          visible = true;
          setProgress(0.12);
          // Creeps towards 90% and slows down, so a slow page never looks finished or stuck.
          trickle = window.setInterval(() => setProgress((p) => (p === null ? p : p + (0.9 - p) * 0.12)), 400);
        }, SHOW_AFTER_MS);
        giveUp = window.setTimeout(finishNavigation, GIVE_UP_MS);
      } else if (visible) {
        visible = false;
        setProgress(1);
        hide = window.setTimeout(() => setProgress(null), 350);
      }
    });
    return () => {
      off();
      clear();
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[1000] h-[3px]">
      <div
        data-nav-progress-bar={progress === null ? undefined : ""}
        className="h-full origin-left bg-pw-primary-hi shadow-pw-glow transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none"
        style={{
          transform: `scaleX(${progress ?? 0})`,
          opacity: progress === null || progress >= 1 ? 0 : 1,
        }}
      />
    </div>
  );
}
