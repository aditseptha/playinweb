"use client";

import { useEffect, useState } from "react";
import { fieldLabel, formatSize, MAX_FILE, type HtmlPreview } from "@/components/project-form/shared";
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
        <Field
          label="HTML5 game"
          hint={
            editing
              ? "Leave empty to keep the current build. Upload a new .zip to replace it. Max 100 MB."
              : "A .zip with index.html, like itch.io. Max 100 MB. Players run it here — the original host is never shown."
          }
        >
          <input
            type="file"
            accept=".zip,.html,.htm,application/zip"
            className="block w-full text-ui text-text-muted file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:text-body file:text-text"
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
        </Field>
      ) : null}

      {kind === "flash" ? (
        <Field
          label={fieldLabel("Flash game", "Upload a .swf file. Max 50 MB.")}
        >
          <input
            type="file"
            accept=".swf,application/x-shockwave-flash"
            className="block w-full text-ui text-text-muted file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:text-body file:text-text"
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
          {flashBuild ? (
            <p className="text-meta text-text-subtle">Selected file: {flashBuild.name}</p>
          ) : storedBuildName ? (
            <p className="text-meta text-text-subtle">Current file: {storedBuildName}</p>
          ) : editing && project?.play_url ? (
            <p className="text-meta text-text-subtle">
              Current file: Name not saved — re-upload your .swf to show the file name here.
            </p>
          ) : null}
        </Field>
      ) : null}

      {kind === "external" ? (
        <Field label={fieldLabel("Play URL", "Link to itch.io, Steam, your site, or anywhere players can play.")}>
          <TextInput
            type="url"
            value={playLink}
            onChange={(e) => setPlayLink(e.target.value)}
            placeholder="https://…"
            required
          />
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
