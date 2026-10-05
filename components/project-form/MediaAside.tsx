"use client";

import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import { IconClose } from "@/components/icons";
import { formatSize, imageSizeError, imageTooLarge, MAX_IMAGE_BYTES } from "@/components/project-form/shared";
import { Field, TextInput } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { publicMediaUrl } from "@/lib/media";
import type { ProjectRecord } from "@/lib/projects";

type Screenshot = NonNullable<ProjectRecord["project_screenshots"]>[number];

/** Right-hand column: cover image, trailer link, and screenshots. */
export function MediaAside({
  project,
  cover,
  setCover,
  shots,
  setShots,
  keptShots,
  setKeptShots,
  setError,
}: {
  project?: ProjectRecord;
  cover: File | null;
  setCover: (file: File) => void;
  shots: File[];
  setShots: Dispatch<SetStateAction<File[]>>;
  keptShots: Screenshot[];
  setKeptShots: Dispatch<SetStateAction<Screenshot[]>>;
  setError: (message: string) => void;
}) {
  const coverPreview = useMemo(() => (cover ? URL.createObjectURL(cover) : ""), [cover]);
  const shotPreviews = useMemo(() => shots.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })), [shots]);
  const coverSrc = coverPreview || publicMediaUrl(project?.cover_path);

  useEffect(() => () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  useEffect(() => () => {
    for (const shot of shotPreviews) URL.revokeObjectURL(shot.url);
  }, [shotPreviews]);

  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
      <div>
        <p className="text-caption font-medium text-text-muted">Cover image</p>
        <label className="relative mt-2 grid aspect-video cursor-pointer place-items-center overflow-hidden rounded-panel bg-bg-inset text-center text-ui text-text-muted">
          {coverSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
          <span
            className={cn(
              "relative z-10 rounded-md px-2 py-1",
              coverSrc ? "bg-black/60 text-white" : "",
            )}
          >
            {cover ? "Replace cover image" : project?.cover_path ? "Replace cover image" : "Upload cover image"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (imageTooLarge(file)) {
                setError(imageSizeError("Cover image"));
                return;
              }
              setError("");
              setCover(file);
            }}
          />
        </label>
        <p className="mt-2 text-meta text-text-subtle">
          Required for best results. 16:9, minimum 320×180, recommended 1280×720. Max {formatSize(MAX_IMAGE_BYTES)}.
        </p>
      </div>
      <Field label="Gameplay video or trailer" hint="YouTube or Vimeo">
        <TextInput name="trailerUrl" placeholder="https://www.youtube.com/watch?v=…" defaultValue={project?.trailer_url ?? ""} />
      </Field>
      <div>
        <p className="text-caption font-medium text-text-muted">Screenshots</p>
        <label className="mt-2 inline-flex h-10 cursor-pointer items-center rounded-lg bg-surface-2 px-3.5 text-body sm:h-9">
          Add screenshots
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              const picked = [...(e.target.files ?? [])];
              e.target.value = "";
              if (!picked.length) return;
              const accepted = picked.filter((file) => !imageTooLarge(file));
              if (accepted.length < picked.length) {
                setError(imageSizeError("Each screenshot"));
              } else {
                setError("");
              }
              if (accepted.length) setShots((cur) => [...cur, ...accepted]);
            }}
          />
        </label>
        <p className="mt-2 text-meta text-text-subtle">
          Upload 3 to 5 for best results. Max {formatSize(MAX_IMAGE_BYTES)} each.
        </p>
        {keptShots.length || shotPreviews.length ? (
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {keptShots.map((shot) => (
              <li key={shot.storage_path} className="relative aspect-video overflow-hidden rounded-lg bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={publicMediaUrl(shot.storage_path)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <RemoveShotButton
                  label="Remove screenshot"
                  onClick={() => setKeptShots((cur) => cur.filter((item) => item.storage_path !== shot.storage_path))}
                />
              </li>
            ))}
            {shotPreviews.map((shot, i) => (
              <li key={shot.url} className="relative aspect-video overflow-hidden rounded-lg bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shot.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <RemoveShotButton
                  label="Remove screenshot"
                  onClick={() => setShots((cur) => cur.filter((_, index) => index !== i))}
                />
              </li>
            ))}
          </ul>
        ) : null}
        {shotPreviews.length && keptShots.length ? (
          <p className="mt-2 text-meta text-text-subtle">
            {keptShots.length} uploaded, {shotPreviews.length} new ready to save
          </p>
        ) : shotPreviews.length ? (
          <p className="mt-2 text-meta text-text-subtle">{shotPreviews.length} new screenshot{shotPreviews.length === 1 ? "" : "s"} ready to save</p>
        ) : keptShots.length ? (
          <p className="mt-2 text-meta text-text-subtle">{keptShots.length} already uploaded</p>
        ) : null}
      </div>
    </aside>
  );
}

function RemoveShotButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="absolute right-1.5 top-1.5 z-10 grid size-7 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
    >
      <IconClose className="h-3.5 w-3.5" />
    </button>
  );
}
