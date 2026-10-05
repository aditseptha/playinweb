"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FeatureList } from "@/components/admin/FeatureList";
import { OverviewSummary } from "@/components/admin/Overview";
import { DonationRecords, PayoutRecords, TipRecords } from "@/components/admin/Records";
import { ReportsTable } from "@/components/admin/ReportsTable";
import {
  asGames,
  asOverview,
  asUsers,
  type AdminDonation,
  type AdminDonationWithOwner,
  type AdminGame,
  type AdminPayout,
  type AdminReport,
  type AdminTip,
  type AdminUser,
  type AdminWallet,
  type Overview,
} from "@/components/admin/shared";
import { WalletPanel } from "@/components/admin/WalletPanel";
import { Segmented } from "@/components/ui/segmented";
import { DEFAULT_CASHOUT_MIN, normalizeCashoutMin, readCashoutMin } from "@/lib/cashout";
import { formatMoney } from "@/lib/format";
import { useFeatures } from "@/lib/features";
import { isDummyDonation, isDummyPayout, isDummyUser } from "@/lib/dummy-seed";
import {
  DEFAULT_PAYOUT_FREQUENCY,
  DEFAULT_PAYOUT_HOUR_UTC,
  DEFAULT_PAYOUT_WEEKDAY,
  type PayoutFrequency,
  payoutAdminScheduleSummary,
  payoutFrequencyToStore,
  readPayoutSchedule,
} from "@/lib/payout-schedule";
import { fetchSiteSettings, siteSettingsSaveError, upsertSiteSettings, WALLET_SETTING_IDS } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/client";

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
          <OverviewSummary overview={overview} users={users} games={games} />
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
