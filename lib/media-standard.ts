/** Cover, screenshot, and preview-clip rules from the media standard. */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_CLIP_BYTES = 8 * 1024 * 1024;
export const MAX_SCREENSHOTS = 8;
export const MIN_SCREENSHOT_WIDTH = 960;
export const CLIP_MIN_SECONDS = 3;
export const CLIP_MAX_SECONDS = 10;
export const CLIP_MAX_HEIGHT = 720;

export const LANDSCAPE = {
  ratio: 16 / 9,
  minWidth: 1280,
  minHeight: 720,
  outWidth: 1920,
  outHeight: 1080,
} as const;

export const PORTRAIT = {
  ratio: 3 / 4,
  minWidth: 600,
  minHeight: 800,
  outWidth: 1200,
  outHeight: 1600,
} as const;

export type StillRole = "landscape" | "portrait" | "screenshot";
export type ImageKind = "png" | "jpeg" | "gif" | "webp";

export function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  const mb = n / (1024 * 1024);
  return Number.isInteger(mb) ? `${mb} MB` : `${mb.toFixed(1)} MB`;
}

export function focalOrCenter(x: unknown, y: unknown) {
  return { x: clampUnit(x), y: clampUnit(y) };
}

export function objectPosition(x: unknown, y: unknown) {
  const focal = focalOrCenter(x, y);
  return `${(focal.x * 100).toFixed(2)}% ${(focal.y * 100).toFixed(2)}%`;
}

export function coverBelowStandard(width: number, height: number) {
  return width < LANDSCAPE.minWidth || height < LANDSCAPE.minHeight;
}

export function ratioDelta(width: number, height: number, ratio: number) {
  if (width <= 0 || height <= 0 || ratio <= 0) return Number.POSITIVE_INFINITY;
  return Math.abs(width / height - ratio) / ratio;
}

/** Reasons an existing cover should be re-uploaded. Empty means it meets the standard. */
export function coverAudit(width: number, height: number) {
  const reasons: string[] = [];
  if (coverBelowStandard(width, height)) reasons.push("below 1280×720");
  if (ratioDelta(width, height, LANDSCAPE.ratio) > 0.08) reasons.push("not 16:9");
  return reasons;
}

export function stillImageError(input: {
  role: StillRole;
  bytes: number;
  width: number;
  height: number;
  mime?: string;
  detected?: ImageKind | null;
}): string | null {
  const mime = (input.mime ?? "").toLowerCase();
  if (input.detected === "gif" || mime === "image/gif") {
    return "GIFs play as a preview clip. Add the GIF there instead.";
  }
  const allowed = mime === "" || mime === "image/jpeg" || mime === "image/jpg" || mime === "image/png" || mime === "image/webp";
  const detectedOk = !input.detected || input.detected === "jpeg" || input.detected === "png" || input.detected === "webp";
  if (!allowed || !detectedOk) return "Use a JPG, PNG, or WebP image.";
  if (input.bytes > MAX_IMAGE_BYTES) return `Image must be ${formatBytes(MAX_IMAGE_BYTES)} or smaller.`;
  if (input.width < 1 || input.height < 1) return "Could not read that image.";
  if (input.role === "landscape" && (input.width < LANDSCAPE.minWidth || input.height < LANDSCAPE.minHeight)) {
    return `Cover must be at least ${LANDSCAPE.minWidth}×${LANDSCAPE.minHeight}. Recommended size is ${LANDSCAPE.outWidth}×${LANDSCAPE.outHeight}.`;
  }
  if (input.role === "portrait" && (input.width < PORTRAIT.minWidth || input.height < PORTRAIT.minHeight)) {
    return `Portrait cover must be at least ${PORTRAIT.minWidth}×${PORTRAIT.minHeight}. Recommended size is ${PORTRAIT.outWidth}×${PORTRAIT.outHeight}.`;
  }
  if (input.role === "screenshot" && input.width < MIN_SCREENSHOT_WIDTH) {
    return `Screenshots must be at least ${MIN_SCREENSHOT_WIDTH} pixels wide.`;
  }
  return null;
}

export function clipError(input: {
  bytes: number;
  mime?: string;
  detected?: ImageKind | "mp4" | "webm" | null;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  hasAudio?: boolean;
}): string | null {
  const mime = (input.mime ?? "").toLowerCase();
  const gif = input.detected === "gif" || mime === "image/gif";
  const video =
    input.detected === "mp4" ||
    input.detected === "webm" ||
    mime === "video/mp4" ||
    mime === "video/webm";
  if (!gif && !video) return "Preview clips must be MP4, WebM, or GIF.";
  if (input.bytes > MAX_CLIP_BYTES) return `Preview clip must be ${formatBytes(MAX_CLIP_BYTES)} or smaller.`;
  if (gif) return null;
  if (input.hasAudio) return "Preview clips must be silent. Remove the audio track and upload again.";
  if (input.duration == null || !Number.isFinite(input.duration)) {
    return "Could not read the clip length. Use an MP4 or WebM between 3 and 10 seconds.";
  }
  if (input.duration < CLIP_MIN_SECONDS || input.duration > CLIP_MAX_SECONDS) {
    return "Preview clips must be between 3 and 10 seconds.";
  }
  if (input.height != null && input.height > CLIP_MAX_HEIGHT) return "Preview clips must be 720p or smaller.";
  return null;
}

export function readImageSize(bytes: Uint8Array): { width: number; height: number; type: ImageKind } | null {
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { type: "png", width: u32(bytes, 16), height: u32(bytes, 20) };
  }
  if (bytes.length >= 10 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return { type: "gif", width: u16le(bytes, 6), height: u16le(bytes, 8) };
  }
  if (bytes.length >= 30 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    const chunk = ascii(bytes, 12, 4);
    if (chunk === "VP8X") {
      return {
        type: "webp",
        width: 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)),
        height: 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)),
      };
    }
    if (chunk === "VP8 " && bytes.length >= 30) {
      return { type: "webp", width: u16le(bytes, 26) & 0x3fff, height: u16le(bytes, 28) & 0x3fff };
    }
    if (chunk === "VP8L" && bytes.length >= 25) {
      const b0 = bytes[21];
      const b1 = bytes[22];
      const b2 = bytes[23];
      const b3 = bytes[24];
      return {
        type: "webp",
        width: 1 + (((b1 & 0x3f) << 8) | b0),
        height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
      };
    }
  }
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let p = 2;
    while (p + 9 < bytes.length) {
      if (bytes[p] !== 0xff) {
        p += 1;
        continue;
      }
      const marker = bytes[p + 1];
      if (marker === 0xd8 || marker === 0xd9) {
        p += 2;
        continue;
      }
      if (p + 4 > bytes.length) return null;
      const size = u16(bytes, p + 2);
      if (size < 2) return null;
      const sof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (sof) return { type: "jpeg", height: u16(bytes, p + 5), width: u16(bytes, p + 7) };
      p += 2 + size;
    }
  }
  return null;
}

export function mp4Facts(bytes: Uint8Array): { duration: number | null; hasAudio: boolean; width: number | null; height: number | null } | null {
  if (bytes.length < 12 || ascii(bytes, 4, 4) !== "ftyp") return null;
  let duration: number | null = null;
  let hasAudio = false;
  let width: number | null = null;
  let height: number | null = null;

  const visit = (type: string, start: number, end: number) => {
    if (type === "mvhd" && duration == null) duration = mvhdDuration(bytes, start, end);
    if (type === "hdlr" && ascii(bytes, start + 8, 4) === "soun") hasAudio = true;
    if (type === "tkhd") {
      const box = tkhdSize(bytes, start, end);
      if (box && (width == null || box.width > width)) {
        width = box.width;
        height = box.height;
      }
    }
  };
  walkBoxes(bytes, 0, bytes.length, visit);
  return { duration, hasAudio, width, height };
}

export function webmHasAudio(bytes: Uint8Array) {
  if (!isWebm(bytes)) return false;
  const text = new TextDecoder("latin1").decode(bytes);
  return text.includes("OpusHead") || text.includes("A_OPUS") || text.includes("A_VORBIS") || text.includes("vorbis");
}

export function isWebm(bytes: Uint8Array) {
  return bytes.length > 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
}

function clampUnit(value: unknown) {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function u32(bytes: Uint8Array, offset: number) {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function u16(bytes: Uint8Array, offset: number) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function u16le(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  let out = "";
  for (let i = 0; i < length; i += 1) out += String.fromCharCode(bytes[offset + i] ?? 0);
  return out;
}

function walkBoxes(
  bytes: Uint8Array,
  start: number,
  end: number,
  visit: (type: string, payloadStart: number, payloadEnd: number) => void,
) {
  const containers = new Set(["moov", "trak", "mdia", "minf", "stbl", "edts"]);
  let p = start;
  while (p + 8 <= end) {
    let size = u32(bytes, p);
    const type = ascii(bytes, p + 4, 4);
    let header = 8;
    if (size === 1) {
      if (p + 16 > end || u32(bytes, p + 8) !== 0) break;
      size = u32(bytes, p + 12);
      header = 16;
    } else if (size === 0) {
      size = end - p;
    }
    if (size < header || p + size > end) break;
    visit(type, p + header, p + size);
    if (containers.has(type)) walkBoxes(bytes, p + header, p + size, visit);
    p += size;
  }
}

function mvhdDuration(bytes: Uint8Array, start: number, end: number) {
  const version = bytes[start];
  if (version === 0 && start + 20 <= end) {
    const scale = u32(bytes, start + 12);
    return scale ? u32(bytes, start + 16) / scale : null;
  }
  if (version === 1 && start + 32 <= end) {
    const scale = u32(bytes, start + 20);
    const dur = u32(bytes, start + 24) * 2 ** 32 + u32(bytes, start + 28);
    return scale ? dur / scale : null;
  }
  return null;
}

function tkhdSize(bytes: Uint8Array, start: number, end: number) {
  const version = bytes[start];
  const offset = version === 1 ? 88 : 76;
  if (start + offset + 8 > end) return null;
  const width = u32(bytes, start + offset) / 65536;
  const height = u32(bytes, start + offset + 4) / 65536;
  if (width < 1 || height < 1) return null;
  return { width, height };
}
