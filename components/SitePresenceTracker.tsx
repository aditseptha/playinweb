"use client";

import { useSiteOnlineCount } from "@/lib/site-presence";

/** Registers this tab on the global site-presence channel (counts toward “online”). */
export function SitePresenceTracker() {
  useSiteOnlineCount();
  return null;
}
