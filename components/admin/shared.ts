import { isDummyProjectId, isDummyUser } from "@/lib/dummy-seed";

export type Overview = {
  users: number;
  users_today: number;
  users_week: number;
  games: number;
  published: number;
  views: number;
  plays: number;
};

export type AdminUser = {
  id: string;
  email: string | null;
  handle: string | null;
  display_name: string | null;
  country: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

export type AdminReport = {
  id: string;
  email: string;
  subject: string;
  details: string;
  created_at: string;
};

export type AdminPayout = {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  creator_email: string | null;
  creator_handle: string | null;
};

export type AdminDonation = {
  id: string;
  amount: number;
  commission_pct: number;
  created_at: string;
  donor_email: string | null;
  donor_handle: string | null;
  creator_name: string | null;
  creator_handle: string | null;
  game_title: string | null;
  game_slug: string | null;
};

export type AdminDonationWithOwner = AdminDonation & {
  owner_id: string;
};

export type AdminWallet = {
  user_id: string;
  email: string | null;
  handle: string | null;
  display_name: string | null;
  wallet_address: string | null;
  donation_count: number;
  gross_total: number;
  commission_total: number;
  earned_total: number;
  paid_out: number;
  outstanding: number;
};

export type AdminTip = {
  id: string;
  amount: number;
  created_at: string;
  donor_email: string | null;
  donor_handle: string | null;
};

export type AdminGame = {
  id: string;
  title: string;
  slug: string;
  handle: string | null;
  display_name: string | null;
  published: boolean;
  created_at: string;
  view_count: number;
  play_count: number;
};

export function asUsers(raw: unknown): AdminUser[] {
  if (!Array.isArray(raw)) return [];
  return [...(raw as AdminUser[])]
    .filter((row) => !isDummyUser(row))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function asGames(raw: unknown): AdminGame[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? "");
    if (isDummyProjectId(id)) return [];
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const person = profile && typeof profile === "object" ? (profile as Record<string, unknown>) : {};
    const handle = typeof person.handle === "string" ? person.handle : null;
    if (handle && ["pixelbarn", "mayaok", "riocode"].includes(handle)) return [];
    return [
      {
        id,
        title: String(row.title ?? "Untitled"),
        slug: String(row.slug ?? ""),
        handle,
        display_name: typeof person.display_name === "string" ? person.display_name : null,
        published: Boolean(row.published),
        created_at: String(row.created_at ?? ""),
        view_count: num(row.view_count),
        play_count: num(row.play_count),
      },
    ];
  });
}

export function asOverview(raw: unknown): Overview {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    users: num(row.users),
    users_today: num(row.users_today),
    users_week: num(row.users_week),
    games: num(row.games),
    published: num(row.published),
    views: num(row.views),
    plays: num(row.plays),
  };
}

function num(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function formatWhen(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
