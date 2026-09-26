import { DEFAULT_CASHOUT_MIN, readCashoutMin } from "@/lib/cashout";
import {
  DEFAULT_PAYOUT_FREQUENCY,
  DEFAULT_PAYOUT_HOUR_UTC,
  DEFAULT_PAYOUT_WEEKDAY,
  type PayoutFrequency,
  readPayoutSchedule,
} from "@/lib/payout-schedule";
import { createClient } from "@/lib/supabase/client";

export const WALLET_SETTING_IDS = [
  "donation_commission_pct",
  "payout_frequency",
  "payout_weekday",
  "payout_hour_utc",
  "cashout_min",
] as const;

export type WalletSettings = {
  commission: number;
  frequency: PayoutFrequency;
  weekday: number;
  hourUtc: number;
  cashoutMin: number;
};

export const DEFAULT_WALLET_SETTINGS: WalletSettings = {
  commission: 10,
  frequency: DEFAULT_PAYOUT_FREQUENCY,
  weekday: DEFAULT_PAYOUT_WEEKDAY,
  hourUtc: DEFAULT_PAYOUT_HOUR_UTC,
  cashoutMin: DEFAULT_CASHOUT_MIN,
};

export function readWalletSettings(rows: { id: string; value: number }[] | null | undefined): WalletSettings {
  const settings = rows ?? [];
  const pct = Number(settings.find((row) => row.id === "donation_commission_pct")?.value);
  const schedule = readPayoutSchedule(settings);
  return {
    commission: Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : DEFAULT_WALLET_SETTINGS.commission,
    frequency: schedule.frequency,
    weekday: schedule.weekday,
    hourUtc: schedule.hourUtc,
    cashoutMin: readCashoutMin(settings),
  };
}

export function formatCommissionPct(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function siteSettingsSaveError(error: { message?: string } | null) {
  if (!error?.message) return "Could not save settings.";
  if (/admin_upsert_site_settings|42883|PGRST202/i.test(error.message)) {
    return "Save is not set up on the database yet. Run supabase/migrations/20260926100000_admin_upsert_site_settings.sql in the Supabase SQL editor, then try again.";
  }
  if (/row-level security/i.test(error.message) || /not allowed/i.test(error.message)) {
    return "The database doesn't recognize this account as admin. Run supabase/migrations/20260926100000_admin_upsert_site_settings.sql in the Supabase SQL editor, then try again.";
  }
  return error.message;
}

async function verifySiteSettings(rows: { id: string; value: number }[]) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("id, value")
    .in("id", rows.map((row) => row.id));
  if (error) return error;
  for (const row of rows) {
    const saved = data?.find((item) => item.id === row.id);
    if (!saved || Number(saved.value) !== row.value) {
      return { message: "not allowed" };
    }
  }
  return null;
}

export async function upsertSiteSettings(rows: { id: string; value: number }[]) {
  const supabase = createClient();
  const settings = Object.fromEntries(rows.map((row) => [row.id, row.value]));
  const { error: rpcError } = await supabase.rpc("admin_upsert_site_settings", { settings });
  if (!rpcError) return verifySiteSettings(rows);

  // Upsert checks insert RLS even for existing rows; update each setting instead.
  for (const row of rows) {
    const { data, error } = await supabase
      .from("site_settings")
      .update({ value: row.value })
      .eq("id", row.id)
      .select("id");
    if (error) return error;
    if (!data?.length) return { message: "not allowed" };
  }
  return verifySiteSettings(rows);
}

export async function fetchSiteSettings(ids: readonly string[]) {
  const supabase = createClient();
  return supabase.from("site_settings").select("id, value").in("id", [...ids]);
}
