import {
  clipError,
  isWebm,
  mp4Facts,
  readImageSize,
  stillImageError,
  webmHasAudio,
  type StillRole,
} from "@/lib/media-standard";

export const runtime = "nodejs";

const STILL: StillRole[] = ["landscape", "portrait", "screenshot"];

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Could not read that file." }, { status: 400 });
  }
  const file = form.get("file");
  const role = String(form.get("role") ?? "");
  if (!(file instanceof File)) return Response.json({ error: "Choose a file first." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (STILL.includes(role as StillRole)) {
    const size = readImageSize(bytes);
    const error = stillImageError({
      role: role as StillRole,
      bytes: file.size,
      width: size?.width ?? 0,
      height: size?.height ?? 0,
      mime: file.type,
      detected: size?.type ?? null,
    });
    if (error) return Response.json({ error }, { status: 400 });
    return Response.json({ ok: true, width: size?.width, height: size?.height });
  }

  if (role === "clip") {
    const image = readImageSize(bytes);
    const mp4 = mp4Facts(bytes);
    const webm = isWebm(bytes);
    const duration = mp4?.duration ?? numberOrNull(form.get("duration"));
    const hasAudio = Boolean(mp4?.hasAudio) || (webm && webmHasAudio(bytes)) || form.get("hasAudio") === "1";
    const error = clipError({
      bytes: file.size,
      mime: file.type,
      detected: mp4 ? "mp4" : webm ? "webm" : image?.type ?? null,
      duration,
      width: mp4?.width ?? image?.width ?? null,
      height: mp4?.height ?? image?.height ?? null,
      hasAudio,
    });
    if (error) return Response.json({ error }, { status: 400 });
    return Response.json({ ok: true, width: mp4?.width ?? image?.width ?? null, height: mp4?.height ?? image?.height ?? null, duration });
  }

  return Response.json({ error: "Unknown media role." }, { status: 400 });
}

function numberOrNull(value: FormDataEntryValue | null) {
  const n = typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(n) ? n : null;
}
