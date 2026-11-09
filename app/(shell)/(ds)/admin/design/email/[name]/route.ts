import { EMAIL_TEMPLATES, previewEmail } from "@/lib/email-templates";

// Preview of an auth email with sample values, for the iframes on /admin/design.
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const template = EMAIL_TEMPLATES.find((t) => t.file === `${name}.html`);
  if (!template) return new Response("Not found", { status: 404 });
  return new Response(previewEmail(template.html), {
    headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" },
  });
}
