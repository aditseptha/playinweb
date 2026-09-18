"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { ProjectAside } from "@/components/ProjectAside";
import { ProjectComments } from "@/components/ProjectComments";
import { ProjectHeroRoot, ProjectHeroStage, ProjectHeroThumbs } from "@/components/ProjectHero";
import { IconBookmark, IconShare, IconThumbDown, IconThumbUp } from "@/components/icons";
import { Button, LinkButton } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatPlays } from "@/lib/format";
import { apexHref, projectPublicUrl, siteOrigin } from "@/lib/host";
import { cachedAvatarUrl } from "@/lib/media";
import { isPersistedId, projectToGame, type ProjectRecord } from "@/lib/projects";
import { claimSessionStat, releaseSessionStat } from "@/lib/session-stat";
import { relatedGames, useGames } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

const LOCAL_FOLLOWS_KEY = "showcase.follows.v1";

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
}

function goToLoginForPlay() {
  const next = new URL(window.location.href);
  next.searchParams.set("play", "1");
  window.location.assign(`${apexHref("/login")}?next=${encodeURIComponent(next.href)}`);
}

export function GameDetail({ project }: { project: ProjectRecord }) {
  const searchParams = useSearchParams();
  const { games, recordPlay, liked: localLiked, toggleLike, library, toggleLibrary } = useGames();
  const { user, loading } = useAuth();
  const persisted = isPersistedId(project.id) && Boolean(project.owner_id);
  const game = projectToGame(project);
  const creator = project.profiles;
  const projectId = project.id;
  const autoPlay = searchParams.get("play") === "1";
  const [liked, setLiked] = useState(!!localLiked[projectId]);
  const [likes, setLikes] = useState(project.like_count);
  const views = project.view_count ?? 0;
  const [plays, setPlays] = useState(Math.min(project.play_count, views));
  const [followers, setFollowers] = useState(project.profiles?.follower_count ?? 0);
  const [following, setFollowing] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(autoPlay);
  const [disliked, setDisliked] = useState(false);
  const [copied, setCopied] = useState(false);
  const autoPlayed = useRef(false);
  const viewBump = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!persisted) return;
    if (!user) {
      setFollowing(readLocalFollows().includes(project.owner_id));
      return;
    }
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
      .then(({ data }) => setFollowing(!!data));
  }, [persisted, user, projectId, project.owner_id]);

  useEffect(() => {
    if (!persisted) return;
    if (!claimSessionStat("viewed", projectId)) return;
    viewBump.current = (async () => {
      const { error } = await createClient().rpc("bump_view_count", { pid: projectId });
      if (error) releaseSessionStat("viewed", projectId);
    })();
  }, [persisted, projectId]);

  useEffect(() => {
    if (!autoPlay || loading) return;
    if (!user) {
      goToLoginForPlay();
      return;
    }
    if (autoPlayed.current) return;
    autoPlayed.current = true;
    recordPlay(projectId);
    if (persisted) void countPersistedPlay();
    else setPlays((n) => n + 1);
    window.history.replaceState(null, "", window.location.pathname);
  }, [autoPlay, loading, persisted, projectId, recordPlay, user]);

  if (!creator) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-heading font-semibold">Game not found</h1>
        <LinkButton href="/" variant="primary" className="mt-6">
          Back to catalogue
        </LinkButton>
      </div>
    );
  }

  const tags = [
    ...(project.project_tags ?? []).map((t) => t.tag),
    project.genre && project.genre !== "No genre" ? project.genre : "",
  ].filter(Boolean);
  const moreGames = useMemo(() => relatedGames(games, game, games.length), [games, game]);

  async function countPersistedPlay() {
    if (!claimSessionStat("played", projectId)) return;
    await viewBump.current;
    const { error } = await createClient().rpc("bump_play_count", { pid: projectId });
    if (error) {
      releaseSessionStat("played", projectId);
      return;
    }
    setPlays((n) => n + 1);
  }

  async function onPlay() {
    if (loading || !user) return;
    recordPlay(game.id);
    if (persisted) {
      await countPersistedPlay();
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
      if (!liked) setDisliked(false);
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
      setDisliked(false);
      setLikes((n) => n + 1);
    }
  }

  async function onDislike() {
    if (persisted && !user && !loading) {
      window.location.assign(`${apexHref("/login")}?next=${encodeURIComponent(window.location.href)}`);
      return;
    }
    if (liked) await onLike();
    setDisliked((v) => !v);
  }

  async function onFollow() {
    if (!persisted || loading) return;
    if (!user) {
      const ids = readLocalFollows();
      const next = following ? ids.filter((id) => id !== project.owner_id) : [...ids, project.owner_id];
      writeLocalFollows(next);
      setFollowing(!following);
      setFollowers((n) => (following ? Math.max(0, n - 1) : n + 1));
      return;
    }
    if (user.id === project.owner_id) return;
    const supabase = createClient();
    if (following) {
      await supabase.from("profile_follows").delete().eq("creator_id", project.owner_id).eq("follower_id", user.id);
      setFollowing(false);
      setFollowers((n) => Math.max(0, n - 1));
    } else {
      await supabase.from("profile_follows").insert({ creator_id: project.owner_id, follower_id: user.id });
      setFollowing(true);
      setFollowers((n) => n + 1);
    }
  }

  async function onShare() {
    const url =
      persisted && creator?.handle && project.slug
        ? projectPublicUrl(creator.handle, project.slug)
        : `${window.location.origin}/game/${projectId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy link", url);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <ProjectHeroRoot
      game={game}
      trailerUrl={project.trailer_url}
      tags={tags}
      playLabel={game.embeddable ? "Play" : game.playUrl ? "Play in new tab" : undefined}
      liked={liked}
      autoPlay={Boolean(user) && autoPlay && game.embeddable}
      allowPlay={Boolean(user)}
      onDeniedPlay={() => {
        if (!loading) goToLoginForPlay();
      }}
      onExpandedChange={setPlayerOpen}
      onPlay={() => {
        if (game.embeddable) void onPlay();
        else if (game.playUrl) {
          void onPlay();
          window.open(game.playUrl, "_blank", "noopener,noreferrer");
        }
      }}
      onLike={() => void onLike()}
    >
      <div
        className={cn(
          "mx-auto grid min-w-0 max-w-[1360px] items-start lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-x-8",
          "duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-safe:transition-[row-gap]",
          playerOpen ? "gap-y-8" : "gap-y-2",
        )}
      >
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <div
            className={cn(
              "relative z-10 min-w-0 w-full origin-top duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-safe:transition-[width]",
              playerOpen && "lg:w-[calc(100%+312px)]",
            )}
          >
            <ProjectHeroStage />
          </div>
        </div>

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <ProjectHeroThumbs />
          <h1 className="mt-6 text-display font-semibold">{project.title}</h1>
          <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link href={siteOrigin(creator.handle)} className="rounded-lg">
                <Avatar
                  name={creator.display_name}
                  src={cachedAvatarUrl(project.owner_id, creator.avatar_path) || undefined}
                  size={40}
                />
              </Link>
              <div className="min-w-0">
                <Link href={siteOrigin(creator.handle)} className="block truncate text-ui font-medium hover:text-text-muted">
                  {creator.display_name}
                </Link>
                <p className="text-caption text-text-subtle">
                  {formatPlays(followers)} {followers === 1 ? "follower" : "followers"}
                </p>
              </div>
              {persisted ? (
                <Button variant={following ? "secondary" : "primary"} size="sm" onClick={() => void onFollow()}>
                  {following ? "Following" : "Follow"}
                </Button>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toggleLibrary(projectId)}
                aria-pressed={library.includes(projectId)}
                aria-label={library.includes(projectId) ? "Remove from library" : "Save to library"}
              >
                <IconBookmark className="h-3.5 w-3.5" filled={library.includes(projectId)} />
                {library.includes(projectId) ? "Saved" : "Save"}
              </Button>
              <div className="flex overflow-hidden rounded-lg bg-surface-2">
                <button
                  type="button"
                  onClick={() => void onLike()}
                  className="inline-flex h-8 items-center gap-1.5 px-3 text-ui font-medium hover:bg-surface-3"
                  aria-pressed={liked}
                  aria-label="Like"
                >
                  <IconThumbUp className="h-3.5 w-3.5" filled={liked} />
                  {formatPlays(likes)}
                </button>
                <span className="w-px self-stretch bg-border" />
                <button
                  type="button"
                  onClick={() => void onDislike()}
                  className="inline-flex h-8 items-center px-2.5 text-ui hover:bg-surface-3"
                  aria-pressed={disliked}
                  aria-label="Dislike"
                >
                  <IconThumbDown className="h-3.5 w-3.5" filled={disliked} />
                </button>
              </div>
              <Button variant="secondary" size="sm" onClick={() => void onShare()}>
                <IconShare className="h-3.5 w-3.5" />
                {copied ? "Copied" : "Share"}
              </Button>
            </div>
          </div>
          {project.tagline ? <p className="mt-3 text-body text-text-muted">{project.tagline}</p> : null}
          <div className="mt-4 min-w-0 whitespace-pre-wrap text-body leading-relaxed text-text-muted">
            {project.description || "No description yet."}
          </div>
          <ProjectComments projectId={projectId} enabled={persisted && project.community !== "disabled"} />
        </div>

        <ProjectAside
          project={project}
          plays={plays}
          moreGames={moreGames}
          className={cn(
            "lg:col-start-2 lg:sticky lg:top-0 lg:self-start",
            playerOpen ? "lg:row-start-2" : "lg:row-start-1 lg:row-span-2",
          )}
        />
      </div>
    </ProjectHeroRoot>
  );
}
