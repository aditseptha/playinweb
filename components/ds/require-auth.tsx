"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/lib/auth";
import { apexHref } from "@/lib/host";
import { Button } from "./button";
import { StatusPage } from "./empty-state";

/**
 * The one auth gate for pages. While the session loads it shows `loading` (the page's
 * template skeleton) instead of "Loading account…"; signed-out users get a sign-in page and
 * users that fail `allow` get "You don't have access" (not a fake 404).
 */
export function RequireAuth({
  children,
  loading,
  allow,
}: {
  children: ReactNode;
  /** The page's skeleton. */
  loading: ReactNode;
  /** Extra check, e.g. admin only. */
  allow?: (user: User) => boolean;
}) {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return <>{loading}</>;

  if (!user) {
    return (
      <StatusPage
        status="sign-in"
        actions={
          <Button variant="primary" asChild>
            <Link href={apexHref("/login")}>Sign in</Link>
          </Button>
        }
      />
    );
  }

  if (allow && !allow(user)) {
    return (
      <StatusPage
        status="no-access"
        actions={
          <Button asChild>
            <Link href={apexHref("/")}>Back to home</Link>
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
