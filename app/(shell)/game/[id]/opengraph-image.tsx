import { gameOgImage, OG_SIZE, siteOgImage } from "@/lib/og";
import { publicMediaUrl } from "@/lib/media";
import { fetchProjectById } from "@/lib/projects";

export const alt = "A game on PlayInWeb";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await fetchProjectById(id);
  if (!project) return siteOgImage();
  return gameOgImage({
    title: project.title,
    creator: project.profiles?.display_name || project.profiles?.handle || "Creator",
    plays: project.play_count,
    coverUrl: publicMediaUrl(project.cover_path),
  });
}
