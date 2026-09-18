import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { error } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") {
    return Response.json({ ok: false, error: error.message }, { status: 502 });
  }

  return Response.json({
    ok: true,
    project: "Gameshow",
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
}
