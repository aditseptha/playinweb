export const DEFAULT_CASHOUT_MIN = 10;
export const CASHOUT_MIN = DEFAULT_CASHOUT_MIN;

export function normalizeCashoutMin(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_CASHOUT_MIN;
  return Math.max(0, Math.round(n * 100) / 100);
}

export function readCashoutMin(rows: { id: string; value: number }[] | null | undefined) {
  const row = (rows ?? []).find((item) => item.id === "cashout_min");
  return normalizeCashoutMin(row?.value);
}

export function money(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100) / 100);
}

type PayoutRow = { amount: number; status: string };

/** Completed transfers only — excludes pending requests. */
export function paidOutAmount(rows: PayoutRow[] | null | undefined) {
  return money(
    (rows ?? []).reduce((n, row) => (row.status === "paid" ? n + (Number(row.amount) || 0) : n), 0),
  );
}

/** Paid plus pending requests — used for available balance. */
export function reservedPayoutAmount(rows: PayoutRow[] | null | undefined) {
  return money(
    (rows ?? []).reduce((n, row) => (row.status === "cancelled" ? n : n + (Number(row.amount) || 0)), 0),
  );
}
