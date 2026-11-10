"use client";

import { useEffect, useState } from "react";
import { FeatureGate } from "@/components/FeatureGate";
import s from "@/components/home/home.module.css";
import { EmptyState } from "@/components/ds/empty-state";
import { TableSkeletonRows } from "@/components/ds/skeleton";
import { IconDownload } from "@/components/icons";
import { cn } from "@/lib/cn";
import { publicMediaUrl } from "@/lib/media";
import { fetchPublishedDownloads, type ProjectRecord } from "@/lib/projects";

export default function DownloadsPage() {
  const [projects, setProjects] = useState<ProjectRecord[] | null>(null);

  useEffect(() => {
    fetchPublishedDownloads().then(setProjects);
  }, []);

  const listed = (projects ?? []).filter((p) => (p.project_files ?? []).length > 0);

  return (
    <div className={cn(s.create, s.pageSkin)}>
      <FeatureGate id="downloads">
        <div className={s.frame}>
          <div className={s.wrap}>
            <p className={s.eyebrow}>Catalogue</p>
            <h1 className={s.createTitle}>Downloads</h1>
            <p className={s.legalIntro}>Files published with a game. Open a listing to play in the browser.</p>

            {projects == null ? (
              <div className="mt-8">
                <TableSkeletonRows rows={4} />
              </div>
            ) : listed.length === 0 ? (
              <EmptyState
                kind="user"
                illustration="empty-library"
                title="No downloadable files yet"
                body="Files published with a game will show up here."
              />
            ) : (
              <ul className={s.fileList}>
                {listed.flatMap((project) =>
                  (project.project_files ?? []).map((file) => {
                    const href = file.external_url || publicMediaUrl(file.storage_path);
                    return (
                      <li key={project.id + file.file_name}>
                        <a href={href} target="_blank" rel="noreferrer" className={s.fileRow}>
                          <IconDownload className={s.ic} />
                          <span>
                            <b>{file.file_name}</b>
                            <small>{project.title}</small>
                          </span>
                          {file.size_bytes ? <span className={s.fileSize}>{formatBytes(file.size_bytes)}</span> : null}
                        </a>
                      </li>
                    );
                  }),
                )}
              </ul>
            )}
          </div>
        </div>
      </FeatureGate>
    </div>
  );
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n >= 10 * 1024 ? 0 : 1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
