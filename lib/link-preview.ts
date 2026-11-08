/** Read title, description, and cover image from a public game page. */

export type ParsedLinkPreview = {
  title: string;
  description: string;
  imageUrl: string;
};

export type LinkPreviewImage = {
  mime: "image/jpeg" | "image/png" | "image/webp";
  base64: string;
};

export type LinkPreview = {
  title: string;
  description: string;
  image: LinkPreviewImage | null;
};

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;

export function safePreviewUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return null;
  if (/^\d+$/.test(host) || host.startsWith("0x")) return null;
  if (isIpLiteral(host) && !isPublicAddress(host)) return null;
  return url;
}

export function isPublicAddress(address: string): boolean {
  const ip = address.toLowerCase().split("%")[0];
  if (ip.includes(":")) return isPublicV6(ip);
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return false;
  if (a === 203 && b === 0) return false;
  if (a >= 224) return false;
  return true;
}

export function parseLinkPreview(html: string, pageUrl: string): ParsedLinkPreview {
  const title = meta(html, "og:title") || meta(html, "twitter:title") || titleText(html);
  const description =
    meta(html, "og:description") || meta(html, "twitter:description") || meta(html, "description");
  const image = meta(html, "og:image") || meta(html, "og:image:secure_url") || meta(html, "twitter:image") || meta(html, "twitter:image:src");
  return {
    title: clip(title, TITLE_MAX),
    description: clip(description, DESCRIPTION_MAX),
    imageUrl: absoluteUrl(image, pageUrl),
  };
}

export function taglineFrom(description: string) {
  const text = description.trim();
  if (!text) return "";
  const sentence = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return clip(sentence, 140);
}

export function imageKind(bytes: Uint8Array): LinkPreviewImage["mime"] | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function isIpLiteral(host: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
}

function isPublicV6(ip: string) {
  if (ip === "::" || ip === "::1") return false;
  if (ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) return false;
  if (ip.startsWith("2001:db8:")) return false;
  if (ip.startsWith("::ffff:")) return isPublicAddress(ip.slice("::ffff:".length));
  return true;
}

function meta(html: string, key: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const wanted = key.toLowerCase();
  for (const tag of tags) {
    const name = (attr(tag, "property") || attr(tag, "name")).toLowerCase();
    if (name !== wanted) continue;
    const content = attr(tag, "content");
    if (content) return decode(content);
  }
  return "";
}

function attr(tag: string, name: string) {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`, "i"));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function titleText(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decode(match[1].replace(/<[^>]+>/g, " ")) : "";
}

function absoluteUrl(value: string, pageUrl: string) {
  const raw = value.trim();
  if (!raw) return "";
  try {
    return new URL(raw, pageUrl).href;
  } catch {
    return "";
  }
}

function clip(value: string, max: number) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => fromCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num: string) => fromCode(Number(num)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function fromCode(code: number) {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  return String.fromCodePoint(code);
}
