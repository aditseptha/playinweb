import { fetchUmamiVisitors, umamiStatsConfigured } from "@/lib/umami-server";

export async function GET() {
  if (!umamiStatsConfigured()) {
    return Response.json({ ok: false, visitors: null }, { status: 503 });
  }

  const visitors = await fetchUmamiVisitors();
  if (visitors === null) {
    return Response.json({ ok: false, visitors: null }, { status: 502 });
  }

  return Response.json(
    { ok: true, visitors },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
  );
}
