"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LANDSCAPE, PORTRAIT } from "@/lib/media-standard";

export function CoverCropper({
  file,
  orientation,
  onCancel,
  onSave,
}: {
  file: File;
  orientation: "landscape" | "portrait";
  onCancel: () => void;
  onSave: (result: { file: File; focalX: number; focalY: number }) => void;
}) {
  const spec = orientation === "landscape" ? LANDSCAPE : PORTRAIT;
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  const [natural, setNatural] = useState({ url: "", w: 0, h: 0 });
  const size = natural.url === url ? natural : { url, w: 0, h: 0 };
  const [frame, setFrame] = useState({ w: 320, h: 180 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [focal, setFocal] = useState({ x: 0.5, y: 0.5 });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
  const drag = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);

  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setFrame({ w: el.clientWidth, h: el.clientHeight }));
    observer.observe(el);
    return () => observer.disconnect();
  }, [url]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const base = size.w ? Math.max(frame.w / size.w, frame.h / size.h) : 1;
  const maxZoom = size.w
    ? Math.max(1, Math.min(frame.w / spec.minWidth, frame.h / spec.minHeight) / base)
    : 1;
  const scale = base * Math.min(zoom, maxZoom);
  const drawW = size.w * scale;
  const drawH = size.h * scale;
  const panX = clampPan(pan.x, drawW, frame.w);
  const panY = clampPan(pan.y, drawH, frame.h);
  const left = (frame.w - drawW) / 2 + panX;
  const top = (frame.h - drawH) / 2 + panY;

  async function save() {
    const image = imageRef.current;
    if (!image || !size.w) return;
    setBusy(true);
    setFailed("");
    try {
      const sourceW = frame.w / scale;
      const sourceH = frame.h / scale;
      const outW = Math.min(spec.outWidth, Math.max(spec.minWidth, Math.round(sourceW)));
      const outH = Math.round(outW / spec.ratio);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not crop that image.");
      ctx.drawImage(image, -left / scale, -top / scale, sourceW, sourceH, 0, 0, outW, outH);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
      if (!blob) throw new Error("Could not convert that image to WebP.");
      const cropped = new File([blob], orientation === "landscape" ? "cover.webp" : "cover-portrait.webp", {
        type: "image/webp",
      });
      onSave({ file: cropped, focalX: focal.x, focalY: focal.y });
    } catch (err) {
      setFailed(err instanceof Error ? err.message : "Could not crop that image.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Crop cover">
      <div className="w-full max-w-lg rounded-panel bg-surface p-4 text-text shadow-panel">
        <p className="text-title font-semibold">{orientation === "landscape" ? "Landscape cover" : "Portrait cover"}</p>
        <p className="mt-1 text-caption text-text-muted">
          Drag to frame the image. Click to set the focus point. Keep the logo in the center, and leave the bottom third clear because cards cover it with the title.
        </p>
        <div
          ref={frameRef}
          className="relative mt-3 w-full overflow-hidden rounded-lg bg-black"
          style={{ aspectRatio: spec.ratio }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { x: event.clientX, y: event.clientY, panX, panY, moved: false };
          }}
          onPointerMove={(event) => {
            const current = drag.current;
            if (!current) return;
            const dx = event.clientX - current.x;
            const dy = event.clientY - current.y;
            if (Math.hypot(dx, dy) > 4) current.moved = true;
            setPan({ x: current.panX + dx, y: current.panY + dy });
          }}
          onPointerUp={(event) => {
            const current = drag.current;
            drag.current = null;
            if (!current || current.moved) return;
            const rect = event.currentTarget.getBoundingClientRect();
            setFocal({
              x: clamp01((event.clientX - rect.left) / rect.width),
              y: clamp01((event.clientY - rect.top) / rect.height),
            });
          }}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              draggable={false}
              ref={(node) => {
                imageRef.current = node;
              }}
              onLoad={(event) => setNatural({ url, w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight })}
              className="absolute max-w-none select-none"
              style={{ width: drawW || undefined, height: drawH || undefined, left, top }}
            />
          ) : null}
          <div className="pointer-events-none absolute inset-[10%] rounded border border-dashed border-white/70" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-black/35">
            <span className="absolute bottom-2 left-2 text-[11px] font-medium text-white">Covered on cards</span>
          </div>
          <span
            className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
            style={{ left: `${focal.x * 100}%`, top: `${focal.y * 100}%` }}
          />
        </div>
        <label className="mt-3 flex items-center gap-3 text-caption text-text-muted">
          Zoom
          <input
            type="range"
            min={1}
            max={maxZoom}
            step={0.01}
            value={Math.min(zoom, maxZoom)}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-full"
          />
        </label>
        {failed ? <p className="mt-2 text-caption text-danger">{failed}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="primary" disabled={!size.w || busy} onClick={() => void save()}>
            {busy ? "Cropping…" : "Use this crop"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function clampPan(pan: number, draw: number, frame: number) {
  const limit = Math.max(0, draw - frame) / 2;
  return Math.min(limit, Math.max(-limit, pan));
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}
