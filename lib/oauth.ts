import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { apexOrigin, safeReturnTo } from "@/lib/host";
import { createClient } from "@/lib/supabase/client";

export function oauthCallbackUrl(next?: string | null) {
  const callback = new URL("/auth/callback", apexOrigin());
  callback.searchParams.set("next", safeReturnTo(next ?? "/"));
  return callback.toString();
}

export function passwordResetCallbackUrl() {
  return oauthCallbackUrl("/auth/reset-password");
}

export async function signInWithGoogle(next?: string | null) {
  const supabase = createClient();
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: oauthCallbackUrl(next),
      queryParams: { prompt: "select_account" },
    },
  });
}

export function oauthDisplayName(user: User) {
  const meta = user.user_metadata ?? {};
  const full = meta.full_name ?? meta.name ?? meta.display_name;
  return typeof full === "string" ? full.trim() : "";
}

export function needsHandleSetup(handle: string | null | undefined) {
  return !handle || /^user-[a-f0-9]{8}$/i.test(handle);
}

export async function syncOAuthProfile(supabase: SupabaseClient<Database>, user: User) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return { needsSetup: true };

  const name = oauthDisplayName(user);
  const patch: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if (
    name &&
    (!profile.display_name || profile.display_name === profile.handle || profile.display_name.startsWith("user-"))
  ) {
    patch.display_name = name;
  }
  if (Object.keys(patch).length) {
    await supabase.from("profiles").update(patch).eq("id", user.id);
  }

  return { needsSetup: needsHandleSetup(profile.handle) };
}

export function oauthRedirectAfterSignIn(next: string | null | undefined, needsSetup: boolean) {
  const dest = safeReturnTo(next);
  if (needsSetup && !dest.includes("/profile")) {
    return `${apexOrigin()}/profile?edit=1&setup=handle`;
  }
  if (dest.startsWith("http")) return dest;
  return `${apexOrigin()}${dest}`;
}
