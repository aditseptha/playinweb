import { readFile } from "node:fs/promises";
import path from "node:path";

/** The browser build of supabase-js, so DesKop's iframe can open a room without a third-party CDN. */
export async function GET() {
  const file = path.join(process.cwd(), "node_modules/@supabase/supabase-js/dist/umd/supabase.js");
  const body = await readFile(file);
  return new Response(body, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
