import { redirect } from "next/navigation";
import { siteOrigin } from "@/lib/host";

export default async function ChannelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(siteOrigin(slug));
}
