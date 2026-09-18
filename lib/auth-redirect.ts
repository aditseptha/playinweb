import { safeReturnTo } from "@/lib/host";
import type { Session } from "@supabase/supabase-js";

export function continueAfterAuth(session: Session | null, rawNext: string | null) {
  const next = safeReturnTo(rawNext);
  if (!next.startsWith("http")) {
    window.location.assign(next);
    return;
  }
  const dest = new URL(next);
  if (dest.origin === window.location.origin || !session) {
    window.location.assign(next);
    return;
  }
  const handoff = new URL("/auth/handoff", dest.origin);
  handoff.searchParams.set("next", `${dest.pathname}${dest.search}`);
  const payload = encodeURIComponent(
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }),
  );
  window.location.assign(`${handoff.href}#${payload}`);
}
