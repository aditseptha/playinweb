import { cookies } from "next/headers";
import { paypalAccountExists } from "@/lib/paypal";
import { decodePaypalChallenge, PAYPAL_PENDING_COOKIE, paypalChallengeCookie } from "@/lib/paypal-challenge";
import { isPaypalEmail } from "@/lib/paypal-email";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user?.email) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { otp?: unknown; paypal?: unknown } | null;
  const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
  const jar = await cookies();
  const challenge = decodePaypalChallenge(jar.get(PAYPAL_PENDING_COOKIE)?.value);

  if (otp) {
    if (!/^\d{6,8}$/.test(otp)) {
      return Response.json({ error: "Enter the code from your email." }, { status: 400 });
    }
    const { error: otpError } = await supabase.auth.verifyOtp({
      email: auth.user.email,
      token: otp,
      type: "email",
    });
    if (otpError) {
      const retry = await supabase.auth.verifyOtp({
        email: auth.user.email,
        token: otp,
        type: "magiclink",
      });
      if (retry.error) {
        return Response.json({ error: "That code is wrong or expired." }, { status: 403 });
      }
    }
  } else if (!(await recentEmailProof(supabase))) {
    return Response.json({ error: "Open the email we sent, then try again." }, { status: 403 });
  }

  const paypal =
    challenge?.action === "disconnect"
      ? null
      : challenge?.paypal || (typeof body?.paypal === "string" ? body.paypal.trim() : "");
  if (paypal !== null && !isPaypalEmail(paypal || "")) {
    return Response.json({ error: "Enter a valid PayPal email." }, { status: 400 });
  }

  if (paypal) {
    const exists = await paypalAccountExists(paypal);
    if (exists === false) {
      return Response.json({ error: "No PayPal account uses this email." }, { status: 404 });
    }
    if (exists === "error") {
      return Response.json({ error: "Could not verify this PayPal account." }, { status: 502 });
    }
  }

  const { error: saveError } = await supabase
    .from("profiles")
    .update({ wallet_address: paypal })
    .eq("id", auth.user.id);
  if (saveError) {
    return Response.json({ error: "Could not save this PayPal account." }, { status: 500 });
  }
  jar.set(PAYPAL_PENDING_COOKIE, "", { ...paypalChallengeCookie, maxAge: 0 });
  return Response.json({ ok: true });
}

async function recentEmailProof(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.getClaims();
  const amr = data?.claims?.amr;
  if (!Array.isArray(amr)) return false;
  const now = Math.floor(Date.now() / 1000);
  return amr.some((entry) => {
    const method = typeof entry === "string" ? entry : entry && typeof entry === "object" && "method" in entry ? String(entry.method) : "";
    const ts =
      entry && typeof entry === "object" && "timestamp" in entry ? Number(entry.timestamp) : now;
    return ["otp", "magiclink", "email"].includes(method) && Number.isFinite(ts) && now - ts < 15 * 60;
  });
}
