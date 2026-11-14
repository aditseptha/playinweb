// The thin progress bar at the top of the page (#45). Game and profile pages have no loading.tsx on
// purpose (it would turn 404s and redirects into 200s), so a click on a link to them shows nothing
// until the server answers. The bar shows that the click landed.
//
// NavProgress starts the bar on clicks on same-site links and stops it when the address changes.
// Code that navigates with router.push calls startNavigation() itself.

type Listener = (running: boolean) => void;

let running = false;
const listeners = new Set<Listener>();

function set(next: boolean) {
  if (running === next) return;
  running = next;
  for (const l of listeners) l(next);
}

/**
 * Call before router.push to a page that may take a moment. Pass where it goes: going to the page
 * you are already on never changes the address, so the bar would wait for nothing.
 */
export function startNavigation(to?: string) {
  if (to && typeof window !== "undefined") {
    const next = new URL(to, window.location.href);
    if (next.pathname === window.location.pathname && next.search === window.location.search) return;
  }
  set(true);
}

export function finishNavigation() {
  set(false);
}

export function subscribeNavigation(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type LinkClick = {
  /** The link's resolved href (anchor.href), or null when it has none. */
  href: string | null;
  target: string | null;
  download: boolean;
  button: number;
  modified: boolean;
  defaultPrevented: boolean;
};

/**
 * Does this click start a navigation inside the app that the bar should show? Not when the browser
 * handles it (new tab, download, another site) or when it stays on the same page (same address or
 * a #hash), because then the address never changes and the bar would never stop.
 */
export function startsNavigation(click: LinkClick, current: string): boolean {
  if (!click.href || click.defaultPrevented || click.button !== 0 || click.modified || click.download) return false;
  if (click.target && click.target !== "_self") return false;
  let to: URL;
  let from: URL;
  try {
    from = new URL(current);
    to = new URL(click.href, from);
  } catch {
    return false;
  }
  if (to.origin !== from.origin) return false;
  if (to.protocol !== "http:" && to.protocol !== "https:") return false;
  return to.pathname !== from.pathname || to.search !== from.search;
}
