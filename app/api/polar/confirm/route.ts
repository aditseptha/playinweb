import { polarConfigured, waitForPolarCheckout } from "@/lib/polar";
import { recordPolarCheckout } from "@/lib/polar-record";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!polarConfigured()) {
    return Response.json({ error: "Polar is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { checkoutId?: unknown; projectId?: unknown } | null;
  const checkoutId = typeof body?.checkoutId === "string" ? body.checkoutId : "";
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  if (!checkoutId) {
    return Response.json({ error: "Missing checkout." }, { status: 400 });
  }

  try {
    const checkout = await waitForPolarCheckout(checkoutId);
    const metaProjectId =
      checkout.metadata?.project_id && typeof checkout.metadata.project_id === "string"
        ? checkout.metadata.project_id
        : projectId;
    const result = await recordPolarCheckout(supabase, checkout, metaProjectId, auth.user.id, auth.user.email);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json({ ok: true, amount: result.amount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not confirm this Polar payment.";
    const status = message.includes("not complete yet") ? 409 : 502;
    return Response.json({ error: message }, { status });
  }
}
