"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GameThumb } from "@/components/GameThumb";
import s from "@/components/home/home.module.css";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/cn";
import { formatPlays } from "@/lib/format";
import { projectPublicUrl } from "@/lib/host";
import { coverBelowStandard } from "@/lib/media-standard";
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
    <div>
      <div className={s.manageTools}>
        <p className={s.manageNote}>Page visits and play-button clicks, per game</p>
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
      <ul className={s.manageList}>
        {projects.map((project) => {
          const game = projectToGame(project);
          const series = bucketSeries(project.id, days, buckets, range === "weekly");
          return (
            <li key={project.id} className={s.manageCard}>
              <div className={s.manageHead}>
                <div className={s.manageThumb}>
                  <GameThumb game={game} sizes="96px" ratio="portrait" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className={s.manageTitle}>{project.title}</h2>
                      <CoverQualityNote src={game.thumbnailUrl} href={`/manage/${project.id}`} />
                      <p className={s.manageSlug}>
                        @{handle}/{project.slug}
                        {project.published ? "" : " · Private"}
                      </p>
                    </div>
                    <div className={s.manageActions}>
                      <Link href={`/manage/${project.id}`} className={cn(s.btn, s.btnGhost)}>
                        Edit details
                      </Link>
                      <Link href={projectPublicUrl(handle, project.slug)} className={cn(s.btn, s.btnPrimary)}>
                        View page
                      </Link>
                    </div>
                  </div>
                  <div className={s.manageStats}>
                    <StatTile
                      value={project.view_count ?? 0}
                      label="Views"
                      hint="Page visits"
                      tone="views"
                    />
                    <StatTile
                      value={Math.min(project.play_count, project.view_count ?? 0)}
                      label="Plays"
                      hint="Play button clicks"
                      tone="plays"
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

function CoverQualityNote({ src, href }: { src: string; href: string }) {
  const [soft, setSoft] = useState(false);
  if (!src) return null;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        src={src}
        className="hidden"
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (coverBelowStandard(naturalWidth, naturalHeight)) setSoft(true);
        }}
      />
      {soft ? (
        <p className="mt-1 text-caption text-text-muted">
          Your cover looks soft on a large screen.{" "}
          <Link href={href} className="underline">
            Upload a sharper one?
          </Link>
        </p>
      ) : null}
    </>
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
  tone?: "views" | "plays";
}) {
  return (
    <div className={s.manageStat}>
      <b className={tone === "views" ? "text-sky-300" : tone === "plays" ? "text-emerald-300" : undefined}>
        {formatPlays(value)}
      </b>
      <span>{label}</span>
      <small>{hint}</small>
    </div>
  );
}

function chartPoints(
  values: number[],
  slot: number,
  pad: { l: number; t: number },
  innerH: number,
  max: number,
) {
  return values.map((value, i) => {
    const x = pad.l + slot * i + slot / 2;
    const y = pad.t + innerH - (value / max) * innerH;
    return { x, y };
  });
}

function linePath(points: { x: number; y: number }[]) {
  return points.map((point, i) => `${i === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function labelShift(ownY: number, otherY: number) {
  const close = Math.abs(ownY - otherY) < 18;
  if (!close) return "-140%";
  return ownY <= otherY ? "-140%" : "35%";
}

function GameChart({
  series,
  range,
}: {
  series: { key: string; views: number; plays: number }[];
  range: Range;
}) {
  const [focus, setFocus] = useState<"views" | "plays" | null>(null);
  const max = Math.max(1, ...series.flatMap((p) => [p.views, p.plays]));
  const w = 640;
  const h = 160;
  const pad = { l: 8, r: 8, t: 20, b: 16 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const slot = innerW / Math.max(series.length, 1);
  const ticks = [1, 0.75, 0.5, 0.25, 0];
  const views = chartPoints(series.map((point) => point.views), slot, pad, innerH, max);
  const plays = chartPoints(series.map((point) => point.plays), slot, pad, innerH, max);
  const dim = (seriesName: "views" | "plays") => focus !== null && focus !== seriesName;

  return (
    <div className="mt-4 min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-meta text-text-subtle">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-sky-400" /> Views
          <span className="hidden sm:inline">· page visits</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-emerald-400" /> Plays
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
          <div className="relative">
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="block h-32 w-full max-w-full sm:h-40"
            preserveAspectRatio="none"
            role="img"
            aria-label={`${range} views and plays`}
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              if (!rect.width || !rect.height) return;
              const x = ((event.clientX - rect.left) / rect.width) * w;
              const y = ((event.clientY - rect.top) / rect.height) * h;
              const index = Math.max(0, Math.min(series.length - 1, Math.round((x - pad.l - slot / 2) / slot)));
              const viewsDist = Math.abs(y - views[index].y);
              const playsDist = Math.abs(y - plays[index].y);
              const nearest = Math.min(viewsDist, playsDist);
              setFocus(nearest > 24 ? null : viewsDist <= playsDist ? "views" : "plays");
            }}
            onMouseLeave={() => setFocus(null)}
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
            <g className={cn("transition-opacity duration-150", dim("views") && "opacity-20")}>
              <path
                d={linePath(views)}
                fill="none"
                className="stroke-sky-400"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
            <g className={cn("transition-opacity duration-150", dim("plays") && "opacity-20")}>
              <path
                d={linePath(plays)}
                fill="none"
                className="stroke-emerald-400"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </svg>
          {series.map((point, i) => {
            const label = range === "daily" ? dayLabel(point.key) : weekLabel(point.key);
            return (
              <span key={point.key}>
                {point.views > 0 ? (
                  <span
                    className={cn(
                      "pointer-events-none absolute -translate-x-1/2 text-[11px] font-semibold tabular leading-none text-sky-300 transition-opacity duration-150",
                      dim("views") && "opacity-20",
                    )}
                    style={{
                      left: `${(views[i].x / w) * 100}%`,
                      top: `${(views[i].y / h) * 100}%`,
                      transform: `translate(-50%, ${labelShift(views[i].y, plays[i].y)})`,
                    }}
                    title={`${label}: ${point.views} views`}
                  >
                    {formatPlays(point.views)}
                  </span>
                ) : null}
                {point.plays > 0 ? (
                  <span
                    className={cn(
                      "pointer-events-none absolute -translate-x-1/2 text-[11px] font-semibold tabular leading-none text-emerald-300 transition-opacity duration-150",
                      dim("plays") && "opacity-20",
                    )}
                    style={{
                      left: `${(plays[i].x / w) * 100}%`,
                      top: `${(plays[i].y / h) * 100}%`,
                      transform: `translate(-50%, ${labelShift(plays[i].y, views[i].y)})`,
                    }}
                    title={`${label}: ${point.plays} plays`}
                  >
                    {formatPlays(point.plays)}
                  </span>
                ) : null}
              </span>
            );
          })}
          </div>
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
