"use client";

import type { ReactNode } from "react";
import { LinkButton } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { canOpenFeature, useFeature } from "@/lib/features";
import { apexHref } from "@/lib/host";

export function FeatureGate({ id, children }: { id: string; children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { feature, loading } = useFeature(id);

  if (authLoading || loading) return <p className="text-ui text-text-muted">Loading…</p>;
  if (canOpenFeature(feature ?? undefined, user?.email)) return children;

  if (feature?.soon) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-badge font-medium uppercase tracking-wide text-text-subtle">Soon</p>
        <h1 className="mt-2 text-heading font-semibold">{feature.label}</h1>
        <p className="mt-2 text-body text-text-muted">This menu is not open to the public yet.</p>
        <LinkButton href={apexHref("/")} variant="primary" className="mt-6">
          Back to catalogue
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-heading font-semibold">Page not found</h1>
      <LinkButton href={apexHref("/")} variant="primary" className="mt-6">
        Back to catalogue
      </LinkButton>
    </div>
  );
}
