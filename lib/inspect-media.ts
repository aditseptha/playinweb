import {
  clipError,
  isWebm,
  mp4Facts,
  readImageSize,
  stillImageError,
  webmHasAudio,
  type StillRole,
} from "@/lib/media-standard";

export async function inspectStill(file: File, role: StillRole) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const size = readImageSize(bytes);
  const local = stillImageError({
    role,
    bytes: file.size,
    width: size?.width ?? 0,
    height: size?.height ?? 0,
    mime: file.type,
    detected: size?.type ?? null,
  });
  if (local || !size) return { error: local ?? "Could not read that image." };
  const remote = await post(file, role);
  if (remote) return { error: remote };
  return { width: size.width, height: size.height };
}

export async function inspectClip(
  file: File,
  probe?: { duration: number; width: number; height: number; hasAudio: boolean },
) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = readImageSize(bytes);
  const mp4 = mp4Facts(bytes);
  const webm = isWebm(bytes);
  const local = clipError({
    bytes: file.size,
    mime: file.type,
    detected: mp4 ? "mp4" : webm ? "webm" : (image?.type ?? null),
    duration: mp4?.duration ?? probe?.duration ?? null,
    width: mp4?.width ?? probe?.width ?? image?.width ?? null,
    height: mp4?.height ?? probe?.height ?? image?.height ?? null,
    hasAudio: Boolean(mp4?.hasAudio) || (webm && webmHasAudio(bytes)) || Boolean(probe?.hasAudio),
  });
  if (local) return { error: local };
  const remote = await post(file, "clip", probe);
  if (remote) return { error: remote };
  return { ok: true as const };
}

async function post(file: File, role: string, probe?: { duration: number; hasAudio: boolean }) {
  const body = new FormData();
  body.set("file", file);
  body.set("role", role);
  if (probe) {
    body.set("duration", String(probe.duration));
    body.set("hasAudio", probe.hasAudio ? "1" : "0");
  }
  try {
    const response = await fetch("/api/media/inspect", { method: "POST", body });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) return data.error || "Could not check that file.";
    return null;
  } catch {
    return "Could not check that file.";
  }
}
