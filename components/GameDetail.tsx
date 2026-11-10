"use client";

import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Avatar } from "@/components/ds/avatar";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { GameCard, GameCardSkeleton, toGameCardData } from "@/components/ds/game-card";
import { focusRing } from "@/components/ds/styles";
import {
  IconArrow,
  IconBookmark,
  IconChevronDown,
  IconComment,
  IconExternal,
  IconFlag,
  IconGamepad,
  IconHeart,
  IconPlay,
  IconShare,
} from "@/components/icons";
import { NavBackdrop } from "@/components/home/NavBackdrop";
import { useLoginDialog } from "@/components/LoginDialog";
import { ProjectCheckout } from "@/components/ProjectCheckout";
import { ProjectComments } from "@/components/ProjectComments";
import {
  playDomain,
  ProjectHeroRoot,
  ProjectHeroStage,
  ProjectHeroThumbs,
  useProjectHero,
} from "@/components/ProjectHero";
import { ReportDialog } from "@/components/ReportDialog";
import { useSignupDialog } from "@/components/SignupDialog";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { licenseLabel, shortUrl, type Curation } from "@/lib/curation";
import { formatJoined, formatPlays } from "@/lib/format";
import { addGuestPlayMs, GUEST_PLAY_LIMIT_MS, guestPlayExpired, guestPlayRemainingMs } from "@/lib/guest-play";
import { apexHref, projectPublicUrl, siteOrigin } from "@/lib/host";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";
import { cachedAvatarUrl } from "@/lib/media";
import { RELEASE_STATUSES, STORES } from "@/lib/project-fields";
import { isPersistedId, projectToGame, type ProjectRecord } from "@/lib/projects";
import { moreFromCreator, similarGames } from "@/lib/related-games";
import { claimSessionStat, releaseSessionStat } from "@/lib/session-stat";
import { useGames } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

const LOCAL_FOLLOWS_KEY = "showcase.follows.v1";
/** A gentle heads-up this long before a guest's play time runs out. */
const GUEST_WARNING_MS = 30_000;

function readLocalFollows(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_FOLLOWS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeLocalFollows(ids: string[]) {
  window.localStorage.setItem(LOCAL_FOLLOWS_KEY, JSON.stringify(ids));
  window.dispatchEvent(new StorageEvent("storage", { key: LOCAL_FOLLOWS_KEY }));
}

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function playReturnUrl() {
  const next = new URL(window.location.href);
  next.searchParams.set("play", "1");
  return `${next.pathname}${next.search}${next.hash}`;
}

function guestPlayLimitLabel() {
  if (GUEST_PLAY_LIMIT_MS >= 60_000) {
    const minutes = Math.round(GUEST_PLAY_LIMIT_MS / 60_000);
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  const seconds = Math.round(GUEST_PLAY_LIMIT_MS / 1000);
  return `${seconds} second${seconds === 1 ? "" : "s"}`;
}

async function bumpPlayCount(projectId: string, viewBump: Promise<void>) {
  if (!claimSessionStat("played", projectId)) return false;
  await viewBump;
  const { error } = await createClient().rpc("bump_play_count", {
    pid: projectId,
  });
  if (error) {
    releaseSessionStat("played", projectId);
    return false;
  }
  return true;
}

function guestLoginOptions() {
  return {
    next: typeof window === "undefined" ? undefined : playReturnUrl(),
    description: `Guest play is limited to ${guestPlayLimitLabel()}. Create an account or sign in to continue.`,
  };
}

function statusLabel(id: string) {
  return (RELEASE_STATUSES.find((s) => s.id === id)?.label ?? id).split(" — ")[0];
}

const STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = {
  released: "success",
  in_development: "warning",
  prototype: "warning",
};

export function GameDetail({
  project,
  creatorGameCount,
  notice,
}: {
  project: ProjectRecord;
  creatorGameCount?: number | null;
  /** Shown above the game, for example the Draft notice for the owner. */
  notice?: ReactNode;
}) {
  const searchParams = useSearchParams();
  const { games, recordPlay, liked: localLiked, toggleLike, library, toggleLibrary } = useGames();
  const { user, loading } = useAuth();
  const { openLogin } = useLoginDialog();
  const { openSignup } = useSignupDialog();
  const persisted = isPersistedId(project.id) && Boolean(project.owner_id);
  const game = projectToGame(project);
  const creator = project.profiles;
  const projectId = project.id;
  const autoPlay = searchParams.get("play") === "1";
  const [liked, setLiked] = useState(!!localLiked[projectId]);
  const [likes, setLikes] = useState(project.like_count);
  const views = project.view_count ?? 0;
  const [plays, setPlays] = useState(Math.min(project.play_count, views));
  const [commentCount, setCommentCount] = useState(project.comment_count ?? 0);
  const [followers, setFollowers] = useState(project.profiles?.follower_count ?? 0);
  const [remoteFollowing, setRemoteFollowing] = useState(false);
  const localFollowing = useSyncExternalStore(
    subscribeStorage,
    () => readLocalFollows().includes(project.owner_id),
    () => false,
  );
  const following = persisted && (user ? remoteFollowing : localFollowing);
  const [isPlaying, setIsPlaying] = useState(autoPlay && game.embeddable && (Boolean(user) || !guestPlayExpired()));
  const [playerExpanded, setPlayerExpanded] = useState(
    autoPlay && game.embeddable && (Boolean(user) || !guestPlayExpired()),
  );
  const layoutWide = isPlaying && playerExpanded;
  const guestExpired = useSyncExternalStore(subscribeStorage, guestPlayExpired, () => false);
  const [guestTimedOut, setGuestTimedOut] = useState(false);
  const [guestWarned, setGuestWarned] = useState(false);
  const [prevUser, setPrevUser] = useState(user);
  if (user !== prevUser) {
    setPrevUser(user);
    if (user) {
      setGuestTimedOut(false);
      setGuestWarned(false);
    }
  }
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const autoPlayed = useRef(false);
  const viewBump = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!persisted || !user) return;
    const supabase = createClient();
    supabase
      .from("project_likes")
      .select("project_id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));
    supabase
      .from("profile_follows")
      .select("creator_id")
      .eq("creator_id", project.owner_id)
      .eq("follower_id", user.id)
      .maybeSingle()
      .then(({ data }) => setRemoteFollowing(!!data));
  }, [persisted, user, projectId, project.owner_id]);

  useEffect(() => {
    if (!persisted) return;
    if (!claimSessionStat("viewed", projectId)) return;
    viewBump.current = (async () => {
      const { error } = await createClient().rpc("bump_view_count", {
        pid: projectId,
      });
      if (error) releaseSessionStat("viewed", projectId);
    })();
  }, [persisted, projectId]);

  // Guest play clock. Restart reloads the game without touching this, so it can't reset the limit.
  useEffect(() => {
    if (user || !isPlaying) return;
    const id = window.setInterval(() => {
      addGuestPlayMs(1000);
      if (guestPlayExpired()) {
        setGuestTimedOut(true);
        openLogin(guestLoginOptions());
      } else if (guestPlayRemainingMs() <= GUEST_WARNING_MS) {
        setGuestWarned(true);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPlaying, user, openLogin]);

  useEffect(() => {
    if (!autoPlay || loading) return;
    if (!user && guestExpired) {
      openLogin(guestLoginOptions());
      return;
    }
    if (autoPlayed.current) return;
    autoPlayed.current = true;
    recordPlay(projectId);
    if (persisted) {
      void bumpPlayCount(projectId, viewBump.current).then((counted) => {
        if (counted) setPlays((n) => n + 1);
      });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot ?play=1 autoplay after auth resolves; there is no user event to hang this on
      setPlays((n) => n + 1);
    }
    window.history.replaceState(null, "", window.location.pathname);
  }, [autoPlay, guestExpired, loading, openLogin, persisted, projectId, recordPlay, user]);

  const onCommentCount = useCallback((n: number) => setCommentCount(n), []);

  if (!creator) notFound();

  // A curated game (#9) credits its original creator and links to their site, not to the `listed` account.
  const curated = game.curated;
  const creatorName = curated?.creatorName ?? (creator.display_name || creator.handle);
  const creatorUrl = curated ? (curated.creatorUrl ?? curated.sourceUrl ?? null) : siteOrigin(creator.handle);
  const avatar = curated ? undefined : cachedAvatarUrl(project.owner_id, creator.avatar_path) || undefined;
  const shareUrl =
    persisted && creator.handle && project.slug
      ? projectPublicUrl(creator.handle, project.slug)
      : apexHref(`/game/${projectId}`);
  const genre = project.genre && project.genre !== "No genre" ? project.genre : null;
  const tags = (project.project_tags ?? []).map((t) => t.tag).filter(Boolean);
  const stores = project.project_store_links ?? [];
  const own = Boolean(user && user.id === project.owner_id);
  const saved = library.includes(projectId);
  const removeHref = `mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent(
    `Remove: ${project.title} (${shareUrl})`,
  )}&body=${encodeURIComponent("I made this game and want it removed from PlayInWeb. Link to my original game page:\n\n")}`;

  async function onPlay() {
    if (loading) return;
    if (!user && guestExpired) return;
    recordPlay(game.id);
    if (persisted) {
      if (await bumpPlayCount(projectId, viewBump.current)) setPlays((n) => n + 1);
      return;
    }
    setPlays((n) => n + 1);
  }

  async function onLike() {
    if (loading) return;
    if (!persisted || !user) {
      toggleLike(projectId);
      setLiked((v) => !v);
      setLikes((n) => (liked ? Math.max(0, n - 1) : n + 1));
      return;
    }
    const supabase = createClient();
    if (liked) {
      await supabase.from("project_likes").delete().eq("project_id", projectId).eq("user_id", user.id);
      setLiked(false);
      setLikes((n) => Math.max(0, n - 1));
    } else {
      await supabase.from("project_likes").insert({ project_id: projectId, user_id: user.id });
      setLiked(true);
      setLikes((n) => n + 1);
    }
  }

  async function onFollow() {
    if (!persisted || loading) return;
    if (!user) {
      const ids = readLocalFollows();
      const next = following ? ids.filter((id) => id !== project.owner_id) : [...ids, project.owner_id];
      writeLocalFollows(next);
      setFollowers((n) => (following ? Math.max(0, n - 1) : n + 1));
      return;
    }
    if (user.id === project.owner_id) return;
    const supabase = createClient();
    if (following) {
      await supabase.from("profile_follows").delete().eq("creator_id", project.owner_id).eq("follower_id", user.id);
      setRemoteFollowing(false);
      setFollowers((n) => Math.max(0, n - 1));
    } else {
      await supabase.from("profile_follows").insert({ creator_id: project.owner_id, follower_id: user.id });
      setRemoteFollowing(true);
      setFollowers((n) => n + 1);
    }
  }

  async function onShare() {
    // Phones get the system share sheet; desktops copy the link.
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: project.title, url: shareUrl });
        return;
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      window.prompt("Copy link", shareUrl);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const counts = { plays, likes, comments: commentCount };
  const actions = {
    liked,
    likes,
    saved,
    copied,
    onLike: () => void onLike(),
    onSave: () => toggleLibrary(projectId),
    onShare: () => void onShare(),
    onReport: () => setReportOpen(true),
  };

  return (
    <ProjectHeroRoot
      game={game}
      trailerUrl={project.trailer_url}
      autoPlay={autoPlay && game.embeddable && (Boolean(user) || !guestExpired)}
      allowPlay={Boolean(user) || !guestExpired}
      playLocked={!user && guestTimedOut}
      onLoginRequest={() => openLogin(guestLoginOptions())}
      onSignupRequest={() =>
        openSignup({
          description: `Guest play is limited to ${guestPlayLimitLabel()}. Sign up to keep playing.`,
        })
      }
      onReport={() => setReportOpen(true)}
      onDeniedPlay={() => {
        if (!loading) openLogin(guestLoginOptions());
      }}
      onExpandedChange={setPlayerExpanded}
      onPlayingChange={setIsPlaying}
      onPlay={() => {
        if (game.embeddable) void onPlay();
        else if (game.playUrl) {
          void onPlay();
          window.open(game.playUrl, "_blank", "noopener,noreferrer");
        }
      }}
    >
      {/* The HomeShell nav floats over the top 64–80px, so the page starts below it. */}
      <div className="relative">
        <NavBackdrop />
        <div className="px-4 md:px-6">
        <div className="mx-auto w-full max-w-[1440px] pt-[84px] pb-16 md:pt-[100px]">
          {notice ? <div className="mb-4">{notice}</div> : null}
          {/* One grid. Below lg the two columns use display: contents and their blocks are ordered
            for phones; at lg they are real columns. The stage is its own item and never moves:
            wide view only changes how many columns it spans. */}
          <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-x-8">
            <div className={cn("min-w-0 lg:col-start-1 lg:row-start-1", layoutWide && "lg:col-span-2")}>
              <ProjectHeroStage />
              {isPlaying && !user && guestWarned && !guestTimedOut ? (
                <p role="status" className="mt-2 text-pw-body-sm text-pw-warning">
                  Less than 30 seconds of guest play left.{" "}
                  <button
                    type="button"
                    onClick={() => openLogin(guestLoginOptions())}
                    className={cn("rounded-pw-sm font-semibold underline underline-offset-4", focusRing)}
                  >
                    Sign in to keep playing
                  </button>
                </p>
              ) : null}
            </div>

            <div className="min-w-0 max-lg:contents lg:col-start-1 lg:row-start-2 lg:flex lg:flex-col lg:gap-8">
              <div className="max-lg:order-2 min-w-0">
                <ProjectHeroThumbs />
              </div>
              <TitleBlock
                className="max-lg:order-3"
                title={project.title}
                tagline={project.tagline}
                eyebrow={[curated ? "Curated" : null, genre, statusLabel(project.release_status)].filter(Boolean).join(" · ")}
                creatorName={creatorName}
                creatorUrl={creatorUrl}
                creatorExternal={Boolean(curated)}
                avatar={avatar}
                counts={counts}
                tags={tags}
              />
              <AboutBlock className="max-lg:order-6" text={project.description} />
              <div className="max-lg:order-10 min-w-0 lg:pt-2">
                {curated ? (
                  <p className="text-pw-body-sm text-pw-muted">Comments open once the creator claims this game.</p>
                ) : (
                  <ProjectComments
                    projectId={projectId}
                    ownerId={project.owner_id}
                    creatorName={creatorName}
                    enabled={persisted && project.community !== "disabled"}
                    initialCount={project.comment_count ?? 0}
                    onCountChange={onCommentCount}
                  />
                )}
              </div>
            </div>

            <div
              className={cn(
                "min-w-0 max-lg:contents lg:col-start-2 lg:flex lg:flex-col lg:gap-4",
                layoutWide ? "lg:row-start-2" : "lg:row-span-2 lg:row-start-1",
              )}
            >
              <PlayCard className="max-lg:order-5" actions={actions} />
              {curated ? (
                <CuratedCreditCard
                  className="max-lg:order-4"
                  credit={curated}
                  onClaim={() => setClaimOpen(true)}
                  removeHref={removeHref}
                />
              ) : (
                <CreatorCard
                  className="max-lg:order-4"
                  name={creatorName}
                  url={creatorUrl ?? siteOrigin(creator.handle)}
                  avatar={avatar}
                  bio={creator.bio}
                  followers={followers}
                  games={creatorGameCount ?? null}
                  canFollow={persisted && !own}
                  following={following}
                  onFollow={() => void onFollow()}
                />
              )}
              {curated ? null : (
                <div className="max-lg:order-7 min-w-0 empty:hidden">
                  <ProjectCheckout project={project} creatorName={creatorName} />
                </div>
              )}
              <QuickFacts
                className="max-lg:order-8"
                released={project.created_at}
                plays={plays}
                status={project.release_status}
                genre={genre}
                license={curated ? licenseLabel(curated.license) : null}
                runs={
                  game.embeddable
                    ? "In your browser"
                    : project.kind === "downloadable"
                      ? "Download"
                      : game.playUrl
                        ? `On ${playDomain(game.playUrl) || "the creator's site"}`
                        : "—"
                }
              />
              {stores.length > 0 ? <AlsoOn className="max-lg:order-9" stores={stores} /> : null}
            </div>
          </div>

          <Shelves
            games={games}
            current={game}
            creatorName={creatorName}
            creatorUrl={curated ? null : creatorUrl}
          />
        </div>
        </div>
      </div>

      <StickyPlayBar title={project.title} meta={`${creatorName} · ${formatPlays(plays)} plays`} />

      {reportOpen ? (
        <ReportDialog defaultSubject={`Game: ${project.title} (${shareUrl})`} onClose={() => setReportOpen(false)} />
      ) : null}
      {claimOpen ? (
        <ReportDialog
          defaultSubject={`Claim: ${project.title} (${shareUrl})`}
          onClose={() => setClaimOpen(false)}
          copy={{
            title: "Claim this game",
            intro: "Made this game? We will move it to your account, with its plays and likes, and you can edit it, open comments and take donations.",
            detailsPlaceholder: "How can we confirm it is yours? For example a link to your profile or repo, or an email from the address on your game page.",
            submit: "Send claim",
            sent: "Thanks. We will check it and reply to your account email.",
          }}
        />
      ) : null}
    </ProjectHeroRoot>
  );
}

// ---------- blocks ----------

function TitleBlock({
  className,
  title,
  tagline,
  eyebrow,
  creatorName,
  creatorUrl,
  creatorExternal,
  avatar,
  counts,
  tags,
}: {
  className?: string;
  title: string;
  tagline: string;
  eyebrow: string;
  creatorName: string;
  creatorUrl: string | null;
  /** The creator link leaves PlayInWeb (a curated game's original creator). */
  creatorExternal?: boolean;
  avatar?: string;
  counts: { plays: number; likes: number; comments: number };
  tags: string[];
}) {
  const long = title.length > 40;
  return (
    <header className={cn("flex min-w-0 flex-col gap-3", className)}>
      {eyebrow ? (
        <p className="font-pw-pixel text-pw-label tracking-[0.06em] text-pw-highlight-ink uppercase">{eyebrow}</p>
      ) : null}
      <h1
        className={cn(
          "font-pw-display leading-[0.95] font-extrabold text-pw-text uppercase italic [overflow-wrap:anywhere]",
          "drop-shadow-[0_3px_0_color-mix(in_srgb,var(--pw-deep)_70%,transparent)]",
          long ? "text-[clamp(28px,3.6vw,44px)]" : "text-[clamp(32px,4.6vw,56px)]",
        )}
      >
        {title}
      </h1>
      {tagline ? <p className="text-[17px] leading-snug text-pw-text-soft">{tagline}</p> : null}
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-pw-body-sm text-pw-text-soft">
        <span className="inline-flex min-w-0 items-center gap-2">
          <Avatar name={creatorName} src={avatar} size="xs" />
          <span>
            by{" "}
            {creatorUrl ? (
              <Link
                href={creatorUrl}
                {...(creatorExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={cn("rounded-pw-sm font-semibold text-pw-link hover:underline", focusRing)}
              >
                {creatorName}
                {creatorExternal ? <span className="sr-only"> (opens in a new tab)</span> : null}
              </Link>
            ) : (
              <span className="font-semibold text-pw-text">{creatorName}</span>
            )}
          </span>
        </span>
        <Dot />
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <IconGamepad aria-hidden className="size-4 text-pw-muted" />
          {formatPlays(counts.plays)} plays
        </span>
        <Dot />
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <IconHeart aria-hidden className="size-4 text-pw-gold" />
          {formatPlays(counts.likes)}
          <span className="sr-only">likes</span>
        </span>
        <Dot />
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <IconComment aria-hidden className="size-4 text-pw-muted" />
          {formatPlays(counts.comments)}
          <span className="sr-only">comments</span>
        </span>
      </p>
      {tags.length > 0 ? (
        <ul aria-label="Tags" className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li
              key={tag}
              className="inline-flex h-8 items-center rounded-pw-pill border border-pw-line-strong bg-pw-surface-1 px-3.5 text-pw-body-sm font-medium text-pw-text-soft"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-pw-faint">
      ·
    </span>
  );
}

function AboutBlock({ className, text }: { className?: string; text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const body = text.trim() || "No description yet.";

  useEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [body, expanded]);

  return (
    <section aria-labelledby="about-title" className={cn("flex min-w-0 flex-col gap-3", className)}>
      <h2 id="about-title" className="font-pw-display text-[28px] leading-none font-extrabold uppercase italic">
        About the game
      </h2>
      <div
        ref={ref}
        id="about-body"
        className={cn(
          "text-pw-body leading-relaxed break-words whitespace-pre-wrap text-pw-text-soft",
          !expanded && "line-clamp-4",
        )}
      >
        {body}
      </div>
      {overflows || expanded ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="about-body"
          onClick={() => setExpanded((open) => !open)}
          className={cn(
            "inline-flex w-fit items-center gap-1.5 rounded-pw-sm text-pw-body-sm font-semibold text-pw-link hover:underline",
            focusRing,
          )}
        >
          {expanded ? "Show less" : "Show more"}
          <IconChevronDown aria-hidden className={cn("size-4 transition-transform", expanded && "rotate-180")} />
        </button>
      ) : null}
    </section>
  );
}

const card = "rounded-pw-xl border border-pw-line bg-pw-surface-1 p-4";

type Actions = {
  liked: boolean;
  likes: number;
  saved: boolean;
  copied: boolean;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onReport: () => void;
};

function PlayCard({ className, actions }: { className?: string; actions: Actions }) {
  const { game, canPlay, playing, playLocked, startPlay, restart } = useProjectHero();
  const running = playing && game.embeddable && !playLocked;
  const domain = playDomain(game.playUrl);
  return (
    <section aria-label="Play and share" className={cn(card, "flex flex-col gap-3", className)}>
      {canPlay ? (
        <div className="flex flex-col gap-2 max-lg:hidden">
          {running ? (
            <Button variant="secondary" size="lg" className="h-14 w-full text-[17px]" onClick={restart}>
              Restart
            </Button>
          ) : (
            <Button variant="primary" size="lg" className="h-14 w-full text-[17px]" onClick={startPlay}>
              <IconPlay aria-hidden className="fill-current" />
              {game.embeddable ? "Play" : `Play on ${domain || "the creator's site"}`}
              {game.embeddable ? <span className="sr-only"> {game.title}</span> : <IconExternal aria-hidden />}
            </Button>
          )}
          <p className="flex items-center justify-center gap-1.5 text-pw-caption text-pw-muted">
            {running ? (
              <>
                <span aria-hidden className="size-1.5 rounded-full bg-pw-success" />
                Playing now
              </>
            ) : game.embeddable ? (
              <>
                <span aria-hidden className="size-1.5 rounded-full bg-pw-success" />
                Instant play · No download
              </>
            ) : (
              "Opens in a new tab"
            )}
          </p>
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" size="sm" onClick={actions.onSave} aria-pressed={actions.saved}>
          <IconBookmark aria-hidden filled={actions.saved} />
          {actions.saved ? "Saved" : "Save"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={actions.onLike}
          aria-pressed={actions.liked}
          aria-label={`Like, ${actions.likes} likes`}
        >
          <IconHeart aria-hidden className={cn(actions.liked && "text-pw-gold")} />
          <span className="tabular-nums">{formatPlays(actions.likes)}</span>
        </Button>
        <Button variant="secondary" size="sm" onClick={actions.onShare}>
          <IconShare aria-hidden />
          {actions.copied ? "Copied" : "Share"}
        </Button>
      </div>
      <button
        type="button"
        onClick={actions.onReport}
        className={cn(
          "relative mx-auto inline-flex items-center gap-1.5 rounded-pw-sm text-pw-caption font-semibold text-pw-muted hover:text-pw-text",
          focusRing,
        )}
      >
        <IconFlag aria-hidden className="size-3.5" />
        Report
      </button>
    </section>
  );
}

function CreatorCard({
  className,
  name,
  url,
  avatar,
  bio,
  followers,
  games,
  canFollow,
  following,
  onFollow,
}: {
  className?: string;
  name: string;
  url: string;
  avatar?: string;
  bio?: string | null;
  followers: number;
  games: number | null;
  canFollow: boolean;
  following: boolean;
  onFollow: () => void;
}) {
  return (
    <section aria-label="Creator" className={cn(card, "flex flex-col gap-3", className)}>
      <div className="flex items-center gap-3">
        <Avatar name={name} src={avatar} size="lg" />
        <div className="min-w-0 flex-1">
          <Link
            href={url}
            className={cn(
              "block truncate rounded-pw-sm text-pw-body font-bold text-pw-text hover:underline",
              focusRing,
            )}
          >
            {name}
          </Link>
          <p className="truncate text-pw-body-sm text-pw-text-soft tabular-nums">
            {formatPlays(followers)} {followers === 1 ? "follower" : "followers"}
            {games !== null ? (
              <span className="lg:hidden">
                {" "}
                · {games} {games === 1 ? "game" : "games"}
              </span>
            ) : null}
          </p>
        </div>
        {canFollow ? (
          <Button variant={following ? "secondary" : "primary"} size="sm" onClick={onFollow} aria-pressed={following}>
            {following ? "Following" : "Follow"}
          </Button>
        ) : null}
      </div>
      {bio?.trim() ? (
        <p className="line-clamp-3 text-pw-body-sm text-pw-text-soft max-lg:hidden">{bio.trim()}</p>
      ) : null}
      {games !== null && games > 0 ? (
        <Link
          href={url}
          className={cn(
            "flex items-center gap-2 rounded-pw-md bg-pw-surface-2 px-3 py-2.5 text-pw-body-sm font-semibold text-pw-link transition-colors hover:bg-pw-surface-3 max-lg:hidden",
            focusRing,
          )}
        >
          <IconGamepad aria-hidden className="size-4" />
          {games} {games === 1 ? "game" : "games"}
          <IconArrow aria-hidden className="ml-auto size-4" />
        </Link>
      ) : null}
    </section>
  );
}

/** In place of the creator card on a curated game (#9): the credit, and how its creator claims or removes it. */
function CuratedCreditCard({
  className,
  credit,
  onClaim,
  removeHref,
}: {
  className?: string;
  credit: Curation;
  onClaim: () => void;
  removeHref: string;
}) {
  const links = [
    credit.licenseUrl ? { href: credit.licenseUrl, label: licenseLabel(credit.license) } : null,
    credit.sourceCodeUrl ? { href: credit.sourceCodeUrl, label: `Source · ${shortUrl(credit.sourceCodeUrl)}` } : null,
    credit.sourceUrl ? { href: credit.sourceUrl, label: `Original · ${shortUrl(credit.sourceUrl)}` } : null,
  ].filter((link): link is { href: string; label: string } => Boolean(link));
  const external = { target: "_blank", rel: "noopener noreferrer" } as const;

  return (
    <section aria-label="Creator" className={cn(card, "flex flex-col gap-3", className)}>
      <div className="flex items-center gap-3">
        <Avatar name={credit.creatorName} size="lg" />
        <div className="min-w-0 flex-1">
          {credit.creatorUrl ? (
            <a
              href={credit.creatorUrl}
              {...external}
              className={cn("block truncate rounded-pw-sm text-pw-body font-bold text-pw-text hover:underline", focusRing)}
            >
              {credit.creatorName}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <p className="truncate text-pw-body font-bold text-pw-text">{credit.creatorName}</p>
          )}
          <p className="truncate text-pw-body-sm text-pw-text-soft">Not on PlayInWeb yet</p>
        </div>
      </div>
      <p className="text-pw-body-sm text-pw-text-soft">
        {credit.license === "Permission"
          ? "Shared on PlayInWeb with the creator’s permission."
          : "Curated by PlayInWeb under an open license."}
        {credit.modified ? " Modified for PlayInWeb." : ""}
      </p>
      {links.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                {...external}
                className={cn(
                  "group flex items-center gap-2 rounded-pw-md px-2 py-2 text-pw-body-sm font-semibold text-pw-text transition-colors hover:bg-pw-surface-2",
                  focusRing,
                )}
              >
                <span className="min-w-0 truncate">{link.label}</span>
                <IconExternal aria-hidden className="ml-auto size-4 shrink-0 text-pw-muted group-hover:text-pw-text" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {credit.creatorUrl ? (
        <p className="text-pw-caption text-pw-muted">
          This creator hasn&rsquo;t joined PlayInWeb yet, so{" "}
          <a href={credit.creatorUrl} {...external} className={cn("rounded-pw-sm font-semibold text-pw-link hover:underline", focusRing)}>
            support goes straight to them
          </a>
          .
        </p>
      ) : null}
      <div className="flex flex-col gap-2 border-t border-pw-line pt-3">
        <p className="text-pw-body-sm font-semibold text-pw-text">Is this your game?</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" size="sm" onClick={onClaim}>
            Claim it
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <a href={removeHref}>Remove it</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function QuickFacts({
  className,
  released,
  plays,
  status,
  genre,
  license,
  runs,
}: {
  className?: string;
  released: string;
  plays: number;
  status: string;
  genre: string | null;
  /** Shown for curated games (#9). */
  license?: string | null;
  runs: string;
}) {
  const facts: { label: string; value: ReactNode }[] = [
    { label: "Released", value: formatJoined(released) },
    {
      label: "Plays",
      value: <span className="tabular-nums">{formatPlays(plays)}</span>,
    },
    {
      label: "Status",
      value: <Badge tone={STATUS_TONE[status] ?? "neutral"}>{statusLabel(status)}</Badge>,
    },
    { label: "Genre", value: genre ?? "—" },
    { label: "Runs", value: runs },
    ...(license ? [{ label: "License", value: license }] : []),
  ];
  return (
    <section aria-labelledby="facts-title" className={cn(card, "flex flex-col gap-3", className)}>
      <h2 id="facts-title" className="text-pw-body font-bold text-pw-text">
        Quick facts
      </h2>
      <dl className="grid grid-cols-2 gap-2">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0 rounded-pw-md border border-pw-line bg-pw-surface-2 px-3 py-2.5">
            <dt className="text-pw-caption text-pw-muted">{fact.label}</dt>
            <dd className="mt-1 truncate text-pw-body-sm font-semibold text-pw-text">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function AlsoOn({ className, stores }: { className?: string; stores: { store: string; url: string }[] }) {
  return (
    <section aria-labelledby="also-on-title" className={cn(card, "flex flex-col gap-2", className)}>
      <h2 id="also-on-title" className="text-pw-body font-bold text-pw-text">
        Also on
      </h2>
      <ul className="flex flex-col gap-1">
        {stores.map((link) => (
          <li key={link.store}>
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "group flex items-center gap-2 rounded-pw-md px-2 py-2 text-pw-body-sm font-semibold text-pw-text transition-colors hover:bg-pw-surface-2",
                focusRing,
              )}
            >
              <span className="min-w-0 truncate">{STORES.find((s) => s.id === link.store)?.label ?? link.store}</span>
              <IconExternal aria-hidden className="ml-auto size-4 shrink-0 text-pw-muted group-hover:text-pw-text" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- shelves ----------

function Shelves({
  games,
  current,
  creatorName,
  creatorUrl,
}: {
  games: ReturnType<typeof useGames>["games"];
  current: ReturnType<typeof projectToGame>;
  creatorName: string;
  /** Null for a curated game: its creator has no page here. */
  creatorUrl: string | null;
}) {
  // The catalogue loads in the browser after the page. Until it arrives, skeletons hold the space.
  const loadingCatalogue = games.length === 0;
  const more = useMemo(() => moreFromCreator(games, current), [games, current]);
  const similar = useMemo(() => similarGames(games, current), [games, current]);

  return (
    <div className="mt-14 flex flex-col gap-12">
      {loadingCatalogue || more.length > 0 ? (
        <Shelf
          eyebrow="Same creator"
          title={`More from ${creatorName}`}
          link={creatorUrl ? { href: creatorUrl, label: "See all games" } : undefined}
        >
          <ul className="scrollbar-hide -mx-4 flex snap-x gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4">
            {loadingCatalogue
              ? Array.from({ length: 4 }, (_, i) => (
                  <li key={i} className="w-[78vw] shrink-0 snap-start md:w-auto">
                    <GameCardSkeleton variant="wide" />
                  </li>
                ))
              : more.map((g) => (
                  <li key={g.id} className="w-[78vw] shrink-0 snap-start md:w-auto">
                    <GameCard data={toGameCardData(g)} variant="wide" />
                  </li>
                ))}
          </ul>
        </Shelf>
      ) : null}

      {loadingCatalogue || similar.games.length > 0 ? (
        <Shelf
          eyebrow={similar.kind === "similar" ? "If you liked this" : "Players love these"}
          title={similar.kind === "similar" ? "Similar games" : "Popular games"}
          link={{ href: apexHref("/"), label: "Browse games" }}
        >
          <ul className="scrollbar-hide -mx-4 flex snap-x gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-6">
            {loadingCatalogue
              ? Array.from({ length: 6 }, (_, i) => (
                  <li key={i} className="w-[42vw] shrink-0 snap-start md:w-auto">
                    <GameCardSkeleton variant="tall" />
                  </li>
                ))
              : similar.games.map((g) => (
                  <li key={g.id} className="w-[42vw] shrink-0 snap-start md:w-auto">
                    <GameCard data={toGameCardData(g)} variant="tall" />
                  </li>
                ))}
          </ul>
        </Shelf>
      ) : null}
    </div>
  );
}

function Shelf({
  eyebrow,
  title,
  link,
  children,
}: {
  eyebrow: string;
  title: string;
  link?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="font-pw-pixel text-pw-label tracking-[0.06em] text-pw-highlight-ink uppercase">{eyebrow}</p>
          <h2 className="mt-1 truncate font-pw-display text-[28px] leading-none font-extrabold uppercase italic">
            {title}
          </h2>
        </div>
        {link ? (
          <Link
            href={link.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-pw-sm text-pw-body-sm font-semibold text-pw-link hover:underline",
              focusRing,
            )}
          >
            {link.label}
            <IconArrow aria-hidden className="size-4" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

// ---------- sticky play bar (phones) ----------

function StickyPlayBar({ title, meta }: { title: string; meta: string }) {
  const { game, canPlay, playing, startPlay } = useProjectHero();
  const [stageVisible, setStageVisible] = useState(true);

  useEffect(() => {
    const stage = document.getElementById("game-stage");
    if (!stage) return;
    // The page scrolls inside [data-scroll-root]; intersection with the viewport still follows it.
    const observer = new IntersectionObserver(([entry]) => setStageVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  if (!canPlay || playing || stageVisible) return null;

  function play() {
    // The game starts in the stage, so bring it back into view first.
    if (game.embeddable) document.getElementById("game-stage")?.scrollIntoView({ block: "start" });
    startPlay();
  }

  return (
    <div className="fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-40 lg:hidden">
      <div className="flex items-center gap-3 rounded-pw-xl border border-pw-line-strong bg-pw-surface-raised p-2 pr-2.5 shadow-pw-3">
        <div className="relative aspect-square size-12 shrink-0 overflow-hidden rounded-pw-md bg-pw-surface-3">
          {game.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.thumbnailUrl} alt="" className="size-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-pw-display text-[18px] leading-tight font-extrabold uppercase italic">{title}</p>
          <p className="truncate text-pw-caption text-pw-text-soft">{meta}</p>
        </div>
        <Button variant="primary" onClick={play}>
          <IconPlay aria-hidden className="fill-current" />
          Play
          <span className="sr-only"> {title}</span>
        </Button>
      </div>
    </div>
  );
}
