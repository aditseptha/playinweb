export const RESERVED_HANDLES = new Set([
  "www",
  "api",
  "app",
  "admin",
  "static",
  "assets",
  "auth",
  "login",
  "signup",
  "register",
  "library",
  "manage",
  "profile",
  "channel",
  "game",
  "games",
  "top",
  "site",
  "u",
  "account",
  "accounts",
  "support",
  "help",
  "cdn",
  "collection",
  "html",
  "play",
  "showcase",
  "downloads",
  "report",
  "privacy",
  "terms",
  "tip",
  "donations",
]);

const HANDLE_RE = /^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])$/;
const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$/;

export function getRootDomain() {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:4000";
}

export function authCookieDomain() {
  const host = getRootDomain().split(":")[0] ?? "localhost";
  if (host === "localhost" || host === "127.0.0.1") return ".localhost";
  return `.${host}`;
}

export function safeReturnTo(raw: string | null | undefined) {
  if (!raw) return "/";
  try {
    const url = new URL(raw, apexOrigin());
    const root = getRootDomain().split(":")[0] ?? "localhost";
    if (url.hostname === root || url.hostname.endsWith(`.${root}`)) {
      return `${url.origin}${url.pathname}${url.search}`;
    }
  } catch {
    /* ignore */
  }
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

export function getSiteProtocol() {
  const root = getRootDomain();
  return process.env.NEXT_PUBLIC_SITE_PROTOCOL ?? (root.includes("localhost") ? "http" : "https");
}

export function isHandle(value: string) {
  return HANDLE_RE.test(value) && !RESERVED_HANDLES.has(value);
}

export function isSlug(value: string) {
  return SLUG_RE.test(value);
}

export function parseSubdomain(hostHeader: string): string | null {
  const host = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  const rootHost = getRootDomain().split(":")[0]?.toLowerCase() ?? "localhost";
  if (!host || host === rootHost || host === "127.0.0.1") return null;
  const suffix = `.${rootHost}`;
  if (!host.endsWith(suffix)) return null;
  const sub = host.slice(0, -suffix.length);
  if (!sub || sub.includes(".") || !isHandle(sub)) return null;
  return sub;
}

export function apexOrigin() {
  return `${getSiteProtocol()}://${getRootDomain()}`;
}

export function apexHref(path = "/") {
  const next = path.startsWith("/") ? path : `/${path}`;
  return `${apexOrigin()}${next}`;
}

export function sitePath(handle: string, slug?: string) {
  return slug ? `/${handle}/${slug}` : `/${handle}`;
}

export function siteOrigin(handle: string) {
  return `${apexOrigin()}${sitePath(handle)}`;
}

export function projectPublicUrl(handle: string, slug: string) {
  return `${apexOrigin()}${sitePath(handle, slug)}`;
}

export function projectGameUrl(handle: string, slug: string) {
  return `${projectPublicUrl(handle, slug)}/index.html`;
}

export function projectEmbedUrl(handle: string, slug: string) {
  return `${apexOrigin()}/html/${handle}/${slug}/index.html`;
}

export function isProjectAssetPath(pathname: string) {
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/html/") ||
    pathname.startsWith("/site/")
  ) {
    return false;
  }
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return false;
  const last = parts[parts.length - 1] ?? "";
  return last.includes(".");
}

export const APEX_PATHS = [
  "/login",
  "/signup",
  "/register",
  "/profile",
  "/library",
  "/manage",
  "/top",
  "/showcase",
  "/downloads",
  "/report",
  "/privacy",
  "/terms",
  "/tip",
  "/donations",
  "/api",
  "/channel",
  "/collection",
  "/play",
  "/html",
  "/admin",
];
