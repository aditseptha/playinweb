// Small browser-side signals for badge popups (#30).
//
// requestBadgeCheck(): call after an action that can earn a badge (a like, a comment, a recorded
// play, a profile save). The popup host fetches the account's badges right away.
//
// setPlaying(): the game page reports while a game runs, so popups wait until play stops.

const CHECK_EVENT = "playinweb:badge-check";

export function requestBadgeCheck() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHECK_EVENT));
}

export function onBadgeCheck(listener: () => void) {
  window.addEventListener(CHECK_EVENT, listener);
  return () => window.removeEventListener(CHECK_EVENT, listener);
}

let playing = false;
const playListeners = new Set<() => void>();

export function setPlaying(next: boolean) {
  if (playing === next) return;
  playing = next;
  for (const l of playListeners) l();
}

export function isPlaying() {
  return playing;
}

/** For useSyncExternalStore. */
export function subscribePlaying(listener: () => void) {
  playListeners.add(listener);
  return () => {
    playListeners.delete(listener);
  };
}
