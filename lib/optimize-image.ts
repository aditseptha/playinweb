export function canOptimizeImage(src: string) {
  if (!src) return false;
  if (src.startsWith("/")) return true;
  try {
    const host = new URL(src).hostname;
    return host.endsWith(".supabase.co");
  } catch {
    return false;
  }
}
