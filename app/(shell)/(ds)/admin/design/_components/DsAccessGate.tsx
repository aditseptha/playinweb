"use client";

import type { ReactNode } from "react";
import { RequireAuth } from "@/components/ds/require-auth";
import { DashboardSkeleton } from "@/components/ds/skeleton";
import { isAdminEmail } from "@/lib/admin";

export function DsAccessGate({ children }: { children: ReactNode }) {
  return (
    <RequireAuth
      allow={(user) => isAdminEmail(user.email)}
      loading={
        <div className="mx-auto max-w-5xl p-8">
          <DashboardSkeleton label="Loading design system" />
        </div>
      }
    >
      {children}
    </RequireAuth>
  );
}
