"use client";

import { useMemo, useState } from "react";
import { GameThumb } from "@/components/GameThumb";
import { LinkButton } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { formatPlays } from "@/lib/format";
import { projectPublicUrl } from "@/lib/host";
import { projectToGame, type ProjectRecord, type StatDay } from "@/lib/projects";

type Range = "daily" | "weekly";

export function ManageStats({
  projects,
  days,
  handle,
}: {
  projects: ProjectRecord[];
  days: StatDay[];
  handle: string;
}) {
  const [range, setRange] = useState<Range>("daily");
  const buckets = useMemo(() => (range === "daily" ? lastDays(14) : lastWeeks(8)), [range]);

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-caption text-text-subtle">Page visits and play-button clicks, per game</p>
        <Segmented
          aria-label="Stats range"
          value={range}
          onChange={setRange}
          options={[
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
          ]}
        />
      </div>
      <ul className="mt-4 flex flex-col gap-4">
        {projects.map((project) => {
          const game = projectToGame(project);
          const series = bucketSeries(project.id, days, buckets, range === "weekly");
          return (
            <li key={project.id} className="min-w-0 rounded-panel bg-surface px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
                <div className="relative aspect-video w-full max-w-[226px] overflow-hidden rounded-lg bg-surface-2 lg:h-[127px] lg:w-[226px] lg:shrink-0">
                  <GameThumb game={game} sizes="(min-width: 1024px) 226px, 226px" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-title font-semibold tracking-tight">{project.title}</h2>
                      <p className="truncate text-caption text-text-subtle">
                        @{handle}/{project.slug}
                        {project.published ? "" : " · Private"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:shrink-0">
                      <LinkButton href={`/manage/${project.id}`} variant="secondary" size="sm">
                        Edit details
                      </LinkButton>
                      <LinkButton href={projectPublicUrl(handle, project.slug)} variant="ghost" size="sm">
                        View page
                      </LinkButton>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:max-w-xl">
                    <StatTile
                      value={project.view_count ?? 0}
                      label="Views"
                      hint="Page visits"
                      tone="text-sky-300"
                    />
                    <StatTile
                      value={Math.min(project.play_count, project.view_count ?? 0)}
                      label="Plays"
                      hint="Play button clicks"
                      tone="text-emerald-300"
                    />
                    <StatTile value={project.like_count} label="Likes" hint="Thumbs up" />
                    <StatTile
                      value={project.comment_count ?? 0}
                      label="Comments"
                      hint="Posts and replies"
                    />
                  </div>
                </div>
              </div>
              <GameChart series={series} range={range} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatTile({
  value,
  label,
  hint,
  tone,
}: {
  value: number;
  label: string;
  hint: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-2 px-2 py-2 sm:px-3">
      <p className={`text-title font-semibold tabular leading-none ${tone ?? "text-text"}`}>{formatPlays(value)}</p>
      <p className="mt-1 truncate text-caption font-medium">{label}</p>
      <p className="truncate text-meta text-text-subtle">{hint}</p>
    </div>
  );
}

function GameChart({
  series,
  range,
}: {
  series: { key: string; views: number; plays: number }[];
  range: Range;
}) {
  const max = Math.max(1, ...series.flatMap((p) => [p.views, p.plays]));
  const w = 640;
  const h = 140;
  const pad = { l: 8, r: 8, t: 8, b: 4 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const slot = innerW / series.length;
  const bar = Math.max(4, slot * 0.28);
  const ticks = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div className="mt-4 min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-meta text-text-subtle">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-sky-400" /> Views
          <span className="hidden sm:inline">· page visits</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-emerald-400" /> Plays
          <span className="hidden sm:inline">· play clicks</span>
        </span>
        <span>{range === "daily" ? "Last 14 days" : "Last 8 weeks"}</span>
      </div>
      <div className="flex min-w-0 gap-1.5 sm:gap-2">
        <div className="relative h-32 w-7 shrink-0 sm:h-40">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2 text-[10px] tabular text-text-subtle"
              style={{ top: `${((pad.t + innerH * (1 - t)) / h) * 100}%` }}
            >
              {formatPlays(Math.round(max * t))}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="block h-32 w-full max-w-full sm:h-40"
            preserveAspectRatio="none"
            role="img"
            aria-label={`${range} views and plays`}
          >
            {ticks.map((t) => (
              <line
                key={t}
                x1={pad.l}
                x2={w - pad.r}
                y1={pad.t + innerH * (1 - t)}
                y2={pad.t + innerH * (1 - t)}
                stroke="currentColor"
                className="text-border"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {series.map((point, i) => {
              const cx = pad.l + slot * i + slot / 2;
              const vh = (point.views / max) * innerH;
              const ph = (point.plays / max) * innerH;
              const label = range === "daily" ? dayLabel(point.key) : weekLabel(point.key);
              return (
                <g key={point.key}>
                  <rect
                    x={cx - bar - 1}
                    y={pad.t + innerH - vh}
                    width={bar}
                    height={Math.max(point.views ? 2 : 0, vh)}
                    rx="2"
                    className="fill-sky-400"
                  >
                    <title>{`${label}: ${point.views} views`}</title>
                  </rect>
                  <rect
                    x={cx + 1}
                    y={pad.t + innerH - ph}
                    width={bar}
                    height={Math.max(point.plays ? 2 : 0, ph)}
                    rx="2"
                    className="fill-emerald-400"
                  >
                    <title>{`${label}: ${point.plays} plays`}</title>
                  </rect>
                </g>
              );
            })}
          </svg>
          <div className="mt-1 flex text-[10px] text-text-subtle">
            {series.map((point, i) => {
              const label = range === "daily" ? dayLabel(point.key) : weekLabel(point.key);
              const last = i === series.length - 1;
              const showSm = range === "weekly" || i % 2 === 0 || last;
              const showXs = range === "weekly" || i % 4 === 0 || last;
              return (
                <span key={point.key} className="min-w-0 flex-1 truncate text-center">
                  <span className="sm:hidden">{showXs ? label : "\u00a0"}</span>
                  <span className="hidden sm:inline">{showSm ? label : "\u00a0"}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function utcToday() {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function addDays(d: Date, n: number) {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + n);
  return next;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date) {
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = next.getUTCDay();
  next.setUTCDate(next.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return next;
}

function lastDays(count: number) {
  const end = utcToday();
  return Array.from({ length: count }, (_, i) => isoDay(addDays(end, i - (count - 1))));
}

function lastWeeks(count: number) {
  const end = startOfWeek(utcToday());
  return Array.from({ length: count }, (_, i) => isoDay(addDays(end, (i - (count - 1)) * 7)));
}

function dayLabel(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
}

function weekLabel(iso: string) {
  return dayLabel(iso);
}

function bucketSeries(projectId: string, days: StatDay[], buckets: string[], weekly: boolean) {
  const map = new Map(buckets.map((key) => [key, { views: 0, plays: 0 }]));
  for (const row of days) {
    if (row.project_id !== projectId) continue;
    const key = weekly ? isoDay(startOfWeek(new Date(`${row.day}T00:00:00Z`))) : row.day.slice(0, 10);
    const cur = map.get(key);
    if (!cur) continue;
    cur.views += row.views;
    cur.plays += Math.min(row.plays, row.views);
  }
  return buckets.map((key) => ({ key, ...map.get(key)! }));
}
