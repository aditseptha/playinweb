export const THEME_KEY = "showcase-theme";

export type Theme = "dark" | "light";

export const THEME_BOOT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark")t="dark";var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.classList.toggle("light",t==="light");}catch(e){}})();`;

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}

/** Same curve as the homepage's entrances (home.module.css). */
const THEME_EASE = "cubic-bezier(0.2, 0.7, 0.2, 1)";
/** Long enough for the circle to cross a full screen; it's a rare action, so it can take a moment. */
const THEME_REVEAL_MS = 480;

/**
 * Flips the theme from a toggle button. The new theme spreads out from the button as a circle,
 * like dusk falling from the moon or dawn rising from the sun. Reduced motion gets a short
 * crossfade; browsers without View Transitions switch instantly.
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
  // Far enough to reach the corner furthest from the button.
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  root.dataset.themeReveal = "";
  const transition = document.startViewTransition(commit);
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: THEME_REVEAL_MS, easing: THEME_EASE, pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {});
  transition.finished.finally(() => delete root.dataset.themeReveal);
}
