import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { authCookieOptions } from "@/lib/supabase/cookies";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  const { url, key } = getSupabaseEnv();
  return createBrowserClient<Database>(url, key, { cookieOptions: authCookieOptions() });
}
