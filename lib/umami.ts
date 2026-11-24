const WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim() || "";
const SCRIPT_URL = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL?.trim() || "https://cloud.umami.is/script.js";
const SHARE_URL = process.env.NEXT_PUBLIC_UMAMI_SHARE_URL?.trim() || "";

export function umamiEnabled() {
  return Boolean(WEBSITE_ID);
}

export function umamiWebsiteId() {
  return WEBSITE_ID;
}

export function umamiScriptUrl() {
  return SCRIPT_URL;
}

/** Public share / dashboard link opened from “View stats”. */
export function umamiShareUrl() {
  return SHARE_URL;
}

type UmamiWindow = Window & { umami?: { track: (event: string, data?: Record<string, string | number>) => void } };

/** Records a custom event in Umami, when the script is on the page. Never throws. */
export function trackEvent(event: string, data?: Record<string, string | number>) {
  if (typeof window === "undefined") return;
  try {
    (window as UmamiWindow).umami?.track(event, data);
  } catch {
    /* analytics must never break the page */
  }
}
