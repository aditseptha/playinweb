import { NextResponse } from "next/server";
import { oauthRedirectAfterSignIn, syncOAuthProfile } from "@/lib/oauth";
import { safeReturnTo } from "@/lib/host";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeReturnTo(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${url.origin}/?auth_error=${encodeURIComponent("Missing sign-in code.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${url.origin}/?auth_error=${encodeURIComponent(error.message)}`);
  }

  if (next === "/auth/reset-password") {
    return NextResponse.redirect(`${url.origin}/auth/reset-password`);
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  let needsSetup = false;
  if (user) {
    const result = await syncOAuthProfile(supabase, user);
    needsSetup = result.needsSetup;
  }

  return NextResponse.redirect(oauthRedirectAfterSignIn(next, needsSetup));
}
