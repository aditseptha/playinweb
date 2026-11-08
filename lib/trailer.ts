export type Trailer = { provider: "youtube" | "vimeo"; id: string; embedUrl: string; thumbUrl: string };

export function parseTrailer(url: string | null | undefined): Trailer | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? youtube(id) : null;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const id = u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).at(-1);
      return id && id !== "watch" ? youtube(id) : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = u.pathname.split("/").filter((p) => /^\d+$/.test(p)).at(-1);
      return id
        ? {
            provider: "vimeo",
            id,
            embedUrl: `https://player.vimeo.com/video/${id}`,
            thumbUrl: "",
          }
        : null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function vimeoThumbUrl(id: string) {
  try {
    const response = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${id}`)}`);
    if (!response.ok) return "";
    const data = (await response.json()) as { thumbnail_url?: string };
    return data.thumbnail_url ?? "";
  } catch {
    return "";
  }
}

function youtube(id: string): Trailer {
  return {
    provider: "youtube",
    id,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
    thumbUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}
