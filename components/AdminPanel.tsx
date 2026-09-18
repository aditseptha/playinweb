"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { formatMoney, formatPlays } from "@/lib/format";
import { useFeatures } from "@/lib/features";
import { projectPublicUrl, siteOrigin } from "@/lib/host";
import { isDummyDonation, isDummyPayout, isDummyProjectId, isDummyUser } from "@/lib/dummy-seed";
import { createClient } from "@/lib/supabase/client";

type Overview = {
  users: number;
  users_today: number;
  users_week: number;
  games: number;
  published: number;
  views: number;
  plays: number;
};

type AdminUser = {
  id: string;
  email: string | null;
  handle: string | null;
  display_name: string | null;
  country: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

type AdminReport = {
  id: string;
  email: string;
  subject: string;
  details: string;
  created_at: string;
};

type AdminPayout = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  creator_email: string | null;
  creator_handle: string | null;
};

type AdminDonation = {
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

type AdminTip = {
  id: string;
  amount: number;
  created_at: string;
  donor_email: string | null;
  donor_handle: string | null;
};

type AdminGame = {
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

export function AdminPanel() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab = rawTab === "reports" || rawTab === "features" ? rawTab : "overview";
  const { features, setFlags } = useFeatures();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [games, setGames] = useState<AdminGame[] | null>(null);
  const [donations, setDonations] = useState<AdminDonation[] | null>(null);
  const [tips, setTips] = useState<AdminTip[] | null>(null);
  const [payouts, setPayouts] = useState<AdminPayout[] | null>(null);
  const [commission, setCommission] = useState("10");
  const [commissionSaved, setCommissionSaved] = useState("");
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    Promise.all([
      supabase.rpc("admin_overview"),
      supabase.rpc("admin_list_users"),
      supabase
        .from("projects")
        .select("id, title, slug, published, created_at, view_count, play_count, profiles!projects_owner_id_fkey ( handle, display_name )")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("donations")
        .select("id, amount, commission_pct, created_at, donor_email, donor_handle, creator_name, creator_handle, game_title, game_slug")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("site_settings").select("value").eq("id", "donation_commission_pct").maybeSingle(),
      supabase
        .from("payouts")
        .select("id, amount, status, created_at, creator_email, creator_handle")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("tips")
        .select("id, amount, created_at, donor_email, donor_handle")
        .order("created_at", { ascending: false })
        .limit(200),
    ]).then(([overviewRes, usersRes, gamesRes, donationsRes, commissionRes, payoutsRes, tipsRes]) => {
      if (cancelled) return;
      if (overviewRes.error || usersRes.error || gamesRes.error) {
        setError("Could not load admin data.");
        setOverview(null);
        setUsers([]);
        setGames([]);
        setDonations([]);
        setTips([]);
        setPayouts([]);
        return;
      }
      setOverview(asOverview(overviewRes.data));
      setUsers(asUsers(usersRes.data));
      setGames(asGames(gamesRes.data));
      setDonations(((donationsRes.data ?? []) as AdminDonation[]).filter((row) => !isDummyDonation(row)));
      setTips((tipsRes.data ?? []) as AdminTip[]);
      setPayouts(((payoutsRes.data ?? []) as AdminPayout[]).filter((row) => !isDummyPayout(row)));
      if (commissionRes.data?.value != null) setCommission(String(commissionRes.data.value));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (tab !== "reports") return;
    const supabase = createClient();
    let cancelled = false;
    supabase
      .from("issue_reports")
      .select("id, email, subject, details, created_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error: loadError }) => {
        if (cancelled) return;
        if (loadError) {
          setError("Could not load reports.");
          setReports([]);
          return;
        }
        setError("");
        setReports((data ?? []) as AdminReport[]);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  async function saveCommission() {
    const next = Math.min(100, Math.max(0, Number(commission)));
    if (!Number.isFinite(next)) return;
    setCommission(String(next));
    const { error: saveError } = await createClient()
      .from("site_settings")
      .update({ value: next })
      .eq("id", "donation_commission_pct");
    setCommissionSaved(saveError ? "Could not save commission." : "Commission saved. New donations use this rate.");
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1100px]">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-display font-semibold tracking-tight">Admin</h1>
        <Segmented
          aria-label="Admin menu"
          value={tab}
          options={[
            { value: "overview", label: "Overview", href: "/admin" },
            { value: "reports", label: "Reported issue", href: "/admin?tab=reports" },
            { value: "features", label: "Feature list", href: "/admin?tab=features" },
          ]}
        />
      </div>

      {error ? <p className="mt-6 text-ui text-danger">{error}</p> : null}

      {tab === "reports" ? <ReportsTable reports={reports} /> : null}
      {tab === "features" ? <FeatureList features={features} setFlags={setFlags} /> : null}
      {tab === "overview" ? (
        <>

      <div className="mt-8 grid grid-cols-3 gap-2 lg:grid-cols-6">
        <Tile value={overview ? formatPlays(overview.users) : "—"} label="Users" hint="All accounts" />
        <Tile value={overview ? formatPlays(overview.users_week) : "—"} label="New this week" hint="Last 7 days" />
        <Tile value={overview ? formatPlays(overview.users_today) : "—"} label="New today" hint="UTC day" />
        <Tile value={overview ? formatPlays(overview.games) : "—"} label="Games" hint={`${overview?.published ?? "—"} public`} />
        <Tile value={overview ? formatPlays(overview.views) : "—"} label="Views" hint="Page visits" tone="text-sky-300" />
        <Tile value={overview ? formatPlays(overview.plays) : "—"} label="Plays" hint="Session plays" tone="text-emerald-300" />
      </div>

      <section className="mt-10">
        <h2 className="text-title font-semibold tracking-tight">New users</h2>
        <div className="mt-4 overflow-x-auto rounded-panel bg-surface">
          <table className="w-full min-w-[40rem] text-left text-ui">
            <thead className="text-caption text-text-subtle">
              <tr className="border-b border-border">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Registered</th>
                <th className="px-4 py-3 font-medium">Last login</th>
              </tr>
            </thead>
            <tbody>
              {users === null ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-text-muted">
                    Loading users…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-text-muted">
                    No accounts yet.
                  </td>
                </tr>
              ) : (
                users.map((row) => (
                  <tr key={row.id} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3">
                      <p className="truncate font-medium">{row.email || "—"}</p>
                      {row.handle ? (
                        <Link
                          href={siteOrigin(row.handle)}
                          className="block truncate text-caption text-text-subtle hover:text-text"
                        >
                          @{row.handle}
                        </Link>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{row.country || "—"}</td>
                    <td className="px-4 py-3 text-text-muted">{formatWhen(row.created_at)}</td>
                    <td className="px-4 py-3 text-text-muted">{formatWhen(row.last_sign_in_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-title font-semibold tracking-tight">New games registered</h2>
        <div className="mt-4 overflow-x-auto rounded-panel bg-surface">
          <table className="w-full min-w-[40rem] text-left text-ui">
            <thead className="text-caption text-text-subtle">
              <tr className="border-b border-border">
                <th className="px-4 py-3 font-medium">Game</th>
                <th className="px-4 py-3 font-medium">Creator</th>
                <th className="px-4 py-3 font-medium">Visibility</th>
                <th className="px-4 py-3 font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {games === null ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-text-muted">
                    Loading games…
                  </td>
                </tr>
              ) : games.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-text-muted">
                    No games yet.
                  </td>
                </tr>
              ) : (
                games.map((row) => (
                  <tr key={row.id} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3">
                      <p className="truncate font-medium">{row.title}</p>
                      {row.handle ? (
                        <Link
                          href={projectPublicUrl(row.handle, row.slug)}
                          className="block truncate text-caption text-text-subtle hover:text-text"
                        >
                          @{row.handle}/{row.slug}
                        </Link>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{row.display_name || row.handle || "—"}</td>
                    <td className="px-4 py-3 text-text-muted">{row.published ? "Public" : "Private"}</td>
                    <td className="px-4 py-3 text-text-muted">{formatWhen(row.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <DonationRecords
        rows={donations}
        commission={commission}
        saved={commissionSaved}
        onCommissionChange={setCommission}
        onSave={() => void saveCommission()}
      />
      <TipRecords rows={tips} />
      <PayoutRecords rows={payouts} />
        </>
      ) : null}
    </div>
  );
}

function DonationRecords({
  rows,
  commission,
  saved,
  onCommissionChange,
  onSave,
}: {
  rows: AdminDonation[] | null;
  commission: string;
  saved: string;
  onCommissionChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <section className="mt-10">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-title font-semibold tracking-tight">Donation records</h2>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <label className="text-caption text-text-subtle" htmlFor="commission-pct">
            Commission
          </label>
          <div className="relative">
            <TextInput
              id="commission-pct"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={commission}
              onChange={(e) => onCommissionChange(e.target.value)}
              className="!w-20 pr-7"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-caption text-text-subtle">
              %
            </span>
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Save
          </Button>
        </form>
      </div>
      {saved ? <p className="mt-2 text-caption text-text-muted">{saved}</p> : null}
      <div className="mt-4 overflow-x-auto rounded-panel bg-surface">
        <table className="w-full min-w-[52rem] text-left text-ui">
          <thead className="text-caption text-text-subtle">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium">From</th>
              <th className="px-4 py-3 font-medium">To</th>
              <th className="px-4 py-3 font-medium">Game</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Commission</th>
              <th className="px-4 py-3 font-medium">Creator gets</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-text-muted">
                  Loading donations…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-text-muted">
                  No donations yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const pct = Number(row.commission_pct) || 0;
                const creatorGets = Number(row.amount) * (1 - pct / 100);
                return (
                  <tr key={row.id} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3">
                      <p className="truncate font-medium">{row.donor_email || "—"}</p>
                      {row.donor_handle ? (
                        <Link
                          href={siteOrigin(row.donor_handle)}
                          className="block truncate text-caption text-text-subtle hover:text-text"
                        >
                          @{row.donor_handle}
                        </Link>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate font-medium">{row.creator_name || row.creator_handle || "—"}</p>
                      {row.creator_handle ? (
                        <Link
                          href={siteOrigin(row.creator_handle)}
                          className="block truncate text-caption text-text-subtle hover:text-text"
                        >
                          @{row.creator_handle}
                        </Link>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {row.creator_handle && row.game_slug ? (
                        <Link
                          href={projectPublicUrl(row.creator_handle, row.game_slug)}
                          className="truncate font-medium hover:text-text-muted"
                        >
                          {row.game_title || "Untitled"}
                        </Link>
                      ) : (
                        <p className="truncate font-medium">{row.game_title || "Untitled"}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular">{formatMoney(Number(row.amount))}</td>
                    <td className="px-4 py-3 text-text-muted tabular">{pct}%</td>
                    <td className="px-4 py-3 tabular">{formatMoney(creatorGets)}</td>
                    <td className="px-4 py-3 text-text-muted">{formatWhen(row.created_at)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TipRecords({ rows }: { rows: AdminTip[] | null }) {
  return (
    <section className="mt-10">
      <h2 className="text-title font-semibold tracking-tight">Tip history</h2>
      <div className="mt-4 overflow-x-auto rounded-panel bg-surface">
        <table className="w-full min-w-[36rem] text-left text-ui">
          <thead className="text-caption text-text-subtle">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium">From</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-text-muted">
                  Loading tips…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-text-muted">
                  No tips yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3">
                    <p className="truncate font-medium">{row.donor_email || "—"}</p>
                    {row.donor_handle ? (
                      <Link
                        href={siteOrigin(row.donor_handle)}
                        className="block truncate text-caption text-text-subtle hover:text-text"
                      >
                        @{row.donor_handle}
                      </Link>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 tabular">{formatMoney(Number(row.amount))}</td>
                  <td className="px-4 py-3 text-text-muted">{formatWhen(row.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PayoutRecords({ rows }: { rows: AdminPayout[] | null }) {
  return (
    <section className="mt-10">
      <h2 className="text-title font-semibold tracking-tight">Payout history</h2>
      <div className="mt-4 overflow-x-auto rounded-panel bg-surface">
        <table className="w-full min-w-[36rem] text-left text-ui">
          <thead className="text-caption text-text-subtle">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium">Creator</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-text-muted">
                  Loading payouts…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-text-muted">
                  No payouts yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3">
                    <p className="truncate font-medium">{row.creator_email || "—"}</p>
                    {row.creator_handle ? (
                      <Link
                        href={siteOrigin(row.creator_handle)}
                        className="block truncate text-caption text-text-subtle hover:text-text"
                      >
                        @{row.creator_handle}
                      </Link>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 tabular">{formatMoney(Number(row.amount))}</td>
                  <td className="px-4 py-3 text-text-muted">{row.status}</td>
                  <td className="px-4 py-3 text-text-muted">{formatWhen(row.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FeatureList({
  features,
  setFlags,
}: {
  features: { id: string; label: string; description: string; soon: boolean; hidden: boolean }[];
  setFlags: (id: string, flags: { hidden?: boolean; soon?: boolean }) => Promise<void>;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-title font-semibold tracking-tight">Feature list</h2>
      <ul className="mt-4 divide-y divide-border overflow-hidden rounded-panel bg-surface">
        {features.map((feature) => (
          <li key={feature.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-ui font-medium">{feature.label}</p>
              <p className="mt-0.5 text-caption text-text-subtle">{feature.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <FlagToggle
                label="Soon"
                on={feature.soon}
                onClick={() => void setFlags(feature.id, { soon: !feature.soon })}
              />
              <FlagToggle
                label="Hide"
                on={feature.hidden}
                onClick={() => void setFlags(feature.id, { hidden: !feature.hidden })}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReportsTable({ reports }: { reports: AdminReport[] | null }) {
  return (
    <section className="mt-8">
      <h2 className="text-title font-semibold tracking-tight">Reported issue</h2>
      <div className="mt-4 overflow-x-auto rounded-panel bg-surface">
        <table className="w-full min-w-[40rem] text-left text-ui">
          <thead className="text-caption text-text-subtle">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Details</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {reports === null ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-text-muted">
                  Loading reports…
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-text-muted">
                  No reports yet.
                </td>
              </tr>
            ) : (
              reports.map((row) => (
                <tr key={row.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3 text-text-muted">{row.email || "—"}</td>
                  <td className="px-4 py-3 font-medium">{row.subject}</td>
                  <td className="max-w-sm px-4 py-3 whitespace-pre-wrap text-text-muted">{row.details}</td>
                  <td className="px-4 py-3 text-text-muted">{formatWhen(row.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Tile({
  value,
  label,
  hint,
  tone,
}: {
  value: string;
  label: string;
  hint: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-surface px-3 py-3">
      <p className={`text-title font-semibold tabular leading-none ${tone ?? "text-text"}`}>{value}</p>
      <p className="mt-1 truncate text-caption font-medium">{label}</p>
      <p className="truncate text-meta text-text-subtle">{hint}</p>
    </div>
  );
}

function FlagToggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full px-3 py-1.5 text-caption font-medium ${
        on ? "bg-accent text-accent-fg" : "bg-surface-2 text-text-muted hover:text-text"
      }`}
    >
      {label}
    </button>
  );
}

function asUsers(raw: unknown): AdminUser[] {
  if (!Array.isArray(raw)) return [];
  return [...(raw as AdminUser[])]
    .filter((row) => !isDummyUser(row))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

function asGames(raw: unknown): AdminGame[] {
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

function asOverview(raw: unknown): Overview {
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

function formatWhen(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
