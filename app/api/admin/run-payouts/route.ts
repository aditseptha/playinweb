import { paypalPayoutConfigured } from "@/lib/paypal-payout";
import { runPayouts } from "@/lib/run-payouts";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || !isAdmin) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }

  if (!paypalPayoutConfigured()) {
    return Response.json(
      {
        error:
          "PayPal payouts are not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env.local (sandbox credentials from developer.paypal.com).",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as { force?: unknown; userId?: unknown } | null;
  const force = body?.force === true;
  const userId = typeof body?.userId === "string" ? body.userId : undefined;

  try {
    const outcome = await runPayouts({ supabase, force, userId });
    if (!outcome.ok) {
      return Response.json({ error: outcome.error, results: outcome.results }, { status: 409 });
    }
    return Response.json({ ok: true, message: outcome.message, results: outcome.results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not run payouts.";
    return Response.json({ error: message }, { status: 500 });
  }
}
