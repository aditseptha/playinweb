"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { GameThumb } from "@/components/GameThumb";
import { IconDownload, IconExternal } from "@/components/icons";
import { ProjectCheckout } from "@/components/ProjectCheckout";
import { cn } from "@/lib/cn";
import { formatJoined, formatPlays, gamePath } from "@/lib/format";
import { publicMediaUrl } from "@/lib/media";
import { CLASSIFICATIONS, PROJECT_KINDS, RELEASE_STATUSES, STORES } from "@/lib/project-fields";
import type { ProjectRecord } from "@/lib/projects";
import type { Game } from "@/lib/types";

const RECO_PAGE = 10;

export function ProjectAside({
  project,
  plays,
  moreGames = [],
  className,
}: {
  project: ProjectRecord;
  plays: number;
  moreGames?: Game[];
  className?: string;
}) {
  const files = project.project_files ?? [];
  const stores = project.project_store_links ?? [];
  const genre = project.genre && project.genre !== "No genre" ? project.genre : null;
  const facts: { label: string; value: ReactNode }[] = [
    { label: "Released", value: formatJoined(project.created_at) },
    { label: "Played", value: <span className="tabular">{formatPlays(plays)}</span> },
    { label: "Status", value: <StatusPill id={project.release_status} /> },
    { label: "Genre", value: genre ?? "—" },
    { label: "Type", value: shortLabel(CLASSIFICATIONS, project.classification) },
    { label: "Kind", value: shortLabel(PROJECT_KINDS, project.kind) },
  ];

  const scroller = useRef<HTMLElement>(null);

  return (
    <aside
      ref={scroller}
      className={cn(
        "flex min-w-0 flex-col gap-5",
        "scrollbar-hide lg:h-[calc(100dvh-7rem)] lg:min-h-0 lg:overflow-x-hidden lg:overflow-y-auto lg:overscroll-contain",
        className,
      )}
    >
      <section>
        <dl className="grid grid-cols-2 gap-2">
          {facts.map((row) => (
            <div key={row.label} className="min-w-0 rounded-xl bg-surface-2 px-3 py-2.5">
              <dt className="text-caption text-text-subtle">{row.label}</dt>
              <dd className="mt-1 truncate text-ui font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <ProjectCheckout project={project} />

      {files.length > 0 ? (
        <section>
          <h2 className="text-eyebrow font-medium uppercase text-text-subtle">Downloads</h2>
          <ul className="mt-2 space-y-1">
            {files.map((file) => {
              const href = file.external_url || publicMediaUrl(file.storage_path);
              const size = formatBytes(file.size_bytes);
              return (
                <li key={file.file_name + (file.storage_path ?? file.external_url)}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1.5 -mx-1.5 text-ui transition-colors duration-150 ease-out-quint hover:bg-surface-2"
                  >
                    <IconDownload className="h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-150 ease-out-quint group-hover:translate-y-0.5 group-hover:text-text" />
                    <span className="min-w-0 truncate font-medium">{file.file_name}</span>
                    {size ? <span className="ml-auto shrink-0 text-caption text-text-subtle">{size}</span> : null}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {stores.length > 0 ? (
        <section>
          <h2 className="text-eyebrow font-medium uppercase text-text-subtle">Also on</h2>
          <ul className="mt-2 space-y-1">
            {stores.map((link) => (
              <li key={link.store}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-2 rounded-lg px-1.5 py-1.5 -mx-1.5 text-ui font-medium transition-colors duration-150 ease-out-quint hover:bg-surface-2"
                >
                  <span className="min-w-0 truncate">{STORES.find((s) => s.id === link.store)?.label ?? link.store}</span>
                  <IconExternal className="ml-auto h-3.5 w-3.5 shrink-0 text-text-subtle transition-transform duration-150 ease-out-quint group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-text" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {moreGames.length > 0 ? <MoreGames games={moreGames} root={scroller} /> : null}
    </aside>
  );
}

function MoreGames({ games, root }: { games: Game[]; root: RefObject<HTMLElement | null> }) {
  const [shown, setShown] = useState(RECO_PAGE);
  const sentinel = useRef<HTMLLIElement>(null);
  const visible = games.slice(0, shown);
  const hasMore = shown < games.length;

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown((n) => Math.min(n + RECO_PAGE, games.length));
        }
      },
      { root: desktop ? root.current : null, rootMargin: desktop ? "160px" : "280px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [games.length, hasMore, shown, root]);

  return (
    <section>
      <h2 className="text-eyebrow font-medium uppercase text-text-subtle">More games</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {visible.map((item) => (
          <li key={item.id}>
            <Link href={gamePath(item)} className="group flex gap-2">
              <div className="relative aspect-video w-[168px] shrink-0 overflow-hidden rounded-lg bg-surface-2">
                <GameThumb game={item} sizes="168px" />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-ui font-medium leading-snug group-hover:text-text-muted">
                  {item.title}
                </p>
                <p className="mt-1 truncate text-caption text-text-subtle">{item.developer}</p>
                <p className="text-caption text-text-subtle tabular">{formatPlays(item.playCount)} plays</p>
              </div>
            </Link>
          </li>
        ))}
        {hasMore ? <li ref={sentinel} className="h-4" aria-hidden /> : null}
      </ul>
    </section>
  );
}

function StatusPill({ id }: { id: string }) {
  const tone =
    id === "released"
      ? "bg-accent-soft text-text"
      : id === "in_development"
        ? "bg-warning/15 text-warning"
        : id === "canceled"
          ? "bg-surface-2 text-text-subtle"
          : "bg-surface-2 text-text-muted";
  return <span className={cn("rounded-md px-1.5 py-0.5 text-caption font-medium", tone)}>{shortLabel(RELEASE_STATUSES, id)}</span>;
}

function shortLabel(items: readonly { id: string; label: string }[], id: string) {
  const found = items.find((item) => item.id === id)?.label ?? id;
  return found.split(" — ")[0];
}

function formatBytes(n: number | null | undefined) {
  if (n == null || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) {
    const kb = n / 1024;
    return `${kb >= 10 ? kb.toFixed(0) : kb.toFixed(1)} KB`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
