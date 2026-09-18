type PaypalExists = true | false | "error" | "skip";

function paypalAdaptiveHost() {
  return process.env.PAYPAL_ENV === "live" ? "https://svcs.paypal.com" : "https://svcs.sandbox.paypal.com";
}

function paypalAdaptiveConfigured() {
  return Boolean(
    process.env.PAYPAL_USER_ID &&
      process.env.PAYPAL_PASSWORD &&
      process.env.PAYPAL_SIGNATURE &&
      process.env.PAYPAL_APP_ID,
  );
}

export async function paypalAccountExists(email: string): Promise<PaypalExists> {
  if (!paypalAdaptiveConfigured()) return "skip";
  try {
    const res = await fetch(`${paypalAdaptiveHost()}/AdaptiveAccounts/GetVerifiedStatus`, {
      method: "POST",
      headers: {
        "X-PAYPAL-SECURITY-USERID": process.env.PAYPAL_USER_ID ?? "",
        "X-PAYPAL-SECURITY-PASSWORD": process.env.PAYPAL_PASSWORD ?? "",
        "X-PAYPAL-SECURITY-SIGNATURE": process.env.PAYPAL_SIGNATURE ?? "",
        "X-PAYPAL-APPLICATION-ID": process.env.PAYPAL_APP_ID ?? "",
        "X-PAYPAL-REQUEST-DATA-FORMAT": "NV",
        "X-PAYPAL-RESPONSE-DATA-FORMAT": "JSON",
      },
      body: `emailAddress=${encodeURIComponent(email)}&matchCriteria=NONE`,
    });
    const body = (await res.json()) as {
      accountStatus?: string;
      error?: { message?: string; errorId?: string }[];
    };
    if (body.accountStatus) return true;
    const message = body.error?.map((item) => item.message ?? "").join(" ").toLowerCase() ?? "";
    if (message.includes("does not exist") || message.includes("account is invalid")) return false;
    return "error";
  } catch {
    return "error";
  }
}
