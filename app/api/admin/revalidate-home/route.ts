import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Bust homepage hero + featured caches after admin saves picks. */
export async function POST() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || !isAdmin) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }

  revalidateTag("home-hero-spotlights", { expire: 0 });
  revalidateTag("home-featured-games", { expire: 0 });
  return Response.json({ ok: true });
}
