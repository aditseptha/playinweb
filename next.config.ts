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
  images: {
    qualities: [75, 90],
    remotePatterns: [
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
        : []),
      // Covers of link-out curated games (#9 F2) stay on the creator's itch.io page.
      { protocol: "https", hostname: "img.itch.zone", pathname: "/**" },
    ],
  },
};

export default nextConfig;
