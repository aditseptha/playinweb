"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Loading timing rule: show an indicator only if loading lasts longer than `delay` (no flash
 * for fast responses), and once shown keep it for at least `min` (no flicker).
 */
export function useDelayedFlag(active: boolean, { delay = 200, min = 400 } = {}) {
  const [shown, setShown] = useState(false);
  const [shownAt, setShownAt] = useState(0);

  useEffect(() => {
    if (active && !shown) {
      const t = window.setTimeout(() => {
        setShown(true);
        setShownAt(Date.now());
      }, delay);
      return () => window.clearTimeout(t);
    }
    if (!active && shown) {
      const left = Math.max(0, min - (Date.now() - shownAt));
      const t = window.setTimeout(() => setShown(false), left);
      return () => window.clearTimeout(t);
    }
  }, [active, shown, shownAt, delay, min]);

  return shown;
}

/**
 * Warns before the tab closes or reloads while a form has unsaved changes. For in-app links,
 * check `dirty` in the link's onNavigate and ask with a ConfirmDialog.
 */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** True while the browser reports a network connection. Always true during server render. */
export function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}
