"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { safeReturnTo } from "@/lib/host";
import { createClient } from "@/lib/supabase/client";

export default function AuthHandoffPage() {
  return (
    <Suspense fallback={<p className="text-ui text-text-muted">Signing you in…</p>}>
      <Handoff />
    </Suspense>
  );
}

function Handoff() {
  const params = useSearchParams();

  useEffect(() => {
    const next = safeReturnTo(params.get("next"));
    const raw = window.location.hash.replace(/^#/, "");
    const supabase = createClient();

    async function run() {
      try {
        const parsed = JSON.parse(decodeURIComponent(raw)) as {
          access_token?: string;
          refresh_token?: string;
        };
        if (parsed.access_token && parsed.refresh_token) {
          await supabase.auth.setSession({
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token,
          });
        }
      } catch {
        /* missing or invalid handoff */
      }
      window.location.replace(next.startsWith("http") ? next : next || "/");
    }

    void run();
  }, [params]);

  return <p className="text-ui text-text-muted">Signing you in…</p>;
}
