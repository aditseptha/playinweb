export const POLAR_PRODUCT_ID = process.env.POLAR_PRODUCT_ID ?? "";
export const POLAR_TIP_PRODUCT_ID = process.env.POLAR_TIP_PRODUCT_ID ?? "";

export function polarConfigured() {
  return Boolean(process.env.POLAR_ACCESS_TOKEN);
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
