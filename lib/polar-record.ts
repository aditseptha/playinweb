import type { PolarCheckout } from "@/lib/polar";
import { polarCheckoutPaid } from "@/lib/polar";
import type { createClient } from "@/lib/supabase/server";
import { isPersistedId } from "@/lib/projects";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function recordPolarCheckout(
  supabase: Supabase,
  checkout: PolarCheckout,
  projectId: string,
  userId: string,
  userEmail: string | null | undefined,
) {
  if (!polarCheckoutPaid(checkout)) {
    return { ok: false as const, status: 409, error: "Payment is not complete yet." };
  }

  const meta = checkout.metadata ?? {};
  if (meta.user_id && meta.user_id !== userId) {
    return { ok: false as const, status: 403, error: "This payment belongs to another account." };
  }

  const amount = Number(meta.amount ?? (checkout.amount != null ? checkout.amount / 100 : NaN));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, status: 400, error: "Could not read the paid amount." };
  }

  const kind = meta.kind === "tip" ? "tip" : meta.kind === "showcase" ? "showcase" : "donation";

  if (kind === "tip") {
    const { data: existing } = await supabase.from("tips").select("id").eq("id", checkout.id).maybeSingle();
    if (existing) return { ok: true as const, amount };
    const { error } = await supabase.from("tips").insert({
      id: checkout.id,
      user_id: userId,
      amount,
      donor_email: meta.donor_email || userEmail,
      donor_handle: meta.donor_handle || null,
    });
    if (error) {
      if (error.code === "23505") return { ok: true as const, amount };
      return { ok: false as const, status: 500, error: "Could not save this tip." };
    }
    return { ok: true as const, amount };
  }

  if (kind === "showcase") {
    const targetProjectId = meta.project_id || projectId;
    if (!isPersistedId(targetProjectId)) {
      return { ok: false as const, status: 400, error: "Missing checkout." };
    }
    const { data: existing } = await supabase.from("showcase_bids").select("id").eq("id", checkout.id).maybeSingle();
    if (existing) return { ok: true as const, amount };
    const { error } = await supabase.from("showcase_bids").insert({
      id: checkout.id,
      user_id: userId,
      project_id: targetProjectId,
      amount,
      bidder_email: meta.bidder_email || meta.donor_email || userEmail,
      bidder_handle: meta.bidder_handle || meta.donor_handle || null,
      game_title: meta.game_title || null,
      game_slug: meta.game_slug || null,
    });
    if (error) {
      if (error.code === "23505") return { ok: true as const, amount };
      return { ok: false as const, status: 500, error: "Could not save this showcase bid." };
    }
    return { ok: true as const, amount };
  }

  if (!isPersistedId(projectId)) {
    return { ok: false as const, status: 400, error: "Missing checkout." };
  }
  if (meta.project_id && meta.project_id !== projectId) {
    return { ok: false as const, status: 400, error: "This payment is for a different game." };
  }

  const { data: existing } = await supabase.from("donations").select("id").eq("id", checkout.id).maybeSingle();
  if (existing) return { ok: true as const, amount };

  const { error } = await supabase.from("donations").insert({
    id: checkout.id,
    user_id: userId,
    project_id: projectId,
    amount,
    donor_email: meta.donor_email || userEmail,
    donor_handle: meta.donor_handle || null,
    creator_name: meta.creator_name || null,
    creator_handle: meta.creator_handle || null,
    game_title: meta.game_title || null,
    game_slug: meta.game_slug || null,
    commission_pct: clampCommission(Number(meta.commission_pct ?? 10)),
  });
  if (error) {
    if (error.code === "23505") return { ok: true as const, amount };
    return { ok: false as const, status: 500, error: "Could not save this donation." };
  }
  return { ok: true as const, amount };
}

function clampCommission(value: number) {
  if (!Number.isFinite(value)) return 10;
  return Math.min(100, Math.max(0, value));
}
