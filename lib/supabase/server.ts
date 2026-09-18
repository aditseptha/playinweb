import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { authCookieOptions } from "@/lib/supabase/cookies";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();
  const cookieOpts = authCookieOptions();

  return createServerClient<Database>(url, key, {
    cookieOptions: cookieOpts,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, _headers) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, { ...options, ...cookieOpts });
          });
        } catch {
          // Called from a Server Component. The proxy refreshes cookies.
        }
      },
    },
  });
}
