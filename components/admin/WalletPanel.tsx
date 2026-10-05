"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { normalizeCashoutMin } from "@/lib/cashout";
import { formatMoney, formatPlays } from "@/lib/format";
import { projectPublicUrl } from "@/lib/host";
import { maskEmail } from "@/lib/paypal-email";
import { PAYOUT_WEEKDAYS, type PayoutFrequency, payoutAdminScheduleSummary } from "@/lib/payout-schedule";
import {
  formatWhen,
  type AdminDonationWithOwner,
  type AdminPayout,
  type AdminWallet,
} from "@/components/admin/shared";

export function WalletPanel({
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
