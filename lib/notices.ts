import { isDummyDonation, isDummyPayout } from "@/lib/dummy-seed";
import { formatMoney } from "@/lib/format";
import { apexHref, projectPublicUrl, siteOrigin } from "@/lib/host";
import { createClient } from "@/lib/supabase/client";

export type Notice = {
  id: string;
  at: string;
  href: string;
  title: string;
  detail: string;
};

const SEEN_KEY = "playinweb.notices.seen";

export function noticesSeenAt() {
  try {
    return localStorage.getItem(SEEN_KEY) || "";
  } catch {
    return "";
  }
}

export function markNoticesSeen() {
  try {
    localStorage.setItem(SEEN_KEY, new Date().toISOString());
  } catch {
    /* ignore */
  }
}

type ProfileBit = { handle: string; display_name: string } | null;

export async function loadNotices(userId: string, admin: boolean): Promise<Notice[]> {
  const supabase = createClient();
  const { data: games } = await supabase.from("projects").select("id, title, slug").eq("owner_id", userId);
  const owned = games ?? [];
  const gameIds = owned.map((g) => g.id);
  const titleById = new Map(owned.map((g) => [g.id, g.title]));

  const [donations, comments, follows, payouts, tips, reports] = await Promise.all([
    gameIds.length
      ? supabase
          .from("donations")
          .select("id, amount, created_at, donor_handle, donor_email, game_title, game_slug, creator_handle, project_id, user_id")
          .in("project_id", gameIds)
          .neq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as never[] }),
    gameIds.length
      ? supabase
          .from("project_comments")
          .select(
            "id, body, created_at, author_id, project_id, profiles!project_comments_author_id_fkey ( handle, display_name )",
          )
          .in("project_id", gameIds)
          .neq("author_id", userId)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("profile_follows")
      .select("follower_id, created_at")
      .eq("creator_id", userId)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("payouts")
      .select("id, amount, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      ? supabase.from("tips").select("id, amount, donor_handle, donor_email, created_at").order("created_at", { ascending: false }).limit(10)
      : Promise.resolve({ data: [] as never[] }),
    admin
      ? supabase.from("issue_reports").select("id, subject, created_at").order("created_at", { ascending: false }).limit(10)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const followerIds = [...new Set((follows.data ?? []).map((row) => row.follower_id as string))];
  const { data: people } =
    followerIds.length > 0
      ? await supabase.from("profiles").select("id, handle, display_name").in("id", followerIds)
      : { data: [] as { id: string; handle: string; display_name: string }[] };
  const personById = new Map((people ?? []).map((row) => [row.id, row]));

  const out: Notice[] = [];

  for (const row of donations.data ?? []) {
    if (isDummyDonation(row)) continue;
    const who = row.donor_handle || row.donor_email || "Someone";
    const game = row.game_title || titleById.get(row.project_id) || "your game";
    const href =
      row.creator_handle && row.game_slug
        ? projectPublicUrl(row.creator_handle, row.game_slug)
        : apexHref("/donations?tab=earn");
    out.push({
      id: `donation:${row.id}`,
      at: row.created_at,
      href,
      title: `${who} donated ${formatMoney(Number(row.amount))}`,
      detail: game,
    });
  }

  for (const row of (comments.data ?? []) as {
    id: string;
    body: string;
    created_at: string;
    author_id: string;
    project_id: string;
    profiles: ProfileBit;
  }[]) {
    const who = row.profiles?.display_name || row.profiles?.handle || "Someone";
    out.push({
      id: `comment:${row.id}`,
      at: row.created_at,
      href: apexHref(`/game/${row.project_id}`),
      title: `${who} commented`,
      detail: clip(row.body, 80),
    });
  }

  for (const row of follows.data ?? []) {
    const person = personById.get(row.follower_id);
    const who = person?.display_name || person?.handle || "Someone";
    out.push({
      id: `follow:${row.follower_id}:${row.created_at}`,
      at: row.created_at,
      href: person?.handle ? siteOrigin(person.handle) : apexHref("/profile"),
      title: `${who} followed you`,
      detail: "Channel",
    });
  }

  for (const row of payouts.data ?? []) {
    if (isDummyPayout({ amount: Number(row.amount), created_at: row.created_at })) continue;
    out.push({
      id: `payout:${row.id}`,
      at: row.created_at,
      href: apexHref("/donations?tab=cashout"),
      title: row.status === "paid" ? "Payout sent" : `Payout ${row.status}`,
      detail: formatMoney(Number(row.amount)),
    });
  }

  for (const row of tips.data ?? []) {
    const who = row.donor_handle || row.donor_email || "Someone";
    out.push({
      id: `tip:${row.id}`,
      at: row.created_at,
      href: apexHref("/admin"),
      title: `${who} tipped ${formatMoney(Number(row.amount))}`,
      detail: "playinweb",
    });
  }

  for (const row of reports.data ?? []) {
    out.push({
      id: `report:${row.id}`,
      at: row.created_at,
      href: apexHref("/admin?tab=reports"),
      title: "New issue report",
      detail: row.subject,
    });
  }

  out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return out.slice(0, 25);
}

function clip(value: string, n: number) {
  const text = value.trim().replace(/\s+/g, " ");
  return text.length <= n ? text : `${text.slice(0, n - 1)}…`;
}
