/** TODO: restore to `5 * 60 * 1000` after guest-play testing. */
export const GUEST_PLAY_LIMIT_MS = 5 * 1000;

const STORAGE_KEY = `showcase.guest-play.${GUEST_PLAY_LIMIT_MS}`;

export function guestPlayUsedMs() {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function guestPlayRemainingMs() {
  return Math.max(0, GUEST_PLAY_LIMIT_MS - guestPlayUsedMs());
}

export function guestPlayExpired() {
  return guestPlayUsedMs() >= GUEST_PLAY_LIMIT_MS;
}

export function addGuestPlayMs(ms: number) {
  if (ms <= 0) return guestPlayUsedMs();
  const next = Math.min(GUEST_PLAY_LIMIT_MS, guestPlayUsedMs() + ms);
  try {
    window.localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}
