"use client";

import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardSkeleton } from "@/components/ds/skeleton";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

/** Same gate as /admin: guests and non-admins get the site 404. */
export function DsAccessGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-8">
        <DashboardSkeleton label="Loading design system" />
      </div>
    );
  }

  if (!user || !isAdminEmail(user.email)) notFound();

  return <>{children}</>;
}
