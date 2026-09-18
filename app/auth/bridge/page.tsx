"use client";

import { useEffect } from "react";
import { AUTH_BRIDGE_MESSAGE, isAllowedAuthOrigin } from "@/lib/auth-bridge";
import { createClient } from "@/lib/supabase/client";

export default function AuthBridgePage() {
  useEffect(() => {
    const parentOrigin = new URLSearchParams(window.location.search).get("origin") ?? "";
    if (!isAllowedAuthOrigin(parentOrigin) || window.parent === window) return;
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      window.parent.postMessage(
        {
          type: AUTH_BRIDGE_MESSAGE,
          session: data.session
            ? {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
              }
            : null,
        },
        parentOrigin,
      );
    });
  }, []);

  return null;
}
