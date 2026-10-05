import {
  clampCommission,
  clientIp,
  parseCheckoutInput,
  polarConfigured,
  polarProductId,
  polarRequest,
  withCheckoutPlaceholder,
  type PolarCheckout,
  type PolarCheckoutKind,
} from "@/lib/polar";
import { isPersistedId } from "@/lib/projects";
import { minShowcaseClaimAmount, showcaseRangeCutoffMs, type ShowcaseRange } from "@/lib/showcase-bids";
import { isFeaturePubliclyOpen } from "@/lib/site-feature";
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

  const input = parseCheckoutInput(await request.json().catch(() => null));
  if ("error" in input) {
    return Response.json({ error: input.error }, { status: 400 });
  }
  const { kind, projectId, range, amount, successUrl, returnUrl } = input;

  const productId = polarProductId(kind);
  if (!productId) {
    return Response.json({ error: polarProductError(kind) }, { status: 503 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, display_name")
    .eq("id", auth.user.id)
    .maybeSingle();

  const cents = Math.round(amount * 100);
  const success = withCheckoutPlaceholder(successUrl);
  const base = {
    products: [productId],
    prices: {
      [productId]: [{ amount_type: "fixed", price_amount: cents, price_currency: "usd" }],
    },
    success_url: success,
    return_url: returnUrl,
    customer_email: auth.user.email,
    customer_name: profile?.display_name ?? undefined,
    customer_ip_address: clientIp(request),
    external_customer_id: auth.user.id,
  };

  let metadata: Record<string, string>;
  if (kind === "tip") {
    metadata = {
      kind: "tip",
      user_id: auth.user.id,
      donor_email: auth.user.email ?? "",
      donor_handle: profile?.handle ?? "",
      amount: amount.toFixed(2),
    };
  } else if (kind === "showcase") {
    if (!isPersistedId(projectId)) {
      return Response.json({ error: "This listing cannot take showcase bids." }, { status: 400 });
    }
    const { data: project } = await supabase
      .from("projects")
      .select("id, title, slug, published, profiles!projects_owner_id_fkey ( handle, display_name )")
      .eq("id", projectId)
      .maybeSingle();
    if (!project?.published) {
      return Response.json({ error: "This listing is not on the showcase yet." }, { status: 400 });
    }
    const minBid = await minShowcaseBid(supabase, range);
    if (amount < minBid) {
      return Response.json({ error: `Bid at least $${minBid} to claim #1 in this view.` }, { status: 400 });
    }
    metadata = {
      kind: "showcase",
      project_id: project.id,
      user_id: auth.user.id,
      bidder_email: auth.user.email ?? "",
      bidder_handle: profile?.handle ?? "",
      game_title: project.title,
      game_slug: project.slug,
      range,
      amount: amount.toFixed(2),
    };
  } else {
    if (!(await isFeaturePubliclyOpen(supabase, "donations"))) {
      return Response.json({ error: "Donations are not available yet." }, { status: 403 });
    }
    if (!isPersistedId(projectId)) {
      return Response.json({ error: "This listing cannot take payments." }, { status: 400 });
    }
    const [{ data: project }, { data: setting }] = await Promise.all([
      supabase
        .from("projects")
        .select("id, title, slug, min_price, pricing_type, profiles!projects_owner_id_fkey ( handle, display_name )")
        .eq("id", projectId)
        .maybeSingle(),
      supabase.from("site_settings").select("value").eq("id", "donation_commission_pct").maybeSingle(),
    ]);
    if (!project || project.pricing_type === "no_payments") {
      return Response.json({ error: "This listing cannot take payments." }, { status: 400 });
    }
    const min = project.pricing_type === "paid" ? Number(project.min_price ?? 0) : 1;
    if (amount < min) {
      return Response.json({ error: `Minimum is $${min.toFixed(2)}.` }, { status: 400 });
    }
    const commission = clampCommission(Number(setting?.value ?? 10));
    const owner = Array.isArray(project.profiles) ? project.profiles[0] : project.profiles;
    metadata = {
      kind: "donation",
      project_id: project.id,
      user_id: auth.user.id,
      donor_email: auth.user.email ?? "",
      donor_handle: profile?.handle ?? "",
      creator_name: owner?.display_name ?? "",
      creator_handle: owner?.handle ?? "",
      game_title: project.title,
      game_slug: project.slug,
      commission_pct: String(commission),
      amount: amount.toFixed(2),
    };
  }

  try {
    const checkout = await polarRequest<PolarCheckout>("/checkouts/", {
      method: "POST",
      body: JSON.stringify({ ...base, metadata }),
    });
    if (!checkout.url) {
      return Response.json({ error: "Polar did not return a checkout URL." }, { status: 502 });
    }
    return Response.json({ url: checkout.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start Polar checkout.";
    return Response.json({ error: message }, { status: 502 });
  }
}

function polarProductError(kind: PolarCheckoutKind) {
  if (kind === "tip") return "Polar tip product is not configured.";
  if (kind === "showcase") return "Polar showcase product is not configured.";
  return "Polar donation product is not configured.";
}

async function minShowcaseBid(
  supabase: Awaited<ReturnType<typeof createClient>>,
  range: ShowcaseRange,
) {
  const cutoff = showcaseRangeCutoffMs(range);
  let query = supabase.from("showcase_bids").select("amount, created_at").order("amount", { ascending: false }).limit(200);
  if (cutoff > 0) {
    query = query.gte("created_at", new Date(cutoff).toISOString());
  }
  const { data } = await query;
  const top = (data ?? []).reduce((max, row) => Math.max(max, Number(row.amount) || 0), 0);
  return minShowcaseClaimAmount(top);
}
