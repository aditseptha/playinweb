import { deskopRoomScript } from "@/lib/deskop-room";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function GET() {
  const { url, key } = getSupabaseEnv();
  return new Response(deskopRoomScript(url, key), {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
