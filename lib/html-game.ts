async function unzipHtmlArchive(buf: ArrayBuffer) {
  const { unzipSync } = await import("fflate");
  return unzipSync(new Uint8Array(buf));
}

const MAX_FILES = 400;
export const MAX_HTML_BYTES = 100 * 1024 * 1024;

export function htmlStoragePrefix(ownerId: string, projectId: string) {
  return `${ownerId}/html/${projectId}`;
}

export function htmlBuildSourcePath(prefix: string) {
  return `${prefix}/.build-source`;
}

export function flashStoragePrefix(ownerId: string, projectId: string) {
  return `${ownerId}/flash/${projectId}`;
}

export function hostedPlayPath(slug: string) {
  return `/${slug}/index.html`;
}

export function playFrameSandbox(_playUrl?: string) {
  return "allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-forms";
}

export function contentType(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const types: Record<string, string> = {
    html: "text/html; charset=utf-8",
    htm: "text/html; charset=utf-8",
    js: "text/javascript; charset=utf-8",
    mjs: "text/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    json: "application/json",
    wasm: "application/wasm",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    wav: "audio/wav",
    mp4: "video/mp4",
    webm: "video/webm",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    txt: "text/plain; charset=utf-8",
    xml: "application/xml",
  };
  return types[ext] ?? "application/octet-stream";
}

export type HtmlFile = { path: string; bytes: Uint8Array };

export async function filesFromHtmlUpload(name: string, buf: ArrayBuffer): Promise<HtmlFile[]> {
  if (buf.byteLength > MAX_HTML_BYTES) throw new Error("HTML5 game must be 100 MB or smaller.");
  const lower = name.toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    return [{ path: "index.html", bytes: new Uint8Array(buf) }];
  }
  if (!lower.endsWith(".zip")) {
    throw new Error("Upload a .zip of the game, or a single index.html.");
  }
  const unzipped = await unzipHtmlArchive(buf);
  const raw = Object.entries(unzipped)
    .map(([path, bytes]) => ({ path: path.replace(/\\/g, "/").replace(/^\/+/, ""), bytes }))
    .filter(({ path }) => path && !path.endsWith("/") && !junkPath(path));
  if (raw.length > MAX_FILES) throw new Error("Too many files in the zip (max 400).");
  const total = raw.reduce((n, f) => n + f.bytes.byteLength, 0);
  if (total > MAX_HTML_BYTES) throw new Error("Unzipped game is over 100 MB.");
  const index = raw
    .filter((f) => /(^|\/)index\.html?$/i.test(f.path))
    .sort((a, b) => a.path.split("/").length - b.path.split("/").length)[0];
  if (!index) throw new Error("The zip needs an index.html.");
  const root = index.path.includes("/") ? index.path.slice(0, index.path.lastIndexOf("/") + 1) : "";
  return raw
    .filter((f) => f.path.startsWith(root))
    .map((f) => ({ path: f.path.slice(root.length), bytes: f.bytes }))
    .filter((f) => f.path && !f.path.includes(".."));
}

function junkPath(path: string) {
  return path.startsWith("__MACOSX/") || path.split("/").includes(".DS_Store");
}
