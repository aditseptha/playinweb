import type { NextConfig } from "next";

function supabaseHostname() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
}

const supabaseHost = supabaseHostname();

const nextConfig: NextConfig = {
  // The deployed commit, shown beside the version in the footer and on /devlog (#40).
  env: {
    NEXT_PUBLIC_BUILD_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "",
  },
  // DesKop's room page loads this browser build from /api/deskop-supabase.
  outputFileTracingIncludes: {
    "/api/deskop-supabase": ["./node_modules/@supabase/supabase-js/dist/umd/supabase.js"],
  },
  async redirects() {
    return [{ source: "/devlogs", destination: "/devlog", permanent: true }];
  },
  images: {
    // Vercel's image optimization quota ran out (402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED), which
    // blanked every cover and avatar it hadn't cached yet. Serve the stored files directly until uploads
    // are resized at upload time; then this can come back on.
    unoptimized: true,
    qualities: [75, 90],
    remotePatterns: [
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
        : []),
      // Covers of link-out curated games (#9 F2) stay on the creator's itch.io or Game Jolt page.
      { protocol: "https", hostname: "img.itch.zone", pathname: "/**" },
      { protocol: "https", hostname: "m.gjcdn.net", pathname: "/game-thumbnail/**" },
    ],
  },
};

export default nextConfig;
