"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isAdminEmail } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

export type SiteFeature = {
  id: string;
  label: string;
  href: string;
  description: string;
  hidden: boolean;
  soon: boolean;
};

export const FEATURE_CATALOG: SiteFeature[] = [
  {
    id: "showcase",
    label: "Game showcase",
    href: "/showcase",
    description: "Paid ranking page in the public menu.",
    hidden: false,
    soon: true,
  },
  {
    id: "top",
    label: "Top Played",
    href: "/top",
    description: "Play ranking in the public menu.",
    hidden: false,
    soon: false,
  },
  {
    id: "downloads",
    label: "Downloads",
    href: "/downloads",
    description: "Downloadable files in the public menu.",
    hidden: false,
    soon: false,
  },
];

type FeaturesValue = {
  features: SiteFeature[];
  loading: boolean;
  setFlags: (id: string, flags: { hidden?: boolean; soon?: boolean }) => Promise<void>;
};

const FeaturesContext = createContext<FeaturesValue | null>(null);

function mergeRows(rows: Partial<SiteFeature>[] | null) {
  return FEATURE_CATALOG.map((item) => {
    const row = rows?.find((r) => r.id === item.id);
    return {
      ...item,
      hidden: Boolean(row?.hidden),
      soon: Boolean(row?.soon),
      label: row?.label || item.label,
      href: row?.href || item.href,
      description: row?.description || item.description,
    };
  });
}

export function FeaturesProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState(FEATURE_CATALOG);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("site_features").select("id, label, href, description, hidden, soon");
    setFeatures(mergeRows((data ?? []) as SiteFeature[]));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setFlags = useCallback(async (id: string, flags: { hidden?: boolean; soon?: boolean }) => {
    const current = features.find((item) => item.id === id);
    if (!current) return;
    const hidden = flags.hidden ?? current.hidden;
    const soon = flags.soon ?? current.soon;
    setFeatures((list) => list.map((item) => (item.id === id ? { ...item, hidden, soon } : item)));
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_set_feature", { fid: id, hide: hidden, is_soon: soon });
    if (error) await refresh();
  }, [features, refresh]);

  const value = useMemo(() => ({ features, loading, setFlags }), [features, loading, setFlags]);
  return <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>;
}

export function useFeatures() {
  const ctx = useContext(FeaturesContext);
  if (!ctx) throw new Error("useFeatures must be used inside FeaturesProvider");
  return ctx;
}

export function useFeature(id: string) {
  const { features, loading } = useFeatures();
  return { feature: features.find((item) => item.id === id) ?? null, loading };
}

export function publicNavFlags(feature: SiteFeature | undefined, admin: boolean) {
  if (!feature) return { show: true, soon: false, hidden: false };
  if (admin) return { show: true, soon: feature.soon, hidden: feature.hidden };
  if (feature.hidden) return { show: false, soon: false, hidden: true };
  return { show: true, soon: feature.soon, hidden: false };
}

export function canOpenFeature(feature: SiteFeature | undefined, email: string | null | undefined) {
  if (!feature) return true;
  if (isAdminEmail(email)) return true;
  return !feature.hidden && !feature.soon;
}

export function useIsAdmin() {
  const { user } = useAuth();
  return isAdminEmail(user?.email);
}
