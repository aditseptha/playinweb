import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { apexOrigin, isHandle, isProjectAssetPath, parseSubdomain, sitePath } from "@/lib/host";
import { authCookieOptions } from "@/lib/supabase/cookies";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest, rewriteUrl?: URL) {
  let response = rewriteUrl
    ? NextResponse.rewrite(rewriteUrl, { request })
    : NextResponse.next({ request });
  const { url, key } = getSupabaseEnv();
  const cookieOpts = authCookieOptions();

  const supabase = createServerClient(url, key, {
    cookieOptions: cookieOpts,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = rewriteUrl
          ? NextResponse.rewrite(rewriteUrl, { request })
          : NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, { ...options, ...cookieOpts });
        });
        Object.entries(headers).forEach(([header, value]) => {
          response.headers.set(header, value);
        });
      },
    },
  });

  await supabase.auth.getClaims();
  return response;
}

export async function handleHost(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const path = request.nextUrl.pathname;
  if (path.startsWith("/_next")) return updateSession(request);

  const subdomain = parseSubdomain(host);
  if (subdomain) {
    const dest = path === "/" ? sitePath(subdomain) : `${sitePath(subdomain)}${path}`;
    return NextResponse.redirect(new URL(dest + request.nextUrl.search, apexOrigin()));
  }

  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "site" && parts[1] && isHandle(parts[1])) {
    const dest = `/${parts.slice(1).join("/")}`;
    return NextResponse.redirect(new URL(dest + request.nextUrl.search, request.nextUrl.origin));
  }

  if (parts[0] && isHandle(parts[0])) {
    const rewrite = request.nextUrl.clone();
    if (isProjectAssetPath(path) && parts.length >= 3) {
      rewrite.pathname = `/html/${parts.join("/")}`;
      return updateSession(request, rewrite);
    }
    rewrite.pathname = `/site/${parts.join("/")}`;
    return updateSession(request, rewrite);
  }

  return updateSession(request);
}
