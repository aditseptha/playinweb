import { MOSAIC_TOTAL_MS, mosaicKeyframes } from "./theme-transition";

export const THEME_KEY = "showcase-theme";

export type Theme = "dark" | "light";

export const THEME_BOOT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark")t="dark";var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.classList.toggle("light",t==="light");}catch(e){}})();`;

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}

/**
 * Flips the theme from a toggle button. The new theme arrives square by square from the button,
 * led by a band of brand-blue squares like the footer mosaic (lib/theme-transition.ts).
 * Reduced motion gets a short crossfade; browsers without View Transitions switch instantly.
 */
export function switchTheme(origin?: Element | null) {
  const root = document.documentElement;
  const next: Theme = root.classList.contains("dark") ? "light" : "dark";
  const commit = () => {
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    applyTheme(next);
  };

  if (typeof document.startViewTransition !== "function") {
    commit();
    return;
  }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    // The browser's default crossfade; globals.css shortens it.
    document.startViewTransition(commit);
    return;
  }

  const rect = origin?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 40;
  const y = rect ? rect.top + rect.height / 2 : 40;
  const { oldFrames, newFrames } = mosaicKeyframes(x, y, window.innerWidth, window.innerHeight);

  root.dataset.themeReveal = "";
  const transition = document.startViewTransition(commit);
  transition.ready
    .then(() => {
      const timing = { duration: MOSAIC_TOTAL_MS, fill: "forwards" as const };
      root.animate(oldFrames, { ...timing, pseudoElement: "::view-transition-old(root)" });
      root.animate(newFrames, { ...timing, pseudoElement: "::view-transition-new(root)" });
    })
    .catch(() => {});
  transition.finished.finally(() => delete root.dataset.themeReveal);
}
