import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { formatMoney } from "@/lib/format";
import { projectPublicUrl, siteOrigin } from "@/lib/host";
import { formatWhen, type AdminDonation, type AdminPayout, type AdminTip } from "@/components/admin/shared";

export function DonationRecords({
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

export function TipRecords({ rows }: { rows: AdminTip[] | null }) {
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

export function PayoutRecords({ rows }: { rows: AdminPayout[] | null }) {
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
