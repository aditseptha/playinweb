"use client";

import Link from "next/link";
import { useState } from "react";
import { adminTablePageCount, paginateSlice, TablePagination } from "@/components/admin/pagination";
import { sparklineFromTrend, TileTrend7d } from "@/components/admin/TileSparkline";
import { formatPlays } from "@/lib/format";
import { projectPublicUrl, siteOrigin } from "@/lib/host";
import {
  formatWhen,
  type AdminGame,
  type AdminTrendDay,
  type AdminUser,
  type Overview,
} from "@/components/admin/shared";
import { useSiteOnlineCount } from "@/lib/site-presence";

const SPARK = {
  signups: "rgb(196 181 253)",
  games: "rgb(252 211 77)",
  plays: "rgb(110 231 183)",
} as const;

function sumTrend(days: AdminTrendDay[] | null, pick: (d: AdminTrendDay) => number) {
  if (!days) return null;
  return days.reduce((sum, d) => sum + pick(d), 0);
}

export function OverviewSummary({
  overview,
  users,
  games,
  trends,
}: {
  overview: Overview | null;
  users: AdminUser[] | null;
  games: AdminGame[] | null;
  trends: AdminTrendDay[] | null;
}) {
  const [usersPage, setUsersPage] = useState(0);
  const [gamesPage, setGamesPage] = useState(0);

  const usersPageSafe = users ? Math.min(usersPage, adminTablePageCount(users.length) - 1) : 0;
  const gamesPageSafe = games ? Math.min(gamesPage, adminTablePageCount(games.length) - 1) : 0;
  const userRows = users ? paginateSlice(users, usersPageSafe) : null;
  const gameRows = games ? paginateSlice(games, gamesPageSafe) : null;

  const online = useSiteOnlineCount();
  const newGamesWeek = sumTrend(trends, (d) => d.new_games);

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-2 xl:grid-cols-4">
        <Tile
          value={overview ? formatPlays(overview.users_week) : "—"}
          label="New users"
          hint="Last 7 days"
          trends={trends}
          series={sparklineFromTrend(trends, (d) => d.new_users)}
          stroke={SPARK.signups}
        />
        <Tile
          value={newGamesWeek !== null ? formatPlays(newGamesWeek) : "—"}
          label="New games"
          hint="Last 7 days"
          trends={trends}
          series={sparklineFromTrend(trends, (d) => d.new_games)}
          stroke={SPARK.games}
        />
        <Tile
          value={overview ? formatPlays(overview.plays) : "—"}
          label="Total plays"
          hint="All-time total"
          tone="text-emerald-300"
          trends={trends}
          series={sparklineFromTrend(trends, (d) => d.plays)}
          stroke={SPARK.plays}
        />
        <Tile
          value={online !== null ? formatPlays(online) : "—"}
          label="Online now"
          hint="Live"
          tone="text-sky-300"
          trends={null}
          series={null}
          stroke={SPARK.signups}
          live
        />
      </div>

      <section className="mt-10">
        <h2 className="text-title font-semibold tracking-tight">New users</h2>
        <div className="mt-4 overflow-hidden rounded-panel bg-surface-2">
          <div className="overflow-x-auto">
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
                  userRows!.map((row) => (
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
          {users && users.length > 0 ? (
            <TablePagination page={usersPageSafe} totalItems={users.length} onPageChange={setUsersPage} />
          ) : null}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-title font-semibold tracking-tight">New games registered</h2>
        <div className="mt-4 overflow-hidden rounded-panel bg-surface-2">
          <div className="overflow-x-auto">
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
                  gameRows!.map((row) => (
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
          {games && games.length > 0 ? (
            <TablePagination page={gamesPageSafe} totalItems={games.length} onPageChange={setGamesPage} />
          ) : null}
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
  trends,
  series,
  stroke,
  live,
}: {
  value: string;
  label: string;
  hint: string;
  tone?: string;
  trends: AdminTrendDay[] | null;
  series: number[] | null;
  stroke: string;
  live?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-surface-2 px-2 py-2">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="truncate text-meta font-medium leading-tight text-text">{label}</p>
          <p className="truncate text-[10px] leading-tight text-text-subtle">{hint}</p>
        </div>
        <p className={`shrink-0 text-sm font-semibold tabular leading-none xl:text-ui ${tone ?? "text-text"}`}>
          {value}
        </p>
      </div>
      {live ? (
        <p className="mt-1.5 flex items-center gap-1 text-[10px] leading-tight text-text-subtle">
          <span className="inline-block size-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400" aria-hidden />
          <span className="min-w-0 truncate">Live visitors</span>
        </p>
      ) : (
        <TileTrend7d values={series} days={trends} stroke={stroke} className="mt-1" />
      )}
    </div>
  );
}
