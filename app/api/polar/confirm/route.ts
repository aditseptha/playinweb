import { polarCheckoutPaid, polarConfigured, polarRequest, type PolarCheckout } from "@/lib/polar";
import { isPersistedId } from "@/lib/projects";
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

  let checkout: PolarCheckout;
  try {
    checkout = await polarRequest<PolarCheckout>(`/checkouts/${checkoutId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load this Polar checkout.";
    return Response.json({ error: message }, { status: 502 });
  }
  if (!polarCheckoutPaid(checkout)) {
    return Response.json({ error: "Payment is not complete yet." }, { status: 409 });
  }

  const meta = checkout.metadata ?? {};
  if (meta.user_id && meta.user_id !== auth.user.id) {
    return Response.json({ error: "This payment belongs to another account." }, { status: 403 });
  }

  const amount = Number(meta.amount ?? (checkout.amount != null ? checkout.amount / 100 : NaN));
  if (!Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: "Could not read the paid amount." }, { status: 400 });
  }

  const kind = meta.kind === "tip" ? "tip" : "donation";
  if (kind === "tip") {
    const { data: existing } = await supabase.from("tips").select("id").eq("id", checkout.id).maybeSingle();
    if (existing) return Response.json({ ok: true, amount });
    const { error } = await supabase.from("tips").insert({
      id: checkout.id,
      user_id: auth.user.id,
      amount,
      donor_email: meta.donor_email || auth.user.email,
      donor_handle: meta.donor_handle || null,
    });
    if (error) {
      if (error.code === "23505") return Response.json({ ok: true, amount });
      return Response.json({ error: "Could not save this tip." }, { status: 500 });
    }
    return Response.json({ ok: true, amount });
  }

  if (!isPersistedId(projectId)) {
    return Response.json({ error: "Missing checkout." }, { status: 400 });
  }
  if (meta.project_id && meta.project_id !== projectId) {
    return Response.json({ error: "This payment is for a different game." }, { status: 400 });
  }

  const { data: existing } = await supabase.from("donations").select("id").eq("id", checkout.id).maybeSingle();
  if (existing) return Response.json({ ok: true, amount });

  const { error } = await supabase.from("donations").insert({
    id: checkout.id,
    user_id: auth.user.id,
    project_id: projectId,
    amount,
    donor_email: meta.donor_email || auth.user.email,
    donor_handle: meta.donor_handle || null,
    creator_name: meta.creator_name || null,
    creator_handle: meta.creator_handle || null,
    game_title: meta.game_title || null,
    game_slug: meta.game_slug || null,
    commission_pct: clampCommission(Number(meta.commission_pct ?? 10)),
  });
  if (error) {
    if (error.code === "23505") return Response.json({ ok: true, amount });
    return Response.json({ error: "Could not save this donation." }, { status: 500 });
  }
  return Response.json({ ok: true, amount });
}

function clampCommission(value: number) {
  if (!Number.isFinite(value)) return 10;
  return Math.min(100, Math.max(0, value));
}
