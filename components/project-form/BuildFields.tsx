"use client";

import { useEffect, useState, type ReactNode } from "react";
import { formatSize, MAX_FILE, type HtmlPreview } from "@/components/project-form/shared";
import f from "@/components/project-form/form.module.css";
import { Field, TextInput } from "@/components/ui/field";
import {
  filesFromHtmlUpload,
  flashStoragePrefix,
  htmlBuildSourcePath,
  htmlStoragePrefix,
  MAX_HTML_BYTES,
} from "@/lib/html-game";
import { MEDIA_BUCKET } from "@/lib/media";
import type { ProjectKind } from "@/lib/project-fields";
import type { ProjectRecord } from "@/lib/projects";
import { createClient } from "@/lib/supabase/client";

/** Upload / link fields for the selected game kind (HTML5 zip, Flash .swf, or external URL). */
export function BuildFields({
  kind,
  editing,
  project,
  htmlBuild,
  setHtmlBuild,
  flashBuild,
  setFlashBuild,
  playLink,
  setPlayLink,
  setError,
  action,
}: {
  kind: ProjectKind;
  editing: boolean;
  project?: ProjectRecord;
  htmlBuild: File | null;
  setHtmlBuild: (file: File | null) => void;
  flashBuild: File | null;
  setFlashBuild: (file: File | null) => void;
  playLink: string;
  setPlayLink: (value: string) => void;
  setError: (message: string) => void;
  action?: ReactNode;
}) {
  const [htmlPreview, setHtmlPreview] = useState<HtmlPreview | null>(null);
  const [fetchedBuildName, setFetchedBuildName] = useState("");
  const storedBuildName = project?.html_build_name || fetchedBuildName;

  useEffect(() => {
    if (!htmlBuild) return;
    let cancelled = false;
    void (async () => {
      try {
        const packed = await filesFromHtmlUpload(htmlBuild.name, await htmlBuild.arrayBuffer());
        if (cancelled) return;
        setHtmlPreview({
          name: htmlBuild.name,
          size: htmlBuild.size,
          files: packed.map((file) => file.path),
          error: "",
        });
      } catch (err) {
        if (!cancelled) {
          setHtmlPreview({
            name: htmlBuild.name,
            size: htmlBuild.size,
            files: [],
            error: err instanceof Error ? err.message : "Could not read this file.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [htmlBuild]);

  useEffect(() => {
    if (!editing || !project || (project.kind !== "html" && project.kind !== "flash")) return;
    if (project.html_build_name) return;
    let cancelled = false;
    const supabase = createClient();
    const prefix =
      project.kind === "flash"
        ? flashStoragePrefix(project.owner_id, project.id)
        : htmlStoragePrefix(project.owner_id, project.id);
    const sourcePath = htmlBuildSourcePath(prefix);
    void supabase.storage
      .from(MEDIA_BUCKET)
      .download(sourcePath)
      .then(async ({ data, error }) => {
        if (cancelled || error || !data) return;
        const name = (await data.text()).trim();
        if (name) setFetchedBuildName(name);
      });
    return () => {
      cancelled = true;
    };
  }, [editing, project]);

  return (
    <>
      {kind === "html" ? (
        <div>
          <p className="text-caption font-medium text-text-muted">Game file</p>
          <div className={`${f.pick} continueHost mt-2`}>
            <label>
              {htmlBuild || storedBuildName ? (
                <strong>{htmlBuild?.name || `Current file: ${storedBuildName}`}</strong>
              ) : (
                <span className={f.pickLine}>
                  <span className={f.pickPlus} aria-hidden>+</span>
                  <span>Choose a .zip or .html file. Max 100 MB.</span>
                </span>
              )}
              <input
                type="file"
                accept=".zip,.html,.htm,application/zip"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file && file.size > MAX_HTML_BYTES) {
                    e.target.value = "";
                    setHtmlBuild(null);
                    setHtmlPreview({
                      name: file.name,
                      size: file.size,
                      files: [],
                      error: "HTML5 game must be 100 MB or smaller.",
                    });
                    return;
                  }
                  setHtmlBuild(file);
                  if (!file) setHtmlPreview(null);
                }}
              />
            </label>
            {action}
          </div>
          {htmlPreview ? (
            <HtmlBuildPreview preview={htmlPreview} />
          ) : htmlBuild ? (
            <p className="text-meta text-text-subtle">Selected file: {htmlBuild.name}</p>
          ) : storedBuildName ? (
            <p className="text-meta text-text-subtle">Current file: {storedBuildName}</p>
          ) : editing && project?.play_url ? (
            <p className="text-meta text-text-subtle">
              Current file: Name not saved — re-upload your .zip to show the file name here.
            </p>
          ) : null}
        </div>
      ) : null}

      {kind === "flash" ? (
        <div>
          <p className="text-caption font-medium text-text-muted">Flash file</p>
          <div className={`${f.pick} continueHost mt-2`}>
            <label>
              {flashBuild || storedBuildName ? (
                <strong>{flashBuild?.name || `Current file: ${storedBuildName}`}</strong>
              ) : (
                <span className={f.pickLine}>
                  <span className={f.pickPlus} aria-hidden>+</span>
                  <span>Choose a .swf file. Max 50 MB.</span>
                </span>
              )}
              <input
                type="file"
                accept=".swf,application/x-shockwave-flash"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file && file.size > MAX_FILE) {
                    e.target.value = "";
                    setFlashBuild(null);
                    setError("Flash game must be 50 MB or smaller.");
                    return;
                  }
                  setFlashBuild(file);
                  setError("");
                }}
              />
            </label>
            {action}
          </div>
          {flashBuild ? (
            <p className="text-meta text-text-subtle">Selected file: {flashBuild.name}</p>
          ) : storedBuildName ? (
            <p className="text-meta text-text-subtle">Current file: {storedBuildName}</p>
          ) : editing && project?.play_url ? (
            <p className="text-meta text-text-subtle">
              Current file: Name not saved — re-upload your .swf to show the file name here.
            </p>
          ) : null}
        </div>
      ) : null}

      {kind === "external" ? (
        <Field label="Play link">
          <div className={action ? `${f.linkRow} linkAction` : undefined}>
            <TextInput
              type="url"
              value={playLink}
              onChange={(e) => setPlayLink(e.target.value)}
              placeholder="https://…"
              required
            />
            {action ? <div className={f.linkAction}>{action}</div> : null}
          </div>
        </Field>
      ) : null}
    </>
  );
}

function HtmlBuildPreview({ preview }: { preview: HtmlPreview }) {
  return (
    <div className="mt-3 overflow-hidden rounded-lg bg-bg-inset">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2">
        <p className="min-w-0 truncate text-ui font-medium">{preview.name}</p>
        <p className="text-meta text-text-subtle">{formatSize(preview.size)}</p>
      </div>
      {preview.error ? (
        <p className="px-3 pb-3 text-ui text-danger">{preview.error}</p>
      ) : (
        <>
          <p className="px-3 text-meta text-text-subtle">
            {preview.files.length} file{preview.files.length === 1 ? "" : "s"}
          </p>
          <ul className="max-h-32 overflow-y-auto px-3 pb-3 text-meta text-text-subtle">
            {preview.files.slice(0, 20).map((path) => (
              <li key={path} className="truncate">
                {path}
              </li>
            ))}
            {preview.files.length > 20 ? <li>+{preview.files.length - 20} more</li> : null}
          </ul>
        </>
      )}
    </div>
  );
}
