export const PAYOUT_WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

export type PayoutFrequency = "daily" | "weekly";

export const DEFAULT_PAYOUT_FREQUENCY: PayoutFrequency = "weekly";
export const DEFAULT_PAYOUT_WEEKDAY = 4;
export const DEFAULT_PAYOUT_HOUR_UTC = 17;

export function normalizePayoutFrequency(value: unknown): PayoutFrequency {
  const n = Number(value);
  return n === 1 ? "daily" : "weekly";
}

export function payoutFrequencyToStore(frequency: PayoutFrequency) {
  return frequency === "daily" ? 1 : 0;
}

export function normalizePayoutWeekday(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PAYOUT_WEEKDAY;
  return Math.min(6, Math.max(0, Math.round(n)));
}

export function normalizePayoutHourUtc(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PAYOUT_HOUR_UTC;
  return Math.min(23, Math.max(0, Math.round(n)));
}

export function payoutWeekdayLabel(weekday: number) {
  return PAYOUT_WEEKDAYS.find((row) => row.value === weekday)?.label ?? "Thursday";
}

export function payoutHourUtcLabel(hourUtc: number) {
  const hour = normalizePayoutHourUtc(hourUtc);
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:00 ${ampm} UTC`;
}

function scheduleReferenceDate(weekday: number, hourUtc: number) {
  return new Date(Date.UTC(2024, 0, 7 + normalizePayoutWeekday(weekday), normalizePayoutHourUtc(hourUtc), 0, 0));
}

export function payoutAdminScheduleSummary(
  frequency: PayoutFrequency,
  weekday: number,
  hourUtc: number,
) {
  const hour = payoutHourUtcLabel(hourUtc);
  if (frequency === "daily") return `Daily at ${hour}`;
  return `Every ${payoutWeekdayLabel(weekday)} at ${hour}`;
}

/** User-facing schedule in the viewer's local timezone. */
export function payoutScheduleLocalLabel(
  frequency: PayoutFrequency,
  weekday: number,
  hourUtc: number,
) {
  const ref = scheduleReferenceDate(weekday, hourUtc);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const time = ref.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: zone });
  if (frequency === "daily") return `every day at ${time}`;
  const day = ref.toLocaleDateString(undefined, { weekday: "long", timeZone: zone });
  return `every ${day} at ${time}`;
}

export function payoutScheduleLocalSentence(
  frequency: PayoutFrequency,
  weekday: number,
  hourUtc: number,
) {
  const label = payoutScheduleLocalLabel(frequency, weekday, hourUtc);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function payoutDayLocalName(frequency: PayoutFrequency, weekday: number, hourUtc: number) {
  if (frequency === "daily") return "payout day";
  const ref = scheduleReferenceDate(weekday, hourUtc);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return ref.toLocaleDateString(undefined, { weekday: "long", timeZone: zone });
}

export function payoutCycleLabel(frequency: PayoutFrequency) {
  return frequency === "daily" ? "day" : "week";
}

export function readPayoutSchedule(rows: { id: string; value: number }[] | null | undefined) {
  const byId = new Map((rows ?? []).map((row) => [row.id, row.value]));
  return {
    frequency: normalizePayoutFrequency(byId.get("payout_frequency")),
    weekday: normalizePayoutWeekday(byId.get("payout_weekday")),
    hourUtc: normalizePayoutHourUtc(byId.get("payout_hour_utc")),
  };
}

export function payoutScheduleDueNow(
  frequency: PayoutFrequency,
  weekday: number,
  hourUtc: number,
  now = new Date(),
) {
  const hour = normalizePayoutHourUtc(hourUtc);
  if (now.getUTCHours() !== hour) return false;
  if (frequency === "daily") return true;
  return now.getUTCDay() === normalizePayoutWeekday(weekday);
}
