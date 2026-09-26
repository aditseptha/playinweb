type PaypalTokenResponse = { access_token?: string };

type PaypalPayoutResponse = {
  batch_header?: { payout_batch_id?: string; batch_status?: string };
  name?: string;
  message?: string;
  details?: { issue?: string; description?: string }[];
};

function paypalRestBase() {
  return process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export function paypalPayoutConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

async function paypalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("PayPal payouts are not configured.");

  const res = await fetch(`${paypalRestBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const body = (await res.json().catch(() => null)) as PaypalTokenResponse | null;
  if (!res.ok || !body?.access_token) {
    throw new Error("Could not authenticate with PayPal.");
  }
  return body.access_token;
}

export type PaypalPayoutResult = {
  batchId: string;
  batchStatus: string;
};

export async function sendPaypalPayout(input: {
  email: string;
  amount: number;
  note: string;
  itemId: string;
}): Promise<PaypalPayoutResult> {
  const amount = Math.round(input.amount * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Payout amount must be greater than zero.");
  }

  const token = await paypalAccessToken();
  const res = await fetch(`${paypalRestBase()}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: `playinweb_${input.itemId}`,
        email_subject: "You received a payout from PlayInWeb",
      },
      items: [
        {
          recipient_type: "EMAIL",
          amount: { value: amount.toFixed(2), currency: "USD" },
          receiver: input.email,
          note: input.note,
          sender_item_id: input.itemId,
        },
      ],
    }),
  });

  const body = (await res.json().catch(() => null)) as PaypalPayoutResponse | null;
  if (!res.ok) {
    const detail = body?.details?.map((row) => row.description || row.issue).filter(Boolean).join(" ");
    throw new Error(detail || body?.message || `PayPal payout failed (${res.status}).`);
  }

  const batchId = body?.batch_header?.payout_batch_id;
  if (!batchId) throw new Error("PayPal did not return a payout batch id.");
  return {
    batchId,
    batchStatus: body.batch_header?.batch_status ?? "PENDING",
  };
}
