import Link from "next/link";
import { formatPlays } from "@/lib/format";
import { projectPublicUrl, siteOrigin } from "@/lib/host";
import { formatWhen, type AdminGame, type AdminUser, type Overview } from "@/components/admin/shared";

export function OverviewSummary({
  overview,
  users,
  games,
}: {
  overview: Overview | null;
  users: AdminUser[] | null;
  games: AdminGame[] | null;
}) {
  return (
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
    </>
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
