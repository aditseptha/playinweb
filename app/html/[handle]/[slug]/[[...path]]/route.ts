import { serveProjectHtml } from "@/lib/html-serve";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ handle: string; slug: string; path?: string[] }> },
) {
  const { handle, slug, path } = await ctx.params;
  return serveProjectHtml(handle, slug, path?.join("/") || "index.html");
}
