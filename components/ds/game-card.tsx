import { IconHeart, IconPlay, IconPlus, IconUsers } from "@/components/icons";
import Image from "next/image";
import Link from "next/link";
import { formatCompact, formatNumber, gamePath } from "@/lib/format";
import { canOptimizeImage } from "@/lib/optimize-image";
import type { Game } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Avatar } from "./avatar";
import { Badge } from "./badge";
import s from "./game-card.module.css";
import { Skeleton } from "./skeleton";
import { focusRing, onArt } from "./styles";

// One card for every game listing. Ratios follow the media standard (#5): 16:9 for feature
// and wide cards, and for the game page. 3:4 for tall cards and row thumbnails.

export type GameCardData = {
  title: string;
  href: string;
  /** 16:9 cover. */
  cover?: string;
  /** Optional 3:4 cover for tall cards. Falls back to the 16:9 cover, cropped at the focal point. */
  coverPortrait?: string;
  /** Focal point of the 16:9 cover, 0–1 on each axis (cover_focal_x / cover_focal_y). Defaults to the centre. */
  focal?: { x: number; y: number };
  creator: { name: string; avatarUrl?: string };
  plays?: number;
  likes?: number;
  badge?: "top" | "new";
  /** Shows the "Instant play" pill and a Play button straight into the game. */
  playHref?: string;
};

export function toGameCardData(game: Game): GameCardData {
  return {
    title: game.title,
    href: gamePath(game),
    cover: game.thumbnailUrl || undefined,
    coverPortrait: game.portraitUrl || undefined,
    focal: game.focalX !== undefined && game.focalY !== undefined ? { x: game.focalX, y: game.focalY } : undefined,
    creator: { name: game.developer, avatarUrl: game.creatorAvatarUrl },
    plays: game.playCount,
    likes: game.likeCount,
    playHref: game.embeddable ? gamePath(game) : undefined,
  };
}

/** { x: 0.37, y: 0.2 } → "37% 20%". Missing or out-of-range values fall back to the centre. */
export function focalToObjectPosition(focal?: { x: number; y: number } | null) {
  const pct = (v: number | undefined) =>
    typeof v === "number" && Number.isFinite(v) ? Math.round(Math.min(1, Math.max(0, v)) * 100) : 50;
  return `${pct(focal?.x)}% ${pct(focal?.y)}%`;
}

type Variant = "feature" | "wide" | "tall" | "row";

const SIZES: Record<Variant, string> = {
  feature: "(min-width: 1024px) 30vw, (min-width: 768px) 48vw, 92vw",
  wide: "(min-width: 1024px) 30vw, (min-width: 768px) 48vw, 92vw",
  tall: "(min-width: 1024px) 15vw, (min-width: 768px) 24vw, 46vw",
  row: "64px",
};

function Cover({ data, variant, priority }: { data: GameCardData; variant: Variant; priority?: boolean }) {
  const portrait = variant === "tall" || variant === "row";
  const src = portrait ? data.coverPortrait || data.cover : data.cover;
  const position = portrait && data.coverPortrait ? "50% 50%" : focalToObjectPosition(data.focal);
  const img =
    "object-cover transition-transform duration-500 ease-pw-out group-hover:scale-[1.04] motion-reduce:transition-none";

  if (!src) {
    // Branded placeholder: never an empty box.
    return (
      <div aria-hidden className="absolute inset-0 grid place-items-center bg-linear-to-br from-pw-deep to-pw-navy">
        <span className="font-pw-display text-[44px] font-extrabold italic text-[color-mix(in_srgb,var(--pw-sky)_45%,transparent)] uppercase">
          {data.title.trim().slice(0, 2) || "PW"}
        </span>
      </div>
    );
  }
  if (canOptimizeImage(src)) {
    return (
      <Image
        src={src}
        alt=""
        fill
        sizes={SIZES[variant]}
        preload={priority}
        className={img}
        style={{ objectPosition: position }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn("absolute inset-0 size-full", img)}
      style={{ objectPosition: position }}
    />
  );
}

function Stats({ data, className }: { data: GameCardData; className?: string }) {
  if (data.plays === undefined && data.likes === undefined) return null;
  return (
    <span className={cn("inline-flex items-center gap-3 tabular-nums", className)}>
      {data.plays !== undefined ? (
        <span className="inline-flex items-center gap-1" title={`${formatNumber(data.plays)} plays`}>
          <IconUsers aria-hidden className="size-3.5" />
          <span className="sr-only">Plays:</span>
          {formatCompact(data.plays)}
        </span>
      ) : null}
      {data.likes !== undefined ? (
        <span className="inline-flex items-center gap-1" title={`${formatNumber(data.likes)} likes`}>
          <IconHeart aria-hidden className="size-3.5 text-pw-gold" />
          <span className="sr-only">Likes:</span>
          {formatCompact(data.likes)}
        </span>
      ) : null}
    </span>
  );
}

const frame = cn(
  "group relative isolate block overflow-hidden rounded-pw-xl border border-pw-line bg-pw-surface-raised",
  "transition-[translate,box-shadow,border-color] duration-300 ease-pw-out",
  "hover:-translate-y-1 hover:border-pw-line-strong hover:shadow-pw-2 motion-reduce:hover:translate-y-0",
  "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-pw-focus-ring",
);

/** Covers the whole card. The visible title is its label, so screen readers hear the game name once. */
function CardLink({ href, title }: { href: string; title: string }) {
  return <Link href={href} aria-label={title} className="absolute inset-0 z-[2] rounded-[inherit] outline-none" />;
}

function PlayButton({ href, title, size = "md" }: { href: string; title: string; size?: "sm" | "md" }) {
  return (
    <Link
      href={href}
      aria-label={`Play ${title}`}
      className={cn(
        "relative z-[3] grid shrink-0 place-items-center rounded-pw-md bg-linear-to-b from-pw-primary-hi to-pw-primary-lo text-pw-on-primary shadow-pw-glow transition-transform duration-150 hover:scale-105",
        size === "md" ? "size-12" : "size-11",
        focusRing,
      )}
    >
      <IconPlay aria-hidden className="ml-0.5 size-5 fill-current" />
    </Link>
  );
}

function CardBadge({ badge }: { badge?: GameCardData["badge"] }) {
  if (!badge) return null;
  return badge === "top" ? (
    <Badge tone="highlight" className="absolute top-3 left-3 z-[3]">
      Top
    </Badge>
  ) : (
    <Badge tone="primary" className="absolute top-3 left-3 z-[3]">
      New
    </Badge>
  );
}

export function GameCard({
  data,
  variant = "wide",
  rank,
  priority,
  className,
}: {
  data: GameCardData;
  variant?: Variant;
  /** Row variant only: position in a ranked list. */
  rank?: number;
  priority?: boolean;
  className?: string;
}) {
  if (variant === "row") {
    return (
      <article
        className={cn(
          "group relative flex items-center gap-4 rounded-pw-lg p-2 pr-4 transition-colors duration-150 hover:bg-pw-surface-2",
          "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-pw-focus-ring",
          className,
        )}
      >
        {rank !== undefined ? (
          <span className="w-7 shrink-0 text-center font-pw-display text-pw-heading font-extrabold text-pw-muted tabular-nums italic">
            {rank}
          </span>
        ) : null}
        <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-pw-md bg-pw-surface-3">
          <Cover data={data} variant="row" priority={priority} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-pw-body font-bold text-pw-text">{data.title}</h3>
          <p className="mt-0.5 flex min-w-0 items-center gap-2 text-pw-caption text-pw-muted">
            <Avatar name={data.creator.name} src={data.creator.avatarUrl} size="xs" />
            <span className="truncate">{data.creator.name}</span>
          </p>
        </div>
        <Stats data={data} className="shrink-0 text-pw-caption text-pw-text-soft" />
        <CardLink href={data.href} title={data.title} />
      </article>
    );
  }

  if (variant === "tall") {
    return (
      <article className={cn(frame, "aspect-[3/4]", className)}>
        <Cover data={data} variant="tall" priority={priority} />
        <span className={s.shine} aria-hidden />
        <div
          aria-hidden
          className="absolute inset-x-0 top-[38%] bottom-0 z-[1] bg-linear-to-b from-transparent via-[color-mix(in_srgb,var(--pw-night-950)_82%,transparent)] via-45% to-[color-mix(in_srgb,var(--pw-night-950)_97%,transparent)]"
        />
        <CardBadge badge={data.badge} />
        {data.likes !== undefined ? (
          <Badge tone="art" look="pill" className="absolute top-3 right-3 z-[3] tabular-nums">
            <IconHeart aria-hidden className="text-pw-gold" />
            <span className="sr-only">Likes:</span>
            {formatCompact(data.likes)}
          </Badge>
        ) : null}
        <div
          className={cn("absolute inset-x-0 bottom-0 z-[3] flex flex-col items-center px-3 pb-4 text-center", onArt)}
        >
          <h3 className="line-clamp-2 font-pw-display text-[clamp(22px,2vw,28px)] leading-[0.95] font-extrabold uppercase [overflow-wrap:anywhere] [text-wrap:balance]">
            {data.title}
          </h3>
          <p className="mt-1.5 max-w-full truncate text-pw-caption text-pw-on-art-soft">{data.creator.name}</p>
        </div>
        <CardLink href={data.href} title={data.title} />
      </article>
    );
  }

  if (variant === "feature") {
    return (
      <article className={cn(frame, "aspect-video", className)}>
        <Cover data={data} variant="feature" priority={priority} />
        <span className={s.shine} aria-hidden />
        {data.playHref ? (
          <Badge tone="art" look="pill" className="absolute top-3 left-3 z-[3]">
            <span aria-hidden className="size-1.5 rounded-full bg-pw-gold" />
            Instant play
          </Badge>
        ) : (
          <CardBadge badge={data.badge} />
        )}
        <div
          className={cn(
            "absolute inset-x-3 bottom-3 z-[3] flex items-center gap-3 rounded-pw-lg border border-[color-mix(in_srgb,var(--pw-white)_8%,transparent)] p-3 pl-4",
            "bg-[color-mix(in_srgb,var(--pw-night-700)_62%,transparent)] backdrop-blur-md supports-[not(backdrop-filter:blur(1px))]:bg-[color-mix(in_srgb,var(--pw-night-700)_92%,transparent)]",
            onArt,
          )}
        >
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[clamp(17px,1.5vw,21px)] leading-tight font-bold">{data.title}</h3>
            <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-pw-caption text-pw-on-art-soft">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Avatar name={data.creator.name} src={data.creator.avatarUrl} size="xs" ring />
                <span className="truncate">{data.creator.name}</span>
              </span>
              <Stats data={data} />
            </p>
          </div>
          {data.playHref ? <PlayButton href={data.playHref} title={data.title} /> : null}
        </div>
        <CardLink href={data.href} title={data.title} />
      </article>
    );
  }

  // wide
  return (
    <article className={cn(frame, "aspect-video", className)}>
      <Cover data={data} variant="wide" priority={priority} />
      <span className={s.shine} aria-hidden />
      <div
        aria-hidden
        className="absolute inset-x-0 top-[30%] bottom-0 z-[1] bg-linear-to-b from-transparent via-[color-mix(in_srgb,var(--pw-night-950)_55%,transparent)] via-45% to-[color-mix(in_srgb,var(--pw-night-950)_92%,transparent)]"
      />
      <CardBadge badge={data.badge} />
      <div className={cn("absolute inset-x-0 bottom-0 z-[3] flex items-end gap-3 p-4", onArt)}>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-pw-display text-pw-display-m font-extrabold uppercase [overflow-wrap:anywhere] [text-wrap:balance]">
            {data.title}
          </h3>
          <p className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-pw-caption text-pw-on-art-soft">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Avatar name={data.creator.name} src={data.creator.avatarUrl} size="xs" ring />
              <span className="truncate">{data.creator.name}</span>
            </span>
            <Stats data={data} />
          </p>
        </div>
        {data.playHref ? <PlayButton href={data.playHref} title={data.title} size="sm" /> : null}
      </div>
      <CardLink href={data.href} title={data.title} />
    </article>
  );
}

/** The gold "Your turn" invite that sits at the end of a creator row. */
export function SlotCard({
  href,
  title = "Your game here",
  className,
}: {
  href: string;
  title?: string;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group relative flex aspect-[3/4] flex-col items-center justify-end overflow-hidden rounded-pw-xl border-2 border-pw-gold px-3 pb-4 text-center",
        "bg-[radial-gradient(90%_60%_at_50%_30%,color-mix(in_srgb,var(--pw-gold)_16%,transparent),transparent_70%),linear-gradient(180deg,color-mix(in_srgb,var(--pw-deep)_45%,var(--pw-navy)),var(--pw-navy))]",
        s.slotGlow,
        className,
      )}
    >
      <span className="absolute top-3 left-3 font-pw-pixel text-pw-label tracking-[0.06em] text-pw-gold uppercase">
        Your turn!
      </span>
      <span
        aria-hidden
        className="absolute top-[34%] grid size-14 -translate-y-1/2 place-items-center rounded-pw-lg bg-linear-to-b from-pw-gold-soft to-pw-gold text-pw-gold-ink transition-transform duration-300 ease-pw-spring group-hover:scale-110 group-hover:rotate-6"
      >
        <IconPlus className="size-7" />
      </span>
      <h3 className="font-pw-display text-[clamp(22px,2vw,28px)] leading-[0.95] font-extrabold text-pw-mist-50 uppercase">
        {title}
      </h3>
      <p className="mt-1.5 text-pw-caption text-pw-mist-100">Publish in minutes</p>
      <CardLink href={href} title={`${title}: publish a game`} />
    </article>
  );
}

/** Same footprint as the card, for loading states. */
export function GameCardSkeleton({ variant = "wide", className }: { variant?: Variant; className?: string }) {
  if (variant === "row") {
    return (
      <div className={cn("flex items-center gap-4 p-2", className)} aria-hidden>
        <Skeleton className="aspect-[3/4] w-16 rounded-pw-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    );
  }
  return (
    <Skeleton
      aria-hidden
      className={cn("rounded-pw-xl", variant === "tall" ? "aspect-[3/4]" : "aspect-video", className)}
    />
  );
}
