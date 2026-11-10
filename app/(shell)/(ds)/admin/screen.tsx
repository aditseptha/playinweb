"use client";

import { notFound } from "next/navigation";
import { AdminPanel } from "@/components/AdminPanel";
import { LinkButton } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/ds/skeleton";
import s from "@/components/home/home.module.css";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { apexHref } from "@/lib/host";

export function AdminScreen() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className={`${s.create} ${s.pageSkin}`}>
        <div className={s.frame}>
          <div className={s.wrap}>
            <DashboardSkeleton label="Loading admin" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || !isAdminEmail(user.email)) notFound();

  return (
    <div className={`${s.create} ${s.pageSkin}`}>
      <div className={s.frame}>
        <div className={s.wrap}>
          <p className={s.eyebrow}>Admin</p>
          <h1 className={s.createTitle}>Admin</h1>
          <div className={s.createForm}>
            <p className="mb-4">
              <LinkButton href={apexHref("/admin/design")} variant="secondary">
                Design system
              </LinkButton>
            </p>
            <AdminPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
