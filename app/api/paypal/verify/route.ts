import { paypalAccountExists } from "@/lib/paypal";
import { isPaypalEmail } from "@/lib/paypal-email";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!isPaypalEmail(email)) {
    return Response.json({ error: "Enter a valid PayPal email." }, { status: 400 });
  }

  const exists = await paypalAccountExists(email);
  if (exists === false) {
    return Response.json({ error: "No PayPal account uses this email." }, { status: 404 });
  }
  if (exists === "error") {
    return Response.json({ error: "Could not verify this PayPal account." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
