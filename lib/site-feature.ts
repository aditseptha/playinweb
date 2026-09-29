import { isAdminEmail } from "@/lib/admin";
import { FEATURE_CATALOG } from "@/lib/features";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export function featureCatalogDefaults(id: string) {
  return FEATURE_CATALOG.find((item) => item.id === id);
}

export function canOpenFeatureFlags(
  flags: { hidden: boolean; soon: boolean } | null | undefined,
  email: string | null | undefined,
  id?: string,
) {
  const feature = flags ?? (id ? featureCatalogDefaults(id) : undefined);
  if (!feature) return true;
  if (isAdminEmail(email)) return true;
  return !feature.hidden && !feature.soon;
}

export function isFeaturePubliclyEnabledFlags(
  flags: { hidden: boolean; soon: boolean } | null | undefined,
  id?: string,
) {
  const feature = flags ?? (id ? featureCatalogDefaults(id) : undefined);
  if (!feature) return false;
  return !feature.hidden && !feature.soon;
}

export async function isFeatureOpen(supabase: Supabase, id: string, email?: string | null) {
  const { data } = await supabase.from("site_features").select("hidden, soon").eq("id", id).maybeSingle();
  return canOpenFeatureFlags(data, email, id);
}

export async function isFeaturePubliclyOpen(supabase: Supabase, id: string) {
  const { data } = await supabase.from("site_features").select("hidden, soon").eq("id", id).maybeSingle();
  return isFeaturePubliclyEnabledFlags(data, id);
}
