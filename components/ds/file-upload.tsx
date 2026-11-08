"use client";

import { CircleAlert, CircleCheck, FileArchive, ImageIcon, Upload, X } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { ProgressBar } from "./feedback";

// Drop zone + file picker with size and type checks up front, and per-file progress below.
// The parent owns uploading; this component only picks and validates files and shows status.
// Image cropping for covers lives in the media flow (#5) and builds on top of this.

export type UploadStatus = {
  id: string;
  name: string;
  size: number;
  /** 0–100 while uploading. */
  progress?: number;
  state: "uploading" | "done" | "error";
  error?: string;
};

/** Checks a file against `accept` (".zip,image/*") and `maxBytes`. Returns a message or null. */
export function validateFile(file: { name: string; type: string; size: number }, accept?: string, maxBytes?: number) {
  if (accept) {
    const rules = accept.split(",").map((r) => r.trim().toLowerCase());
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    const ok = rules.some((r) =>
      r.startsWith(".") ? name.endsWith(r) : r.endsWith("/*") ? type.startsWith(r.slice(0, -1)) : type === r,
    );
    if (!ok) return `${file.name} isn’t a supported file type.`;
  }
  if (maxBytes && file.size > maxBytes)
    return `${file.name} is ${formatBytes(file.size)}. The limit is ${formatBytes(maxBytes)}.`;
  return null;
}

export function FileUpload({
  label,
  hint,
  accept,
  maxBytes,
  multiple = false,
  onFiles,
  uploads = [],
  onCancel,
  icon = "file",
}: {
  label: string;
  hint?: ReactNode;
  accept?: string;
  maxBytes?: number;
  multiple?: boolean;
  /** Called with the files that passed the checks. */
  onFiles: (files: File[]) => void;
  uploads?: UploadStatus[];
  onCancel?: (id: string) => void;
  icon?: "file" | "image";
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  function take(list: FileList | null) {
    if (!list) return;
    const picked = multiple ? [...list] : [...list].slice(0, 1);
    const bad = picked.map((f) => validateFile(f, accept, maxBytes)).filter((e): e is string => Boolean(e));
    setErrors(bad);
    const good = picked.filter((f) => !validateFile(f, accept, maxBytes));
    if (good.length) onFiles(good);
  }

  const Icon = icon === "image" ? ImageIcon : FileArchive;

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center gap-3 rounded-pw-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          over ? "border-pw-primary-hi bg-pw-primary/10" : "border-pw-line-box bg-pw-surface-1",
        )}
      >
        <Icon aria-hidden className="size-8 text-pw-sky" strokeWidth={1.5} />
        <div>
          <p className="text-pw-body font-semibold text-pw-text">
            <label htmlFor={id}>{label}</label>
          </p>
          <p className="mt-1 text-pw-caption text-pw-muted">
            Drag a file here, or choose one.
            {maxBytes ? ` Up to ${formatBytes(maxBytes)}.` : ""}
          </p>
          {hint ? <p className="mt-1 text-pw-caption text-pw-muted">{hint}</p> : null}
        </div>
        <Button
          size="sm"
          onClick={() => input.current?.click()}
          aria-describedby={errors.length ? `${id}-err` : undefined}
        >
          <Upload aria-hidden /> Choose {multiple ? "files" : "file"}
        </Button>
        <input
          ref={input}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          // The visible button is the keyboard path; the input itself stays out of the tab order.
          tabIndex={-1}
          className="sr-only"
          onChange={(e) => {
            take(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {errors.length ? (
        <ul id={`${id}-err`} role="alert" className="flex flex-col gap-1 text-pw-caption font-medium text-pw-danger">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      {uploads.length ? (
        <ul className="flex flex-col gap-3" aria-label="Uploads">
          {uploads.map((u) => (
            <li key={u.id} className="rounded-pw-lg border border-pw-line bg-pw-surface-1 p-3">
              {u.state === "uploading" ? (
                <ProgressBar
                  value={u.progress ?? 0}
                  label={u.name}
                  detail={`${formatBytes(((u.progress ?? 0) / 100) * u.size)} of ${formatBytes(u.size)}`}
                  onCancel={onCancel ? () => onCancel(u.id) : undefined}
                />
              ) : (
                <div className="flex items-center gap-3">
                  {u.state === "done" ? (
                    <CircleCheck aria-hidden className="size-5 shrink-0 text-pw-success" />
                  ) : (
                    <CircleAlert aria-hidden className="size-5 shrink-0 text-pw-danger" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-pw-body-sm font-semibold text-pw-text">{u.name}</p>
                    <p className={cn("text-pw-caption", u.state === "error" ? "text-pw-danger" : "text-pw-muted")}>
                      {u.state === "error" ? (u.error ?? "Upload failed.") : `${formatBytes(u.size)} · Uploaded`}
                    </p>
                  </div>
                  {onCancel ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${u.name}`}
                      onClick={() => onCancel(u.id)}
                    >
                      <X />
                    </Button>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
