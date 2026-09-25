const API_KEY = process.env.UMAMI_API_KEY?.trim() || "";
const WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim() || "";

function apiOrigin() {
  const explicit = process.env.UMAMI_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const share = process.env.NEXT_PUBLIC_UMAMI_SHARE_URL?.trim() || "";
  const region = share.match(/\/analytics\/(us|eu)\//i)?.[1]?.toLowerCase();
  return region ? `https://api.umami.is/v1/${region}` : "https://api.umami.is/v1";
}

export function umamiStatsConfigured() {
  return Boolean(API_KEY && WEBSITE_ID);
}

export async function fetchUmamiVisitors(): Promise<number | null> {
  if (!umamiStatsConfigured()) return null;

  const endAt = Date.now();
  const startAt = Date.UTC(2020, 0, 1);
  const url = `${apiOrigin()}/websites/${WEBSITE_ID}/stats?startAt=${startAt}&endAt=${endAt}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { visitors?: number };
  return typeof data.visitors === "number" && Number.isFinite(data.visitors) ? data.visitors : null;
}
