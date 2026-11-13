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
  const [display, body, bodyBold, pixel, mark, word, posterA, posterB, posterC] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/BarlowCondensed-ExtraBoldItalic.ttf")),
    readFile(join(process.cwd(), "assets/fonts/PlusJakartaSans-Medium.ttf")),
    readFile(join(process.cwd(), "assets/fonts/PlusJakartaSans-Bold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Silkscreen-Regular.ttf")),
    readFile(join(process.cwd(), "assets/brand/mark.png")),
    readFile(join(process.cwd(), "assets/brand/lettermark-white.png")),
    readFile(join(process.cwd(), "assets/og/poster-a.jpg")),
    readFile(join(process.cwd(), "assets/og/poster-b.jpg")),
    readFile(join(process.cwd(), "assets/og/poster-c.jpg")),
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
    posters: [dataUri(posterA, "image/jpeg"), dataUri(posterB, "image/jpeg"), dataUri(posterC, "image/jpeg")] as [
      string,
      string,
      string,
    ],
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

const NIGHT = `radial-gradient(78% 62% at 88% 18%, ${alpha(p.bright, 0.42)}, transparent 58%), radial-gradient(64% 70% at 12% 92%, ${alpha(p.deep, 0.7)}, transparent 72%), linear-gradient(152deg, ${p.navy} 0%, ${p["night-900"]} 48%, ${p["night-950"]} 100%)`;

/** Even inset. Social crops eat the outer ~40px, so content stays inside this frame. */
const OG_PAD = 48;

function Hashtag({ children, tone }: { children: string; tone: "gold" | "sky" }) {
  const hash = tone === "gold" ? p.gold : p.sky;
  const text = tone === "gold" ? p["mist-50"] : p["mist-100"];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        fontSize: 22,
        fontWeight: 700,
        color: text,
        letterSpacing: 0.2,
      }}
    >
      <span style={{ color: hash, marginRight: 3, fontSize: 24 }}>#</span>
      {children}
    </div>
  );
}

function PosterCard({ src, w, h, rotate }: { src: string; w: number; h: number; rotate: number }) {
  return (
    <div
      style={{
        display: "flex",
        width: w,
        height: h,
        borderRadius: 18,
        overflow: "hidden",
        border: `2px solid ${alpha(p["mist-50"], 0.22)}`,
        boxShadow: `0 14px 36px ${alpha(p.navy, 0.75)}`,
        transform: `rotate(${rotate}deg)`,
        background: p["night-800"],
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} width={w} height={h} style={{ objectFit: "cover", width: w, height: h }} alt="" />
    </div>
  );
}

/** Sample 3:4 game covers (tall-card posters). Sources: scripts/sync-og-posters.mjs */
function PosterShowcase({ mark, posters }: { mark: string; posters: [string, string, string] }) {
  const side = { w: 232, h: 310 };
  const front = { w: 268, h: 358 };
  return (
    <div
      style={{
        position: "relative",
        width: 460,
        height: 430,
        display: "flex",
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 72, display: "flex" }}>
        <PosterCard src={posters[0]} w={side.w} h={side.h} rotate={-10} />
      </div>
      <div style={{ position: "absolute", right: 0, top: 64, display: "flex" }}>
        <PosterCard src={posters[2]} w={side.w} h={side.h} rotate={10} />
      </div>
      <div style={{ position: "absolute", left: 96, top: 18, display: "flex" }}>
        <PosterCard src={posters[1]} w={front.w} h={front.h} rotate={0} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 190,
          top: 332,
          display: "flex",
          width: 84,
          height: 84,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 22,
          border: `3px solid ${alpha(p.gold, 0.7)}`,
          background: p["night-950"],
          boxShadow: `0 12px 28px ${alpha(p.navy, 0.85)}`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mark} width={56} height={56} style={{ borderRadius: 12 }} alt="" />
      </div>
    </div>
  );
}

/** Site-wide preview: brand, the promise, and the warm-night palette. */
export async function siteOgImage() {
  const a = await assets();
  return new ImageResponse(
    <div
      style={{
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        display: "flex",
        flexDirection: "row",
        position: "relative",
        background: NIGHT,
        color: p["mist-50"],
        fontFamily: "Body",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: OG_PAD,
          width: 680,
          height: OG_SIZE.height,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Brand mark={a.mark} word={a.word} />
          <div style={{ fontFamily: "Pixel", fontSize: 18, color: p.gold, letterSpacing: 2 }}>INDIE WEB GAMES</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontFamily: "Display",
              fontStyle: "italic",
              fontWeight: 800,
              fontSize: 88,
              lineHeight: 0.9,
              textTransform: "uppercase",
              color: p.gold,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Play right</span>
            <span style={{ color: p["mist-50"] }}>in your browser</span>
          </div>
          <div style={{ fontSize: 26, lineHeight: 1.35, color: p["mist-100"], maxWidth: 560 }}>
            Story and adventure games from indie creators. Nothing to install.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Hashtag tone="gold">FreeToPlay</Hashtag>
          <Hashtag tone="sky">NoDownload</Hashtag>
          <span style={{ fontSize: 22, color: p["mist-300"] }}>playinweb.com</span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          position: "relative",
          width: 520,
          height: OG_SIZE.height,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <PosterShowcase mark={a.mark} posters={a.posters} />
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
