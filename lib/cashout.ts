export const CASHOUT_MIN = 10;

export function money(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100) / 100);
}
