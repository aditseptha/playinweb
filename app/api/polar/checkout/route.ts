import {
  CHECKOUT_MAX_AMOUNT,
  clientIp,
  polarConfigured,
  polarProductId,
  polarRequest,
  type PolarCheckout,
  type PolarCheckoutKind,
} from "@/lib/polar";
import { isPersistedId } from "@/lib/projects";
import { minShowcaseClaimAmount, showcaseRangeCutoffMs, type ShowcaseRange } from "@/lib/showcase-bids";
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

  const body = (await request.json().catch(() => null)) as {
    kind?: unknown;
    projectId?: unknown;
    amount?: unknown;
    range?: unknown;
    successUrl?: unknown;
    returnUrl?: unknown;
  } | null;

  const kind = parseKind(body?.kind);
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const range = parseRange(body?.range);
  const amount = Number(body?.amount);
  const successUrl = typeof body?.successUrl === "string" ? body.successUrl : "";
  const returnUrl = typeof body?.returnUrl === "string" ? body.returnUrl : successUrl;
  if (!Number.isFinite(amount) || amount < 1) {
    return Response.json({ error: "Minimum is $1.00." }, { status: 400 });
  }
  if (amount > CHECKOUT_MAX_AMOUNT) {
    return Response.json({ error: `Maximum is $${CHECKOUT_MAX_AMOUNT.toFixed(2)}.` }, { status: 400 });
  }
  if (!safeAppUrl(successUrl) || !safeAppUrl(returnUrl)) {
    return Response.json({ error: "Invalid return URL." }, { status: 400 });
  }

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

function parseKind(value: unknown): PolarCheckoutKind {
  if (value === "tip") return "tip";
  if (value === "showcase") return "showcase";
  return "donation";
}

function parseRange(value: unknown): ShowcaseRange {
  if (value === "today" || value === "week") return value;
  return "all";
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

function clampCommission(value: number) {
  if (!Number.isFinite(value)) return 10;
  return Math.min(100, Math.max(0, value));
}

function safeAppUrl(raw: string) {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function withCheckoutPlaceholder(raw: string) {
  const url = new URL(raw);
  url.searchParams.delete("polar_checkout");
  url.searchParams.delete("checkout_id");
  const joiner = url.search ? "&" : "?";
  return `${url.origin}${url.pathname}${url.search}${joiner}checkout_id={CHECKOUT_ID}${url.hash}`;
}
