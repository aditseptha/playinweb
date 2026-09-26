export type ShowcaseRange = "all" | "today" | "week";

export type ShowcaseBidRow = {
  project_id: string;
  amount: number;
  created_at: string;
};

export type ShowcaseBid = {
  amount: number;
  at: number;
};

function startOfTodayMs() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeekMs() {
  return Date.now() - 7 * 86_400_000;
}

export function showcaseRangeCutoffMs(range: ShowcaseRange) {
  if (range === "today") return startOfTodayMs();
  if (range === "week") return startOfWeekMs();
  return 0;
}

export function aggregateShowcaseBids(rows: ShowcaseBidRow[], range: ShowcaseRange) {
  const cutoff = showcaseRangeCutoffMs(range);
  const byProject = new Map<string, ShowcaseBid>();
  for (const row of rows) {
    const at = Date.parse(row.created_at);
    if (!Number.isFinite(at) || (cutoff > 0 && at < cutoff)) continue;
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const existing = byProject.get(row.project_id);
    if (!existing || amount > existing.amount) {
      byProject.set(row.project_id, { amount, at });
    }
  }
  return Object.fromEntries(byProject);
}

export function topShowcaseBidAmount(bids: Record<string, ShowcaseBid>) {
  let top = 0;
  for (const bid of Object.values(bids)) {
    if (bid.amount > top) top = bid.amount;
  }
  return top;
}

export function minShowcaseClaimAmount(topBid: number) {
  return Math.max(1, Math.floor(topBid) + 1);
}
