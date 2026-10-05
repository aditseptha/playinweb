function supabaseHost() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
}

/** Mirrors next.config.ts remotePatterns, so next/image never gets a URL it would reject. */
export function canOptimizeImage(src: string) {
  if (!src) return false;
  if (src.startsWith("/")) return !src.startsWith("//");
  try {
    const url = new URL(src);
    return (
      url.protocol === "https:" &&
      url.hostname === supabaseHost() &&
      url.pathname.startsWith("/storage/v1/object/public/")
    );
  } catch {
    return false;
  }
}
