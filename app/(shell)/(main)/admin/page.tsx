"use client";

import { AdminPanel } from "@/components/AdminPanel";
import { LinkButton } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { apexHref } from "@/lib/host";

export default function AdminPage() {
  const { user, loading } = useAuth();

  if (loading) return <p className="text-ui text-text-muted">Loading account…</p>;

  if (!user || !isAdminEmail(user.email)) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-heading font-semibold">Page not found</h1>
        <LinkButton href={apexHref("/")} variant="primary" className="mt-6">
          Back to catalogue
        </LinkButton>
      </div>
    );
  }

  return <AdminPanel />;
}
