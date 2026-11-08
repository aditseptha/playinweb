import { gameOgImage, OG_SIZE, siteOgImage } from "@/lib/og";
import { publicMediaUrl } from "@/lib/media";
import { fetchProjectByHandleSlug } from "@/lib/projects";

export const alt = "A game on PlayInWeb";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ handle: string; slug: string }> }) {
  const { handle, slug } = await params;
  const project = await fetchProjectByHandleSlug(handle, slug);
  if (!project) return siteOgImage();
  return gameOgImage({
    title: project.title,
    creator: project.profiles?.display_name || project.profiles?.handle || handle,
    plays: project.play_count,
    coverUrl: publicMediaUrl(project.cover_path),
  });
}
