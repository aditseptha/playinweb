export const POLAR_PRODUCT_ID = process.env.POLAR_PRODUCT_ID ?? "";
export const POLAR_TIP_PRODUCT_ID = process.env.POLAR_TIP_PRODUCT_ID ?? "";
export const POLAR_SHOWCASE_PRODUCT_ID = process.env.POLAR_SHOWCASE_PRODUCT_ID ?? "";

export type PolarCheckoutKind = "donation" | "tip" | "showcase";

export function polarProductId(kind: PolarCheckoutKind) {
  if (kind === "tip") return POLAR_TIP_PRODUCT_ID;
  if (kind === "showcase") return POLAR_SHOWCASE_PRODUCT_ID;
  return POLAR_PRODUCT_ID;
}
export const CHECKOUT_MAX_AMOUNT = 100;

export type CheckoutInput = {
  kind: PolarCheckoutKind;
  projectId: string;
  range: "today" | "week" | "all";
  amount: number;
  successUrl: string;
  returnUrl: string;
};

/** Validates the untrusted checkout request body. Kept import-free so `node --test` can load it. */
export function parseCheckoutInput(raw: unknown): CheckoutInput | { error: string } {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const kind: PolarCheckoutKind = body.kind === "tip" || body.kind === "showcase" ? body.kind : "donation";
  const range = body.range === "today" || body.range === "week" ? body.range : "all";
  const amount = Number(body.amount);
  const successUrl = typeof body.successUrl === "string" ? body.successUrl : "";
  const returnUrl = typeof body.returnUrl === "string" ? body.returnUrl : successUrl;
  if (!Number.isFinite(amount) || amount < 1) return { error: "Minimum is $1.00." };
  if (amount > CHECKOUT_MAX_AMOUNT) return { error: `Maximum is $${CHECKOUT_MAX_AMOUNT.toFixed(2)}.` };
  if (!isHttpUrl(successUrl) || !isHttpUrl(returnUrl)) return { error: "Invalid return URL." };
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  return { kind, projectId, range, amount, successUrl, returnUrl };
}

function isHttpUrl(raw: string) {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Swaps any stale checkout params for Polar's {CHECKOUT_ID} placeholder. */
export function withCheckoutPlaceholder(raw: string) {
  const url = new URL(raw);
  url.searchParams.delete("polar_checkout");
  url.searchParams.delete("checkout_id");
  const joiner = url.search ? "&" : "?";
  return `${url.origin}${url.pathname}${url.search}${joiner}checkout_id={CHECKOUT_ID}${url.hash}`;
}

export function clampCommission(value: number) {
  if (!Number.isFinite(value)) return 10;
  return Math.min(100, Math.max(0, value));
}

export const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET ?? "";

export function polarConfigured() {
  return Boolean(process.env.POLAR_ACCESS_TOKEN);
}

export function polarWebhookConfigured() {
  return Boolean(POLAR_WEBHOOK_SECRET);
}

function polarBaseUrl() {
  return process.env.POLAR_SERVER === "sandbox" ? "https://sandbox-api.polar.sh/v1" : "https://api.polar.sh/v1";
}

export type PolarCheckout = {
  id: string;
  status: string;
  url: string | null;
  amount: number | null;
  metadata: Record<string, string> | null;
};

export async function polarRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = process.env.POLAR_ACCESS_TOKEN;
  if (!token) throw new Error("Polar is not configured.");
  const res = await fetch(`${polarBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => null)) as T | PolarErrorBody | null;
  if (!res.ok) throw new Error(polarErrorMessage(data, `Polar request failed (${res.status}).`));
  return data as T;
}

export function polarCheckoutPaid(checkout: PolarCheckout) {
  return checkout.status === "succeeded";
}

export function polarCheckoutFailed(checkout: PolarCheckout) {
  return checkout.status === "failed" || checkout.status === "expired";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Polar may still be processing when the browser returns from checkout. */
export async function waitForPolarCheckout(checkoutId: string, attempts = 10, delayMs = 1500) {
  let last: PolarCheckout | null = null;
  for (let i = 0; i < attempts; i++) {
    last = await polarRequest<PolarCheckout>(`/checkouts/${checkoutId}`);
    if (polarCheckoutPaid(last)) return last;
    if (polarCheckoutFailed(last)) {
      throw new Error("Payment did not complete on Polar.");
    }
    if (i < attempts - 1) await sleep(delayMs);
  }
  throw new Error("Payment is not complete yet. Check Polar in a minute, then refresh this page.");
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || undefined;
}

function polarErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const body = data as PolarErrorBody;
  if (typeof body.error === "string") return body.error;
  if (typeof body.detail === "string") return body.detail;
  if (Array.isArray(body.detail)) {
    const first = body.detail[0];
    if (first && typeof first === "object" && "msg" in first && typeof first.msg === "string") return first.msg;
  }
  return fallback;
}

type PolarErrorBody = {
  error?: string;
  detail?: string | { msg?: string }[];
};
