"use client";

import { AdminPanel } from "@/components/AdminPanel";
import { LinkButton } from "@/components/ui/button";
import s from "@/components/home/home.module.css";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { apexHref } from "@/lib/host";

export function AdminScreen() {
  const { user, loading } = useAuth();

  return (
    <div className={s.create}>
      <div className={s.frame}>
        <div className={s.wrap}>
          {loading ? (
            <p className={s.legalIntro}>Loading account…</p>
          ) : !user || !isAdminEmail(user.email) ? (
            <>
              <h1 className={s.createTitle}>Page not found</h1>
              <div className={s.createForm}>
                <LinkButton href={apexHref("/")} variant="primary">
                  Back to catalogue
                </LinkButton>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
