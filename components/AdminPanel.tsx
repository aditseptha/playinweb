"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { DEFAULT_CASHOUT_MIN, normalizeCashoutMin, readCashoutMin } from "@/lib/cashout";
import { formatMoney, formatPlays } from "@/lib/format";
import { useFeatures } from "@/lib/features";
import { projectPublicUrl, siteOrigin } from "@/lib/host";
import { isDummyDonation, isDummyPayout, isDummyProjectId, isDummyUser } from "@/lib/dummy-seed";
import { maskEmail } from "@/lib/paypal-email";
import {
  DEFAULT_PAYOUT_FREQUENCY,
  DEFAULT_PAYOUT_HOUR_UTC,
  DEFAULT_PAYOUT_WEEKDAY,
  PAYOUT_WEEKDAYS,
  type PayoutFrequency,
  payoutAdminScheduleSummary,
  payoutFrequencyToStore,
  readPayoutSchedule,
} from "@/lib/payout-schedule";
import { fetchSiteSettings, siteSettingsSaveError, upsertSiteSettings, WALLET_SETTING_IDS } from "@/lib/site-settings";
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
  user_id: string;
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

type AdminDonationWithOwner = AdminDonation & {
  owner_id: string;
};

type AdminWallet = {
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
  const tab =
    rawTab === "reports" || rawTab === "features" || rawTab === "wallet" ? rawTab : "overview";
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
  const [wallets, setWallets] = useState<AdminWallet[] | null>(null);
  const [walletDonations, setWalletDonations] = useState<AdminDonationWithOwner[] | null>(null);
  const [walletPayouts, setWalletPayouts] = useState<AdminPayout[] | null>(null);
  const [payoutFrequency, setPayoutFrequency] = useState<PayoutFrequency>(DEFAULT_PAYOUT_FREQUENCY);
  const [payoutWeekday, setPayoutWeekday] = useState(String(DEFAULT_PAYOUT_WEEKDAY));
  const [payoutHourUtc, setPayoutHourUtc] = useState(String(DEFAULT_PAYOUT_HOUR_UTC));
  const [cashoutMin, setCashoutMin] = useState(String(DEFAULT_CASHOUT_MIN));
  const [payoutScheduleSaved, setPayoutScheduleSaved] = useState("");
  const [payoutRunBusy, setPayoutRunBusy] = useState(false);
  const [payoutRunMessage, setPayoutRunMessage] = useState("");
  const [walletReloadToken, setWalletReloadToken] = useState(0);
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
        .select("id, user_id, amount, status, created_at, creator_email, creator_handle")
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

  useEffect(() => {
    if (tab !== "wallet") return;
    const supabase = createClient();
    let cancelled = false;
    Promise.all([
      supabase.rpc("admin_list_wallets"),
      supabase
        .from("donations")
        .select(
          "id, amount, commission_pct, created_at, donor_email, donor_handle, creator_name, creator_handle, game_title, game_slug, projects!inner(owner_id)",
        )
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("payouts")
        .select("id, user_id, amount, status, created_at, creator_email, creator_handle")
        .order("created_at", { ascending: false })
        .limit(500),
      fetchSiteSettings(WALLET_SETTING_IDS.filter((id) => id !== "donation_commission_pct")),
    ]).then(([walletsRes, donationsRes, payoutsRes, scheduleRes]) => {
      if (cancelled) return;
      if (walletsRes.error || donationsRes.error || payoutsRes.error) {
        setError("Could not load wallet data.");
        setWallets([]);
        setWalletDonations([]);
        setWalletPayouts([]);
        return;
      }
      setError("");
      setWallets(
        ((walletsRes.data ?? []) as AdminWallet[]).filter(
          (row) => !isDummyUser({ id: row.user_id, email: row.email, handle: row.handle }),
        ),
      );
      setWalletDonations(
        (donationsRes.data ?? []).flatMap((row) => {
          const item = row as Record<string, unknown>;
          const project = Array.isArray(item.projects) ? item.projects[0] : item.projects;
          const owner =
            project && typeof project === "object" ? String((project as Record<string, unknown>).owner_id ?? "") : "";
          if (!owner) return [];
          const donation = {
            id: String(item.id ?? ""),
            amount: Number(item.amount ?? 0),
            commission_pct: Number(item.commission_pct ?? 0),
            created_at: String(item.created_at ?? ""),
            donor_email: typeof item.donor_email === "string" ? item.donor_email : null,
            donor_handle: typeof item.donor_handle === "string" ? item.donor_handle : null,
            creator_name: typeof item.creator_name === "string" ? item.creator_name : null,
            creator_handle: typeof item.creator_handle === "string" ? item.creator_handle : null,
            game_title: typeof item.game_title === "string" ? item.game_title : null,
            game_slug: typeof item.game_slug === "string" ? item.game_slug : null,
            owner_id: owner,
          };
          if (isDummyDonation(donation)) return [];
          return [donation];
        }),
      );
      setWalletPayouts(((payoutsRes.data ?? []) as AdminPayout[]).filter((row) => !isDummyPayout(row)));
      if (!scheduleRes.error && scheduleRes.data) {
        const schedule = readPayoutSchedule(scheduleRes.data);
        setPayoutFrequency(schedule.frequency);
        setPayoutWeekday(String(schedule.weekday));
        setPayoutHourUtc(String(schedule.hourUtc));
        setCashoutMin(String(readCashoutMin(scheduleRes.data)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tab, walletReloadToken]);

  async function runPayoutsNow() {
    setPayoutRunBusy(true);
    setPayoutRunMessage("Sending payouts via PayPal…");
    try {
      const res = await fetch("/api/admin/run-payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
        results?: { status: string; message?: string }[];
      } | null;
      if (!res.ok) {
        setPayoutRunMessage(body?.error || "Payout run failed.");
        return;
      }
      const failed = (body?.results ?? []).filter((row) => row.status === "failed");
      const failNote = failed.map((row) => row.message).filter(Boolean).join(" ");
      setPayoutRunMessage(
        failNote ? `${body?.message || "Done."} ${failNote}` : body?.message || "Payouts sent.",
      );
      setWalletReloadToken((value) => value + 1);
    } catch {
      setPayoutRunMessage("Could not reach the payout server.");
    } finally {
      setPayoutRunBusy(false);
    }
  }

  async function savePayoutSchedule() {
    const weekday = Math.min(6, Math.max(0, Math.round(Number(payoutWeekday))));
    const hourUtc = Math.min(23, Math.max(0, Math.round(Number(payoutHourUtc))));
    const minPayout = normalizeCashoutMin(cashoutMin);
    if (!Number.isFinite(weekday) || !Number.isFinite(hourUtc)) return;
    setPayoutWeekday(String(weekday));
    setPayoutHourUtc(String(hourUtc));
    setCashoutMin(String(minPayout));
    const rows = [
      { id: "payout_frequency", value: payoutFrequencyToStore(payoutFrequency) },
      { id: "payout_weekday", value: weekday },
      { id: "payout_hour_utc", value: hourUtc },
      { id: "cashout_min", value: minPayout },
    ];
    const saveError = await upsertSiteSettings(rows);
    if (saveError) {
      setPayoutScheduleSaved(siteSettingsSaveError(saveError));
      return;
    }
    const { data: savedRows, error: reloadError } = await fetchSiteSettings(
      WALLET_SETTING_IDS.filter((id) => id !== "donation_commission_pct"),
    );
    if (!reloadError && savedRows) {
      const schedule = readPayoutSchedule(savedRows);
      setPayoutFrequency(schedule.frequency);
      setPayoutWeekday(String(schedule.weekday));
      setPayoutHourUtc(String(schedule.hourUtc));
      setCashoutMin(String(readCashoutMin(savedRows)));
    }
    setPayoutScheduleSaved(
      `Payout settings saved. Cash outs run ${payoutAdminScheduleSummary(payoutFrequency, weekday, hourUtc)} with a ${formatMoney(minPayout)} minimum.`,
    );
  }

  async function saveCommission() {
    const next = Math.min(100, Math.max(0, Number(commission)));
    if (!Number.isFinite(next)) return;
    setCommission(String(next));
    const saveError = await upsertSiteSettings([{ id: "donation_commission_pct", value: next }]);
    setCommissionSaved(saveError ? siteSettingsSaveError(saveError) : "Commission saved. New donations use this rate.");
  }

  return (
    <div className="min-w-0 pt-4">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-display font-semibold tracking-tight">Admin</h1>
        <Segmented
          aria-label="Admin menu"
          value={tab}
          options={[
            { value: "overview", label: "Overview", href: "/admin" },
            { value: "wallet", label: "Wallet", href: "/admin?tab=wallet" },
            { value: "reports", label: "Reported issue", href: "/admin?tab=reports" },
            { value: "features", label: "Feature list", href: "/admin?tab=features" },
          ]}
        />
      </div>

      {error ? <p className="mt-6 text-ui text-danger">{error}</p> : null}

      {tab === "reports" ? <ReportsTable reports={reports} /> : null}
      {tab === "features" ? <FeatureList features={features} setFlags={setFlags} /> : null}
      {tab === "wallet" ? (
        <WalletPanel
          wallets={wallets}
          donations={walletDonations}
          payouts={walletPayouts}
          payoutFrequency={payoutFrequency}
          payoutWeekday={payoutWeekday}
          payoutHourUtc={payoutHourUtc}
          cashoutMin={cashoutMin}
          payoutScheduleSaved={payoutScheduleSaved}
          onPayoutFrequencyChange={setPayoutFrequency}
          onPayoutWeekdayChange={setPayoutWeekday}
          onPayoutHourUtcChange={setPayoutHourUtc}
          onCashoutMinChange={setCashoutMin}
          onSavePayoutSchedule={() => void savePayoutSchedule()}
          onRunPayouts={() => void runPayoutsNow()}
          payoutRunBusy={payoutRunBusy}
          payoutRunMessage={payoutRunMessage}
        />
      ) : null}
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
        <div className="mt-4 overflow-x-auto rounded-panel bg-surface-2">
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
        <div className="mt-4 overflow-x-auto rounded-panel bg-surface-2">
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
      <div className="mt-4 overflow-x-auto rounded-panel bg-surface-2">
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
      <div className="mt-4 overflow-x-auto rounded-panel bg-surface-2">
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
      <div className="mt-4 overflow-x-auto rounded-panel bg-surface-2">
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

function WalletPanel({
  wallets,
  donations,
  payouts,
  payoutFrequency,
  payoutWeekday,
  payoutHourUtc,
  cashoutMin,
  payoutScheduleSaved,
  onPayoutFrequencyChange,
  onPayoutWeekdayChange,
  onPayoutHourUtcChange,
  onCashoutMinChange,
  onSavePayoutSchedule,
  onRunPayouts,
  payoutRunBusy,
  payoutRunMessage,
}: {
  wallets: AdminWallet[] | null;
  donations: AdminDonationWithOwner[] | null;
  payouts: AdminPayout[] | null;
  payoutFrequency: PayoutFrequency;
  payoutWeekday: string;
  payoutHourUtc: string;
  cashoutMin: string;
  payoutScheduleSaved: string;
  onPayoutFrequencyChange: (value: PayoutFrequency) => void;
  onPayoutWeekdayChange: (value: string) => void;
  onPayoutHourUtcChange: (value: string) => void;
  onCashoutMinChange: (value: string) => void;
  onSavePayoutSchedule: () => void;
  onRunPayouts: () => void;
  payoutRunBusy: boolean;
  payoutRunMessage: string;
}) {
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const weekday = Math.min(6, Math.max(0, Math.round(Number(payoutWeekday))));
  const hourUtc = Math.min(23, Math.max(0, Math.round(Number(payoutHourUtc))));
  const minPayout = normalizeCashoutMin(cashoutMin);
  const weekly = payoutFrequency === "weekly";

  return (
    <section className="mt-8">
      <h2 className="text-title font-semibold tracking-tight">Wallet</h2>
      <p className="mt-1 text-caption text-text-muted">
        In account is what they can still cash out. Expand a row for donation and payout history.
      </p>
      <form
        className="mt-4 rounded-panel border border-border bg-surface-2 p-4 sm:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSavePayoutSchedule();
        }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-ui font-medium">Payout schedule</p>
            <p className="mt-1 max-w-xl text-caption text-text-muted">
              Controls when automatic PayPal cash outs run. Times are stored in UTC and shown to creators in their local
              timezone.
            </p>
            <div className="mt-4">
              <Segmented
                aria-label="Payout frequency"
                value={payoutFrequency}
                onChange={onPayoutFrequencyChange}
                options={[
                  { value: "weekly", label: "Weekly" },
                  { value: "daily", label: "Daily" },
                ]}
              />
            </div>
          </div>
          <div className="rounded-xl bg-surface-3 px-4 py-3 lg:min-w-[14rem] lg:shrink-0">
            <p className="text-caption font-medium text-text-subtle">Preview</p>
            <p className="mt-1 text-body font-medium">
              {payoutAdminScheduleSummary(payoutFrequency, weekday, hourUtc)}
            </p>
            <p className="mt-1 text-caption text-text-muted">Minimum {formatMoney(minPayout)}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_9rem_auto] sm:items-end">
          <Field
            label="Payout day (UTC)"
            hint={weekly ? "Cash outs run on this weekday each week." : "Only used for weekly payouts."}
            className={weekly ? "" : "opacity-50"}
          >
            <SelectInput
              id="payout-weekday"
              value={payoutWeekday}
              onChange={(e) => onPayoutWeekdayChange(e.target.value)}
              disabled={!weekly}
            >
              {PAYOUT_WEEKDAYS.map((row) => (
                <option key={row.value} value={row.value}>
                  {row.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Hour (UTC)" hint="0–23">
            <TextInput
              id="payout-hour-utc"
              type="number"
              min={0}
              max={23}
              step={1}
              value={payoutHourUtc}
              onChange={(e) => onPayoutHourUtcChange(e.target.value)}
            />
          </Field>
          <Field label="Minimum payout" hint="Balance required to cash out.">
            <div className="relative">
              <TextInput
                id="cashout-min"
                type="number"
                min={0}
                step="0.01"
                value={cashoutMin}
                onChange={(e) => onCashoutMinChange(e.target.value)}
                className="pr-7"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-caption text-text-subtle">
                $
              </span>
            </div>
          </Field>
          <Button type="submit" variant="secondary" size="sm" className="sm:mb-0.5 sm:w-full sm:max-w-[8rem]">
            Save
          </Button>
        </div>
        {payoutScheduleSaved ? <p className="mt-3 text-caption text-text-muted">{payoutScheduleSaved}</p> : null}
      </form>
      <div className="mt-4 flex flex-col gap-3 rounded-panel border border-border bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-ui font-medium">Run payouts now</p>
          <p className="mt-1 max-w-xl text-caption text-text-muted">
            Sends PayPal payouts immediately for every creator with PayPal connected and at least the minimum in
            account. Ignores the schedule. Requires PayPal REST credentials in the server environment.
          </p>
          {payoutRunMessage ? <p className="mt-2 text-caption text-text-muted">{payoutRunMessage}</p> : null}
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="shrink-0"
          disabled={payoutRunBusy}
          onClick={onRunPayouts}
        >
          {payoutRunBusy ? "Sending…" : "Run payouts now"}
        </Button>
      </div>
      <div className="mt-4 overflow-x-auto rounded-panel bg-surface-2">
        <table className="w-full min-w-[48rem] text-left text-ui">
          <thead className="text-caption text-text-subtle">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">PayPal</th>
              <th className="px-4 py-3 font-medium">In account</th>
              <th className="px-4 py-3 font-medium">Lifetime earned</th>
              <th className="px-4 py-3 font-medium">Paid out</th>
              <th className="px-4 py-3 font-medium">Donations</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {wallets === null || donations === null || payouts === null ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-text-muted">
                  Loading wallet data…
                </td>
              </tr>
            ) : wallets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-text-muted">
                  No donations recorded yet.
                </td>
              </tr>
            ) : (
              wallets.map((row) => {
                const open = openUserId === row.user_id;
                const userDonations = donations.filter((gift) => gift.owner_id === row.user_id);
                const userPayouts = payouts.filter((payout) => payout.user_id === row.user_id);
                return (
                  <Fragment key={row.user_id}>
                    <tr className="border-b border-border/70">
                      <td className="px-4 py-3 font-medium">
                        {row.email ? maskEmail(row.email) : "—"}
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-text-muted">
                        {row.wallet_address || "—"}
                      </td>
                      <td className="px-4 py-3 tabular font-semibold">{formatMoney(Number(row.outstanding))}</td>
                      <td className="px-4 py-3 tabular">{formatMoney(Number(row.earned_total))}</td>
                      <td className="px-4 py-3 tabular">{formatMoney(Number(row.paid_out))}</td>
                      <td className="px-4 py-3 tabular">{formatPlays(row.donation_count)}</td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setOpenUserId(open ? null : row.user_id)}
                        >
                          {open ? "Hide" : "View"}
                        </Button>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="border-b border-border/70 bg-surface-3/40">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid gap-6 lg:grid-cols-2">
                            <div>
                              <p className="mb-3 text-caption font-medium uppercase tracking-wide text-text-subtle">
                                Donations received
                              </p>
                              {userDonations.length === 0 ? (
                                <p className="text-caption text-text-muted">No donations yet.</p>
                              ) : (
                                <div className="overflow-x-auto rounded-lg bg-surface-2">
                                  <table className="w-full min-w-[20rem] text-left text-caption">
                                    <thead className="text-text-subtle">
                                      <tr className="border-b border-border">
                                        <th className="px-3 py-2 font-medium">Game</th>
                                        <th className="px-3 py-2 font-medium">Gross</th>
                                        <th className="px-3 py-2 font-medium">Earned</th>
                                        <th className="px-3 py-2 font-medium">Date</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {userDonations.map((gift) => {
                                        const pct = Number(gift.commission_pct) || 0;
                                        const earned = Number(gift.amount) * (1 - pct / 100);
                                        return (
                                          <tr key={gift.id} className="border-b border-border/60 last:border-0">
                                            <td className="px-3 py-2">
                                              {gift.creator_handle && gift.game_slug ? (
                                                <Link
                                                  href={projectPublicUrl(gift.creator_handle, gift.game_slug)}
                                                  className="truncate font-medium hover:text-text-muted"
                                                >
                                                  {gift.game_title || "Untitled"}
                                                </Link>
                                              ) : (
                                                <span className="truncate font-medium">{gift.game_title || "Untitled"}</span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2 tabular">{formatMoney(Number(gift.amount))}</td>
                                            <td className="px-3 py-2 tabular">{formatMoney(earned)}</td>
                                            <td className="px-3 py-2 text-text-muted">{formatWhen(gift.created_at)}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="mb-3 text-caption font-medium uppercase tracking-wide text-text-subtle">
                                Payout history
                              </p>
                              {userPayouts.length === 0 ? (
                                <p className="text-caption text-text-muted">No payouts yet.</p>
                              ) : (
                                <div className="overflow-x-auto rounded-lg bg-surface-2">
                                  <table className="w-full min-w-[16rem] text-left text-caption">
                                    <thead className="text-text-subtle">
                                      <tr className="border-b border-border">
                                        <th className="px-3 py-2 font-medium">Amount</th>
                                        <th className="px-3 py-2 font-medium">Status</th>
                                        <th className="px-3 py-2 font-medium">Date</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {userPayouts.map((payout) => (
                                        <tr key={payout.id} className="border-b border-border/60 last:border-0">
                                          <td className="px-3 py-2 tabular font-medium">
                                            {formatMoney(Number(payout.amount))}
                                          </td>
                                          <td className="px-3 py-2 capitalize text-text-muted">{payout.status}</td>
                                          <td className="px-3 py-2 text-text-muted">{formatWhen(payout.created_at)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
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
      <ul className="mt-4 divide-y divide-border overflow-hidden rounded-panel bg-surface-2">
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
      <div className="mt-4 overflow-x-auto rounded-panel bg-surface-2">
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
    <div className="min-w-0 rounded-xl bg-surface-2 px-3 py-3">
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
