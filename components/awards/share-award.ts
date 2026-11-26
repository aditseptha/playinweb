// Sharing an award (#30, PR 3). Only the game's owner gets the button.
import { awardShareText, awardShareUrl } from "@/lib/awards";
import { trackEvent } from "@/lib/umami";

export type ShareResult = "shared" | "copied" | "cancelled";

/**
 * Phones get the system share sheet; computers copy the text and link. The link carries Umami tags
 * (utm_source=share, utm_medium=<from>, utm_campaign=best-of-playinweb), and the share is counted as
 * the "award-share" event.
 */
export async function shareAward({ gameUrl, gameTitle, awardName, from }: { gameUrl: string; gameTitle: string; awardName: string; from: string }): Promise<ShareResult> {
  const url = awardShareUrl(gameUrl, from);
  const text = awardShareText(gameTitle, awardName);
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: `${gameTitle}: ${awardName}`, text, url });
      trackEvent("award-share", { from, method: "sheet" });
      return "shared";
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
  } catch {
    window.prompt("Copy this and share it", `${text} ${url}`);
  }
  trackEvent("award-share", { from, method: "copy" });
  return "copied";
}
