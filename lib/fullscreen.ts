// Dialogs and a fullscreen game both want the whole screen (#38).
//
// While an element is fullscreen, the browser only shows that element, so a dialog rendered into
// <body> is invisible. The CSS fallback fullscreen used on iPhone (z-index 100) covers dialogs too.
// A guest whose play time ran out would see the game stop with no visible way to sign in.
//
// So every dialog that opens leaves fullscreen first: the real one through the Fullscreen API, and
// the fallback through an event the game stage listens for.
import { useEffect } from "react";

const LEAVE = "playinweb:leave-fullscreen";

export function leaveFullscreen() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LEAVE));
  if (typeof document !== "undefined" && document.fullscreenElement) {
    void document.exitFullscreen().catch(() => {});
  }
}

export function onLeaveFullscreen(listener: () => void) {
  window.addEventListener(LEAVE, listener);
  return () => window.removeEventListener(LEAVE, listener);
}

/** For dialogs: leave fullscreen whenever `open` turns true. */
export function useLeaveFullscreen(open: boolean) {
  useEffect(() => {
    if (open) leaveFullscreen();
  }, [open]);
}
