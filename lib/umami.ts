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
