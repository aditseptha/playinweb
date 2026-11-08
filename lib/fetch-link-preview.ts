import { lookup } from "node:dns/promises";
import { imageKind, isPublicAddress, parseLinkPreview, safePreviewUrl, type LinkPreview } from "@/lib/link-preview";

const HTML_LIMIT = 768 * 1024;
const IMAGE_LIMIT = 2 * 1024 * 1024;
const HOPS = 4;

const EMPTY: LinkPreview = { title: "", description: "", image: null };

/** Fetch public page metadata. Returns null when the URL itself is not a public http(s) link. */
export async function fetchLinkPreview(raw: string): Promise<LinkPreview | null> {
  const page = await readPublic(raw, "text/html,application/xhtml+xml", HTML_LIMIT, true);
  if (page === "blocked") return null;
  if (!page) return EMPTY;

  const html = new TextDecoder("utf-8", { fatal: false }).decode(page.body);
  const parsed = parseLinkPreview(html, page.finalUrl);
  const image = parsed.imageUrl ? await readImage(parsed.imageUrl) : null;
  return { title: parsed.title, description: parsed.description, image };
}

async function readImage(raw: string): Promise<LinkPreview["image"]> {
  const file = await readPublic(raw, "image/avif,image/webp,image/png,image/jpeg", IMAGE_LIMIT, false);
  if (!file || file === "blocked") return null;
  const mime = imageKind(file.body);
  if (!mime) return null;
  return { mime, base64: Buffer.from(file.body).toString("base64") };
}

async function readPublic(
  raw: string,
  accept: string,
  limit: number,
  keepPartial: boolean,
): Promise<{ finalUrl: string; body: Uint8Array } | "blocked" | null> {
  let current = safePreviewUrl(raw)?.href ?? "";
  if (!current) return "blocked";

  for (let hop = 0; hop < HOPS; hop += 1) {
    const url = safePreviewUrl(current);
    if (!url || !(await hostIsPublic(url.hostname))) return "blocked";
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
        headers: {
          accept,
          "user-agent": "Mozilla/5.0 (compatible; PlayInWebLinkPreview/1.0)",
        },
      });
    } catch {
      return null;
    }

    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get("location");
      if (!next) return null;
      try {
        current = new URL(next, url).href;
      } catch {
        return null;
      }
      continue;
    }

    if (!response.ok) return null;
    const body = await readBody(response, limit, keepPartial);
    if (!body) return null;
    return { finalUrl: url.href, body };
  }
  return null;
}

async function hostIsPublic(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (isIpLiteral(host)) return isPublicAddress(host);
  try {
    const records = await lookup(host, { all: true, verbatim: true });
    return records.length > 0 && records.every((record) => isPublicAddress(record.address));
  } catch {
    return false;
  }
}

function isIpLiteral(host: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
}

async function readBody(response: Response, limit: number, keepPartial: boolean) {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    if (total + value.byteLength > limit) {
      if (!keepPartial) {
        await reader.cancel();
        return null;
      }
      const room = limit - total;
      if (room > 0) chunks.push(value.slice(0, room));
      total = limit;
      await reader.cancel();
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
