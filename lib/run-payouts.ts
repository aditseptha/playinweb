import { money } from "@/lib/cashout";
import { isDummyUser } from "@/lib/dummy-seed";
import { sendPaypalPayout } from "@/lib/paypal-payout";
import { payoutScheduleDueNow, readPayoutSchedule } from "@/lib/payout-schedule";
import { readCashoutMin } from "@/lib/site-settings";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type PayoutCandidate = {
  userId: string;
  email: string | null;
  handle: string | null;
  walletAddress: string;
  amount: number;
};

export type PayoutAttemptResult = {
  userId: string;
  email: string | null;
  amount: number;
  status: "paid" | "failed" | "skipped";
  message?: string;
  batchId?: string;
};

type AdminWalletRow = {
  user_id: string;
  email: string | null;
  handle: string | null;
  wallet_address: string | null;
  outstanding: number;
};

export async function loadPayoutSettings(supabase: Supabase) {
  const { data, error } = await supabase
    .from("site_settings")
    .select("id, value")
    .in("id", ["payout_frequency", "payout_weekday", "payout_hour_utc", "cashout_min"]);
  if (error) throw new Error("Could not load payout settings.");
  const schedule = readPayoutSchedule(data);
  return {
    ...schedule,
    cashoutMin: readCashoutMin(data),
  };
}

export function listPayoutCandidates(
  wallets: AdminWalletRow[],
  cashoutMin: number,
  userId?: string,
): PayoutCandidate[] {
  return wallets
    .filter((row) => !userId || row.user_id === userId)
    .map((row) => ({
      userId: row.user_id,
      email: row.email,
      handle: row.handle,
      walletAddress: row.wallet_address?.trim() ?? "",
      amount: money(Number(row.outstanding)),
    }))
    .filter((row) => row.walletAddress && row.amount >= cashoutMin);
}

export async function runPayouts(input: {
  supabase: Supabase;
  force?: boolean;
  userId?: string;
}) {
  const settings = await loadPayoutSettings(input.supabase);
  if (!input.force && !payoutScheduleDueNow(settings.frequency, settings.weekday, settings.hourUtc)) {
    return {
      ok: false as const,
      error: "Payouts are not due yet for the current schedule. Run with force to override.",
      results: [] as PayoutAttemptResult[],
    };
  }

  const { data: wallets, error: walletsError } = await input.supabase.rpc("admin_list_wallets");
  if (walletsError) throw new Error("Could not load wallet balances.");

  const eligibleWallets = ((wallets ?? []) as AdminWalletRow[]).filter(
    (row) => !isDummyUser({ id: row.user_id, email: row.email, handle: row.handle }),
  );
  const candidates = listPayoutCandidates(eligibleWallets, settings.cashoutMin, input.userId);

  if (candidates.length === 0) {
    return {
      ok: true as const,
      results: [] as PayoutAttemptResult[],
      message: "No creators met the minimum balance with PayPal connected.",
    };
  }

  const results: PayoutAttemptResult[] = [];
  for (const candidate of candidates) {
    const itemId = `${candidate.userId.slice(0, 8)}_${Date.now()}`;
    try {
      const payout = await sendPaypalPayout({
        email: candidate.walletAddress,
        amount: candidate.amount,
        note: "PlayInWeb creator payout",
        itemId,
      });

      const { error: recordError } = await input.supabase.rpc("admin_record_payout", {
        p_user_id: candidate.userId,
        p_amount: candidate.amount,
        p_status: "paid",
        p_creator_email: candidate.walletAddress,
        p_creator_handle: candidate.handle,
      });
      if (recordError) {
        results.push({
          userId: candidate.userId,
          email: candidate.email,
          amount: candidate.amount,
          status: "failed",
          message: `PayPal sent (${payout.batchId}) but the payout record could not be saved.`,
          batchId: payout.batchId,
        });
        continue;
      }

      results.push({
        userId: candidate.userId,
        email: candidate.email,
        amount: candidate.amount,
        status: "paid",
        batchId: payout.batchId,
      });
    } catch (error) {
      results.push({
        userId: candidate.userId,
        email: candidate.email,
        amount: candidate.amount,
        status: "failed",
        message: error instanceof Error ? error.message : "PayPal payout failed.",
      });
    }
  }

  const paid = results.filter((row) => row.status === "paid").length;
  const failed = results.filter((row) => row.status === "failed").length;
  return {
    ok: true as const,
    results,
    message:
      paid === 0
        ? failed > 0
          ? "No payouts completed."
          : "No payouts were sent."
        : `Sent ${paid} payout${paid === 1 ? "" : "s"}${failed > 0 ? `; ${failed} failed` : ""}.`,
  };
}
