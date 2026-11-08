import { fetchLinkPreview } from "@/lib/fetch-link-preview";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Enter a valid play link." }, { status: 400 });
  }
  const url = typeof body === "object" && body && "url" in body ? String((body as { url: unknown }).url ?? "") : "";
  const preview = await fetchLinkPreview(url);
  if (!preview) return Response.json({ error: "Enter a valid play link." }, { status: 400 });
  return Response.json(preview);
}
