import { createHmac } from "node:crypto";
import { isPaypalEmail } from "@/lib/paypal-email";

export const PAYPAL_PENDING_COOKIE = "paypal_pending";
const MAX_AGE_SEC = 15 * 60;

type Challenge = {
  action: "connect" | "disconnect";
  paypal: string | null;
  exp: number;
};

function secret() {
  return process.env.POLAR_ACCESS_TOKEN || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "playinweb";
}

export function encodePaypalChallenge(input: { action: "connect" | "disconnect"; paypal: string | null }) {
  const payload: Challenge = {
    action: input.action,
    paypal: input.paypal,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function decodePaypalChallenge(raw: string | undefined): Challenge | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  if (sig.length !== expected.length) return null;
  let ok = 0;
  for (let i = 0; i < expected.length; i++) ok |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (ok !== 0) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Challenge;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.action !== "connect" && payload.action !== "disconnect") return null;
    if (payload.action === "connect" && (!payload.paypal || !isPaypalEmail(payload.paypal))) return null;
    if (payload.action === "disconnect" && payload.paypal !== null) return null;
    return payload;
  } catch {
    return null;
  }
}

export const paypalChallengeCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SEC,
  secure: process.env.NODE_ENV === "production",
};
