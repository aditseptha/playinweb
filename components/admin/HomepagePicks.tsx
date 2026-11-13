"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { asGames, type AdminGame } from "@/components/admin/shared";
import { CURATED_HANDLE } from "@/lib/curation";
import { formatPlays } from "@/lib/format";
import { FEATURED_GAMES_MAX } from "@/lib/featured-games";
import { HERO_SPOTLIGHT_MAX } from "@/lib/hero-spotlights";
import { createClient } from "@/lib/supabase/client";

type PickTarget = "hero" | "featured";

function OrderPanel({
  title,
  ids,
  byId,
  max,
  onRemove,
  onMove,
  onClear,
}: {
  title: string;
  ids: string[];
  byId: Map<string, AdminGame>;
  max: number;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-panel border border-border bg-surface-2 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-ui font-semibold">{title}</h3>
        <span className="tnum text-caption text-text-subtle">
          {ids.length}/{max}
        </span>
      </div>
      {ids.length === 0 ? (
        <p className="mt-3 text-ui text-text-muted">No games selected.</p>
      ) : (
        <ul className="mt-3 max-h-[22rem] space-y-2 overflow-y-auto">
          {ids.map((id, index) => {
            const game = byId.get(id);
            return (
              <li key={id} className="flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 py-2">
                <span className="tnum w-6 text-caption text-text-subtle">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-ui font-medium">{game?.title ?? id}</span>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-caption hover:bg-surface-2"
                    disabled={index === 0}
                    onClick={() => onMove(id, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-caption hover:bg-surface-2"
                    disabled={index === ids.length - 1}
                    onClick={() => onMove(id, 1)}
                  >
                    Down
                  </button>
                  <button type="button" className="rounded-md px-2 py-1 text-caption text-danger hover:bg-surface-2" onClick={() => onRemove(id)}>
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        className="mt-4 rounded-pill border border-border px-3 py-1.5 text-caption font-medium"
        disabled={ids.length === 0}
        onClick={onClear}
      >
        Clear {title.toLowerCase()}
      </button>
    </div>
  );
}

/** One admin screen for hero carousel + featured row (shared game pool). */
export function HomepagePicks(_props: { games: AdminGame[] | null }) {
  const [heroOrder, setHeroOrder] = useState<string[]>([]);
  const [featuredOrder, setFeaturedOrder] = useState<string[]>([]);
  const [addTarget, setAddTarget] = useState<PickTarget>("hero");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pool, setPool] = useState<AdminGame[]>([]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void supabase
      .from("projects")
      .select(
        "id, title, slug, published, created_at, view_count, play_count, profiles!projects_owner_id_fkey ( handle, display_name )",
      )
      .eq("published", true)
      .order("play_count", { ascending: false })
      .limit(500)
      .then(({ data, error: loadErr }) => {
        if (cancelled) return;
        if (!loadErr && data) setPool(asGames(data));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const eligible = useMemo(
    () => [...pool].sort((a, b) => b.play_count - a.play_count || a.title.localeCompare(b.title)),
    [pool],
  );

  const byId = useMemo(() => new Map(eligible.map((g) => [g.id, g])), [eligible]);
  const eligibleIds = useMemo(() => new Set(eligible.map((g) => g.id)), [eligible]);

  const pickList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter((g) => {
      const hay = [g.title, g.slug, g.handle ?? "", g.display_name ?? ""].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [eligible, search]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void (async () => {
      const [heroRes, featuredRes] = await Promise.all([
        supabase.from("home_hero_spotlights").select("project_id").order("sort_order", { ascending: true }),
        supabase.from("home_featured_games").select("project_id").order("sort_order", { ascending: true }),
      ]);
      if (cancelled) return;
      const errors = [heroRes.error, featuredRes.error].filter(Boolean);
      if (errors.length) {
        const msg = errors.map((e) => e!.message).join(" ");
        if (/home_hero_spotlights|home_featured_games|42P01|PGRST205/i.test(msg)) {
          setError(
            "Homepage picks need migrations 20261110150000_home_hero_spotlights.sql and 20261110170000_home_featured_games.sql.",
          );
        } else {
          setError(msg);
        }
        setHeroOrder([]);
        setFeaturedOrder([]);
      } else {
        setError("");
        setHeroOrder((heroRes.data ?? []).map((row) => row.project_id));
        setFeaturedOrder((featuredRes.data ?? []).map((row) => row.project_id));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Drop picks that are unpublished or no longer in the published catalogue.
  const [prevPickPool, setPrevPickPool] = useState<string | null>(null);
  const pickPoolKey = loading ? null : [...eligibleIds].sort().join(",");
  if (!loading && pickPoolKey !== null && pickPoolKey !== prevPickPool) {
    setPrevPickPool(pickPoolKey);
    setHeroOrder((prev) => {
      const next = prev.filter((id) => eligibleIds.has(id));
      return next.length === prev.length ? prev : next;
    });
    setFeaturedOrder((prev) => {
      const next = prev.filter((id) => eligibleIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }
  if (loading && prevPickPool !== null) setPrevPickPool(null);

  const move = useCallback((setter: Dispatch<SetStateAction<string[]>>, id: string, dir: -1 | 1) => {
    setter((prev) => {
      const i = prev.indexOf(id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setMessage("");
  }, []);

  function add(id: string) {
    const list = addTarget === "hero" ? heroOrder : featuredOrder;
    const max = addTarget === "hero" ? HERO_SPOTLIGHT_MAX : FEATURED_GAMES_MAX;
    const setter = addTarget === "hero" ? setHeroOrder : setFeaturedOrder;
    if (list.includes(id) || list.length >= max) return;
    setter((prev) => [...prev, id]);
    setMessage("");
  }

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    const supabase = createClient();
    const [heroRes, featuredRes] = await Promise.all([
      supabase.rpc("admin_set_home_hero_spotlights", { p_project_ids: heroOrder }),
      supabase.rpc("admin_set_home_featured_games", { p_project_ids: featuredOrder }),
    ]);
    setSaving(false);
    if (heroRes.error || featuredRes.error) {
      const parts = [...new Set([heroRes.error?.message, featuredRes.error?.message].filter(Boolean))];
      setError(parts.join(" ") || "Save failed.");
      return;
    }
    await fetch("/api/admin/revalidate-home", { method: "POST" });
    setMessage("Homepage hero and featured row saved. Refresh the home page to see changes.");
  }

  if (loading) return <p className="mt-8 text-ui text-text-muted">Loading homepage picks…</p>;

  return (
    <section className="mt-8 min-w-0">
      <h2 className="text-title font-semibold tracking-tight">Homepage picks</h2>
      <p className="mt-1 max-w-3xl text-ui text-text-muted">
        Choose games for the <strong>hero carousel</strong> (top banner) and the <strong>Featured games</strong> shelf
        below it. The same game can appear in both. Creator and curated games are allowed. Empty lists fall back to
        most played creator games.
      </p>
      {error ? <p className="mt-4 text-ui text-danger">{error}</p> : null}
      {message ? <p className="mt-4 text-ui text-text-muted">{message}</p> : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <OrderPanel
          title="Hero carousel"
          ids={heroOrder}
          byId={byId}
          max={HERO_SPOTLIGHT_MAX}
          onRemove={(id) => setHeroOrder((p) => p.filter((x) => x !== id))}
          onMove={(id, dir) => move(setHeroOrder, id, dir)}
          onClear={() => setHeroOrder([])}
        />
        <OrderPanel
          title="Featured row"
          ids={featuredOrder}
          byId={byId}
          max={FEATURED_GAMES_MAX}
          onRemove={(id) => setFeaturedOrder((p) => p.filter((x) => x !== id))}
          onMove={(id, dir) => move(setFeaturedOrder, id, dir)}
          onClear={() => setFeaturedOrder([])}
        />
        <div className="rounded-panel border border-border bg-surface-2 p-4">
          <h3 className="text-ui font-semibold">Add a game</h3>
          <p className="mt-1 text-caption text-text-subtle">All published games — one shared list.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-pill px-3 py-1.5 text-caption font-medium ${addTarget === "hero" ? "bg-primary text-white" : "border border-border"}`}
              onClick={() => setAddTarget("hero")}
            >
              → Hero
            </button>
            <button
              type="button"
              className={`rounded-pill px-3 py-1.5 text-caption font-medium ${addTarget === "featured" ? "bg-primary text-white" : "border border-border"}`}
              onClick={() => setAddTarget("featured")}
            >
              → Featured
            </button>
          </div>
          <label className="mt-3 block">
            <span className="sr-only">Search games</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, slug, or creator"
              className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-ui text-text placeholder:text-text-subtle"
              enterKeyHint="search"
            />
          </label>
          <ul className="mt-3 max-h-[22rem] space-y-1 overflow-y-auto">
            {eligible.length === 0 ? (
              <li className="text-ui text-text-muted">No published games.</li>
            ) : pickList.length === 0 ? (
              <li className="text-ui text-text-muted">No games match your search.</li>
            ) : (
              pickList.map((g) => {
                const inHero = heroOrder.includes(g.id);
                const inFeatured = featuredOrder.includes(g.id);
                const targetFull =
                  addTarget === "hero"
                    ? heroOrder.length >= HERO_SPOTLIGHT_MAX && !inHero
                    : featuredOrder.length >= FEATURED_GAMES_MAX && !inFeatured;
                const inTarget = addTarget === "hero" ? inHero : inFeatured;
                const curated = g.handle === CURATED_HANDLE;
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      disabled={inTarget || targetFull}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-ui hover:bg-surface-1 disabled:opacity-45"
                      onClick={() => add(g.id)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {g.title}
                          {curated ? (
                            <span className="ml-1.5 text-caption font-semibold text-text-subtle uppercase">Curated</span>
                          ) : null}
                        </span>
                        {(inHero || inFeatured) && (
                          <span className="mt-0.5 block text-caption text-text-subtle">
                            {inHero ? "Hero" : null}
                            {inHero && inFeatured ? " · " : null}
                            {inFeatured ? "Featured" : null}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-caption text-text-subtle">{formatPlays(g.play_count)}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>

      <button
        type="button"
        className="mt-6 rounded-pill bg-primary px-5 py-2.5 text-ui font-semibold text-white disabled:opacity-50"
        disabled={saving}
        onClick={() => void save()}
      >
        {saving ? "Saving…" : "Save homepage"}
      </button>
    </section>
  );
}
