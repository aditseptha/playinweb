"use client";

import { useEffect, useImperativeHandle, useMemo, useState, type Ref } from "react";
import { IconClose } from "@/components/icons";
import { CoverCropper } from "@/components/project-form/CoverCropper";
import f from "@/components/project-form/form.module.css";
import { Field, TextInput } from "@/components/ui/field";
import { frameCover } from "@/components/project-form/frame-cover";
import { inspectClip, inspectStill } from "@/lib/inspect-media";
import { publicMediaUrl } from "@/lib/media";
import { focalOrCenter, formatBytes, MAX_CLIP_BYTES, MAX_SCREENSHOTS, objectPosition } from "@/lib/media-standard";
import type { ProjectRecord } from "@/lib/projects";

export type ShotDraft = {
  key: string;
  name: string;
  width: number | null;
  height: number | null;
  file?: File;
  storagePath?: string;
};

export type MediaDraft = {
  landscape: File | null;
  original: File | null;
  portrait: File | null;
  dropPortrait: boolean;
  focalX: number;
  focalY: number;
  shots: ShotDraft[];
  clip: File | null;
  dropClip: boolean;
};

export type MediaHandle = { getDraft: () => MediaDraft };

type CropRequest = { file: File; orientation: "landscape" | "portrait" };

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

/** Covers, trailer, preview clip, and screenshots. */
export function MediaAside({
  project,
  title,
  handleRef,
  setError,
  suggestedCover = null,
}: {
  project?: ProjectRecord;
  title: string;
  handleRef: Ref<MediaHandle>;
  setError: (message: string) => void;
  suggestedCover?: File | null;
}) {
  const focal = focalOrCenter(project?.cover_focal_x, project?.cover_focal_y);
  const [landscape, setLandscape] = useState<File | null>(null);
  const [original, setOriginal] = useState<File | null>(null);
  const [portrait, setPortrait] = useState<File | null>(null);
  const [dropPortrait, setDropPortrait] = useState(false);
  const [focalX, setFocalX] = useState(focal.x);
  const [focalY, setFocalY] = useState(focal.y);
  const [shots, setShots] = useState<ShotDraft[]>(() => initialShots(project));
  const [clip, setClip] = useState<File | null>(null);
  const [dropClip, setDropClip] = useState(false);
  const [crop, setCrop] = useState<CropRequest | null>(null);
  const [checking, setChecking] = useState("");

  useImperativeHandle(
    handleRef,
    () => ({
      getDraft: () => ({ landscape, original, portrait, dropPortrait, focalX, focalY, shots, clip, dropClip }),
    }),
    [landscape, original, portrait, dropPortrait, focalX, focalY, shots, clip, dropClip],
  );

  useEffect(() => {
    if (!suggestedCover) return;
    let cancelled = false;
    void frameCover(suggestedCover).then((file) => {
      if (cancelled || !file) return;
      setLandscape((current) => current ?? file);
      setOriginal((current) => current ?? suggestedCover);
    });
    return () => {
      cancelled = true;
    };
  }, [suggestedCover]);

  const landscapeUrl = useObjectUrl(landscape);
  const portraitUrl = useObjectUrl(portrait);
  const clipUrl = useObjectUrl(clip);

  const landscapeSrc = landscapeUrl || publicMediaUrl(project?.cover_path);
  const portraitSrc = dropPortrait ? "" : portraitUrl || publicMediaUrl(project?.cover_portrait_path);
  const clipSrc = dropClip ? "" : clipUrl || publicMediaUrl(project?.preview_clip_path);

  async function chooseCover(file: File | undefined, orientation: "landscape" | "portrait") {
    if (!file) return;
    setChecking(orientation === "landscape" ? "Checking cover…" : "Checking portrait cover…");
    const result = await inspectStill(file, orientation);
    setChecking("");
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setError("");
    setCrop({ file, orientation });
  }

  async function chooseShots(files: File[]) {
    if (!files.length) return;
    const room = MAX_SCREENSHOTS - shots.length;
    if (room <= 0) {
      setError(`You can add up to ${MAX_SCREENSHOTS} screenshots.`);
      return;
    }
    const picked = files.slice(0, room);
    if (picked.length < files.length) setError(`You can add up to ${MAX_SCREENSHOTS} screenshots.`);
    const next = [...shots];
    for (const file of picked) {
      setChecking(`Checking ${file.name}…`);
      const result = await inspectStill(file, "screenshot");
      if ("error" in result && result.error) {
        setChecking("");
        setError(result.error);
        setShots(next);
        return;
      }
      if (!("width" in result) || result.width == null || result.height == null) {
        setChecking("");
        setError("Could not read that image.");
        setShots(next);
        return;
      }
      next.push({
        key: crypto.randomUUID(),
        name: file.name,
        width: result.width,
        height: result.height,
        file,
      });
    }
    setChecking("");
    setError("");
    setShots(next);
  }

  async function chooseClip(file: File | undefined) {
    if (!file) return;
    setChecking("Checking preview clip…");
    const probe = file.type === "image/gif" ? undefined : await probeVideo(file);
    const result = await inspectClip(file, probe);
    setChecking("");
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setError("");
    setClip(file);
    setDropClip(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className={f.covers}>
          <div>
            <p className={f.badge}>Required</p>
            <CoverSlot
              wide
              title={landscapeSrc ? "Replace wide cover" : "Add a wide cover"}
              hint="16:9, 1280×720+"
              src={landscapeSrc}
              position={objectPosition(focalX, focalY)}
              onFile={(file) => void chooseCover(file, "landscape")}
            />
          </div>
          <div>
            <p className={f.badge}>Optional</p>
            <CoverSlot
              title={portraitSrc ? "Replace tall cover" : "Add a tall cover"}
              hint="3:4"
              src={portraitSrc}
              onFile={(file) => void chooseCover(file, "portrait")}
            />
          </div>
        </div>
        <p className={`${f.note} mt-3`}>Keep the logo centered.</p>
        <div className={`${f.actions} mt-2`}>
          {project?.cover_original_path || project?.cover_path ? (
            <button type="button" className={f.linkish} onClick={() => void recrop(project, setError, setChecking, setCrop)}>
              Adjust the crop
            </button>
          ) : null}
          {portraitSrc ? (
            <button
              type="button"
              className={f.linkish}
              onClick={() => {
                setPortrait(null);
                setDropPortrait(true);
              }}
            >
              Remove tall cover
            </button>
          ) : null}
        </div>
      </div>

      <CoverPreviews title={title || "Your game"} landscape={landscapeSrc} portrait={portraitSrc} focalX={focalX} focalY={focalY} />

      <Field label="Trailer" hint="YouTube or Vimeo">
        <TextInput name="trailerUrl" placeholder="https://www.youtube.com/watch?v=…" defaultValue={project?.trailer_url ?? ""} />
      </Field>

      <div>
        <label className={f.row}>
          <strong>{clipSrc ? "Replace preview clip" : "Add a preview clip"}</strong>
          <small>Silent clip or GIF. Max {formatBytes(MAX_CLIP_BYTES)}.</small>
          <input
            type="file"
            accept="video/mp4,video/webm,image/gif,.mp4,.webm,.gif"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void chooseClip(file);
            }}
          />
        </label>
        {clipSrc ? (
          <button
            type="button"
            className={`${f.linkish} mt-2`}
            onClick={() => {
              setClip(null);
              setDropClip(true);
            }}
          >
            Remove preview clip
          </button>
        ) : null}
      </div>

      <ScreenshotList shots={shots} setShots={setShots} onAdd={(files) => void chooseShots(files)} />
      {checking ? <p className={f.note}>{checking}</p> : null}

      {crop ? (
        <CoverCropper
          file={crop.file}
          orientation={crop.orientation}
          onCancel={() => setCrop(null)}
          onSave={(result) => {
            if (crop.orientation === "landscape") {
              setLandscape(result.file);
              setOriginal(crop.file);
              setFocalX(result.focalX);
              setFocalY(result.focalY);
            } else {
              setPortrait(result.file);
              setDropPortrait(false);
            }
            setCrop(null);
          }}
        />
      ) : null}
    </div>
  );
}

function CoverSlot({
  wide,
  title,
  hint,
  src,
  position,
  onFile,
}: {
  wide?: boolean;
  title: string;
  hint: string;
  src: string;
  position?: string;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <label className={`${f.slot} ${wide ? f.slotWide : f.slotTall} ${src ? f.filled : ""}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" style={position ? { objectPosition: position } : undefined} />
      ) : null}
      <span className={f.copy}>
        <strong>{title}</strong>
        {src ? null : <small>{hint}</small>}
      </span>
      <input
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          onFile(file);
        }}
      />
    </label>
  );
}

function CoverPreviews({
  title,
  landscape,
  portrait,
  focalX,
  focalY,
}: {
  title: string;
  landscape: string;
  portrait: string;
  focalX: number;
  focalY: number;
}) {
  if (!landscape && !portrait) return null;
  const position = objectPosition(focalX, focalY);
  return (
    <div>
      <p className="text-caption font-medium text-text-muted">How cards will look</p>
      <div className={`${f.previews} mt-2`}>
        <Mini label="Wide card" src={landscape} ratio="16/9" position={position} title={title} />
        <Mini label="Tall card" src={portrait || landscape} ratio="3/4" position={position} title={title} />
        <Mini label="Hero" src={landscape} ratio="21/9" position={position} title={title} />
      </div>
    </div>
  );
}

function Mini({
  label,
  src,
  ratio,
  position,
  title,
}: {
  label: string;
  src: string;
  ratio: "16/9" | "3/4" | "21/9";
  position: string;
  title: string;
}) {
  return (
    <div className={f.preview}>
      <div className={f.previewFrame} style={{ aspectRatio: ratio.replace("/", " / ") }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" style={{ objectPosition: position }} />
        ) : (
          <span>{title}</span>
        )}
      </div>
      <p>{label}</p>
    </div>
  );
}

function ScreenshotList({
  shots,
  setShots,
  onAdd,
}: {
  shots: ShotDraft[];
  setShots: (shots: ShotDraft[]) => void;
  onAdd: (files: File[]) => void;
}) {
  return (
    <div>
      <label className={f.row}>
        <strong>{shots.length ? "Add more screenshots" : "Add screenshots"}</strong>
        <small>Up to {MAX_SCREENSHOTS}. Drag to reorder.</small>
        <input
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          className="sr-only"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            onAdd(files);
          }}
        />
      </label>
      {shots.length ? (
        <ul className={`${f.shots} mt-3`}>
          {shots.map((shot, index) => (
            <li
              key={shot.key}
              draggable
              onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const from = Number(event.dataTransfer.getData("text/plain"));
                if (!Number.isInteger(from) || from === index) return;
                const next = [...shots];
                const [item] = next.splice(from, 1);
                next.splice(index, 0, item);
                setShots(next);
              }}
              className={f.shot}
            >
              <ShotThumb shot={shot} />
              <span>{shot.name}</span>
              <button type="button" aria-label="Remove screenshot" onClick={() => setShots(shots.filter((item) => item.key !== shot.key))}>
                <IconClose className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ShotThumb({ shot }: { shot: ShotDraft }) {
  const fresh = useObjectUrl(shot.file ?? null);
  const src = fresh || publicMediaUrl(shot.storagePath);
  return (
    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-black">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-contain" />
      ) : null}
    </span>
  );
}

function useObjectUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);
  return url;
}

function initialShots(project?: ProjectRecord): ShotDraft[] {
  return [...(project?.project_screenshots ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((shot) => ({
      key: shot.id,
      name: "Uploaded screenshot",
      width: shot.width ?? null,
      height: shot.height ?? null,
      storagePath: shot.storage_path,
    }));
}

async function recrop(
  project: ProjectRecord | undefined,
  setError: (message: string) => void,
  setChecking: (message: string) => void,
  setCrop: (crop: CropRequest | null) => void,
) {
  const path = project?.cover_original_path || project?.cover_path;
  const url = publicMediaUrl(path);
  if (!url) return;
  setChecking("Loading the original cover…");
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not load the original cover.");
    const blob = await response.blob();
    const file = new File([blob], "cover-original", { type: blob.type || "image/jpeg" });
    setChecking("");
    setCrop({ file, orientation: "landscape" });
  } catch (err) {
    setChecking("");
    setError(err instanceof Error ? err.message : "Could not load the original cover.");
  }
}

function probeVideo(file: File) {
  return new Promise<{ duration: number; width: number; height: number; hasAudio: boolean } | undefined>((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => {
      const probed = video as HTMLVideoElement & { mozHasAudio?: boolean; audioTracks?: { length: number } };
      const hasAudio = Boolean(probed.mozHasAudio) || Boolean(probed.audioTracks && probed.audioTracks.length > 0);
      const result = { duration: video.duration, width: video.videoWidth, height: video.videoHeight, hasAudio };
      URL.revokeObjectURL(url);
      resolve(result);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(undefined);
    };
    video.src = url;
  });
}
