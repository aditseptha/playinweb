import { cookies } from "next/headers";
import { encodePaypalChallenge, PAYPAL_PENDING_COOKIE, paypalChallengeCookie } from "@/lib/paypal-challenge";
import { isPaypalEmail } from "@/lib/paypal-email";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user?.email) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    paypal?: unknown;
  } | null;
  const action = body?.action === "disconnect" ? "disconnect" : "connect";
  const paypal = action === "disconnect" ? null : typeof body?.paypal === "string" ? body.paypal.trim() : "";
  if (action === "connect" && !isPaypalEmail(paypal || "")) {
    return Response.json({ error: "Enter a valid PayPal email." }, { status: 400 });
  }

  const { error } = await supabase.auth.reauthenticate();
  const jar = await cookies();
  jar.set(
    PAYPAL_PENDING_COOKIE,
    encodePaypalChallenge({ action, paypal: action === "connect" ? paypal : null }),
    paypalChallengeCookie,
  );
  if (error) {
    const rateLimited = /rate limit/i.test(error.message || "");
    return Response.json(
      {
        error: rateLimited
          ? "Too many confirmation emails. Wait about a minute, then continue — or enter the last code we sent."
          : error.message || "Could not send a confirmation email.",
        rateLimited,
      },
      { status: rateLimited ? 429 : 502 },
    );
  }

  return Response.json({ ok: true });
}
