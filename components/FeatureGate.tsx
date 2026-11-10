"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ds/button";
import { StatusPage } from "@/components/ds/empty-state";
import { AuthSkeleton } from "@/components/ds/skeleton";
import { useAuth } from "@/lib/auth";
import { canOpenFeature, useFeature } from "@/lib/features";

export function FeatureGate({ id, children }: { id: string; children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { feature, loading } = useFeature(id);

  if (authLoading || loading) return <AuthSkeleton label="Loading" />;
  if (canOpenFeature(feature ?? undefined, user?.email)) return children;

  if (feature?.soon) {
    return (
      <StatusPage
        status="coming-soon"
        title={feature.label}
        body="This menu is not open to the public yet."
        fullHeight={false}
        actions={
          <Button variant="primary" asChild>
            <Link href="/">Back to games</Link>
          </Button>
        }
      />
    );
  }

  return (
    <StatusPage
      status="not-found"
      fullHeight={false}
      actions={
        <Button variant="primary" asChild>
          <Link href="/">Back to games</Link>
        </Button>
      }
    />
  );
}
