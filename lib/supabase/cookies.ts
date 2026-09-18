import { authCookieDomain, getRootDomain } from "@/lib/host";

export function authCookieOptions() {
  const host = getRootDomain().split(":")[0] ?? "localhost";
  const local = host === "localhost" || host === "127.0.0.1";
  return {
    ...(local ? {} : { domain: authCookieDomain() }),
    path: "/",
    sameSite: "lax" as const,
    secure: !local,
  };
}
