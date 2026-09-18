"use client";

import { useEffect, useState } from "react";
import { FeatureGate } from "@/components/FeatureGate";
import { IconDownload } from "@/components/icons";
import { publicMediaUrl } from "@/lib/media";
import { fetchPublishedDownloads, type ProjectRecord } from "@/lib/projects";

export default function DownloadsPage() {
  const [projects, setProjects] = useState<ProjectRecord[] | null>(null);

  useEffect(() => {
    fetchPublishedDownloads().then(setProjects);
  }, []);

  const listed = (projects ?? []).filter((p) => (p.project_files ?? []).length > 0);

  return (
    <FeatureGate id="downloads">
    <div className="mx-auto min-w-0 max-w-[800px]">
      <h1 className="text-display font-semibold tracking-tight">Downloads</h1>
      <p className="mt-1.5 text-body text-text-muted">Files published with a game. Open a listing to play in the browser.</p>

      {projects == null ? (
        <p className="mt-8 text-ui text-text-muted">Loading…</p>
      ) : listed.length === 0 ? (
        <p className="mt-10 rounded-panel bg-surface px-5 py-10 text-center text-ui text-text-muted">No downloadable files yet.</p>
      ) : (
        <ul className="mt-8 divide-y divide-border rounded-panel bg-surface">
          {listed.flatMap((project) =>
            (project.project_files ?? []).map((file) => {
              const href = file.external_url || publicMediaUrl(file.storage_path);
              return (
                <li key={project.id + file.file_name}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2"
                  >
                    <IconDownload className="h-4 w-4 shrink-0 text-text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ui font-medium">{file.file_name}</span>
                      <span className="block truncate text-caption text-text-subtle">{project.title}</span>
                    </span>
                    {file.size_bytes ? (
                      <span className="text-caption text-text-subtle">{formatBytes(file.size_bytes)}</span>
                    ) : null}
                  </a>
                </li>
              );
            }),
          )}
        </ul>
      )}
    </div>
    </FeatureGate>
  );
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n >= 10 * 1024 ? 0 : 1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
