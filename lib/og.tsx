// Open Graph images (link previews on WhatsApp, X, Discord…), drawn with the design system.
// Used by app/opengraph-image.tsx, the game routes, and the sample on /admin/design.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { formatCompact } from "@/lib/format";
import { primitives as p } from "@/lib/tokens";

export const OG_SIZE = { width: 1200, height: 630 };

const dataUri = (buf: Buffer, type: string) => `data:${type};base64,${buf.toString("base64")}`;

/** "#020f06" + 0.8 → "rgba(2, 15, 6, 0.8)". Satori doesn't read 8-digit hex reliably. */
function alpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

async function assets() {
  // Literal paths keep file tracing scoped to assets/ (a variable path would bundle the whole repo).
  const [display, body, bodyBold, pixel, mark, word] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/BarlowCondensed-ExtraBoldItalic.ttf")),
    readFile(join(process.cwd(), "assets/fonts/PlusJakartaSans-Medium.ttf")),
    readFile(join(process.cwd(), "assets/fonts/PlusJakartaSans-Bold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Silkscreen-Regular.ttf")),
    readFile(join(process.cwd(), "assets/brand/mark.png")),
    readFile(join(process.cwd(), "assets/brand/lettermark-white.png")),
  ]);
  return {
    fonts: [
      { name: "Display", data: display, weight: 800 as const, style: "italic" as const },
      { name: "Body", data: body, weight: 500 as const, style: "normal" as const },
      { name: "Body", data: bodyBold, weight: 700 as const, style: "normal" as const },
      { name: "Pixel", data: pixel, weight: 400 as const, style: "normal" as const },
    ],
    mark: dataUri(mark, "image/png"),
    word: dataUri(word, "image/png"),
  };
}

/**
 * Fetches a cover for the preview. Satori reads PNG and JPEG only, so other formats (WebP)
 * fall back to the branded background. The media pipeline (#5) should keep a JPEG for this.
 */
async function coverFor(url?: string | null) {
  if (!url || !/^https?:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(png|jpe?g)/.test(type)) return null;
    return dataUri(Buffer.from(await res.arrayBuffer()), type);
  } catch {
    return null;
  }
}

function Brand({ mark, word }: { mark: string; word: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mark} width={64} height={64} style={{ borderRadius: 16 }} alt="" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={word} width={197} height={36} alt="" style={{ marginTop: 4 }} />
    </div>
  );
}

const NIGHT = `radial-gradient(70% 90% at 15% 80%, ${alpha(p.deep, 0.66)}, transparent 70%), linear-gradient(160deg, ${p.navy} 0%, ${p["night-900"]} 70%)`;

/** Site-wide preview: brand, the promise, and the warm-night palette. */
export async function siteOgImage() {
  const a = await assets();
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: NIGHT,
        color: p["mist-50"],
        fontFamily: "Body",
      }}
    >
      <Brand mark={a.mark} word={a.word} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "Pixel", fontSize: 22, color: p.gold, letterSpacing: 2 }}>INDIE WEB GAMES</div>
        <div
          style={{
            fontFamily: "Display",
            fontStyle: "italic",
            fontWeight: 800,
            fontSize: 112,
            lineHeight: 0.92,
            textTransform: "uppercase",
            color: p.gold,
            marginTop: 18,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>Play right</span>
          <span style={{ color: p["mist-50"] }}>in your browser</span>
        </div>
        <div style={{ fontSize: 30, color: p["mist-100"], marginTop: 24 }}>
          Story and adventure games from indie creators. Nothing to install.
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts: a.fonts },
  );
}

export type GameOgInput = {
  title: string;
  creator: string;
  plays?: number;
  coverUrl?: string | null;
};

/** Per-game preview: the cover full-bleed, title in the display face, creator up front. */
export async function gameOgImage(game: GameOgInput) {
  const [a, cover] = await Promise.all([assets(), coverFor(game.coverUrl)]);
  const title = game.title.length > 64 ? `${game.title.slice(0, 62).trimEnd()}…` : game.title;
  const size = title.length > 34 ? 76 : title.length > 18 ? 96 : 120;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: NIGHT,
        fontFamily: "Body",
      }}
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          width={1200}
          height={630}
          style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }}
        />
      ) : null}
      <div
        style={{
          // Satori has no `inset`; size the scrim explicitly.
          position: "absolute",
          top: 0,
          left: 0,
          width: 1200,
          height: 630,
          display: "flex",
          background: `linear-gradient(90deg, ${alpha(p["night-950"], 0.92)} 0%, ${alpha(p["night-950"], 0.62)} 48%, ${alpha(p["night-950"], 0.06)} 100%)`,
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          width: "100%",
          color: p["mist-50"],
        }}
      >
        <Brand mark={a.mark} word={a.word} />
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
          <div style={{ fontFamily: "Pixel", fontSize: 22, color: p.gold, letterSpacing: 2 }}>
            PLAY FREE IN YOUR BROWSER
          </div>
          <div
            style={{
              fontFamily: "Display",
              fontStyle: "italic",
              fontWeight: 800,
              fontSize: size,
              lineHeight: 0.92,
              textTransform: "uppercase",
              marginTop: 16,
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 30, color: p["mist-100"], marginTop: 22, gap: 14 }}>
            <span>by</span>
            <span style={{ fontWeight: 700, color: p["mist-50"] }}>{game.creator}</span>
            {game.plays ? <span>· {formatCompact(game.plays)} plays</span> : null}
          </div>
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts: a.fonts },
  );
}
