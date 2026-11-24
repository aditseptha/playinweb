"use client";

import { useEffect, useMemo, useState } from "react";
import { TallCard } from "@/components/home/cards";
import { Row } from "@/components/home/Section";
import { IconTrophy } from "@/components/icons";
import { BEST_OF_ROW_MIN, BEST_OF_SLUG, isNewAward } from "@/lib/awards";
import { createClient } from "@/lib/supabase/client";
import type { Game } from "@/lib/types";

type Winner = { projectId: string; awardedAt: string };

/** Games holding Best of PlayInWeb, newest award first. Empty until loaded, or if the awards tables are not there yet. */
function useBestOfWinners() {
  const [winners, setWinners] = useState<Winner[]>([]);
  useEffect(() => {
    let cancelled = false;
    void createClient()
      .from("award_grants")
      .select("project_id, awarded_at")
      .eq("award_slug", BEST_OF_SLUG)
      .is("revoked_at", null)
      .order("awarded_at", { ascending: false })
      .limit(24)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setWinners(data.map((r) => ({ projectId: r.project_id, awardedAt: r.awarded_at })));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return winners;
}

/**
 * The homepage "Best of PlayInWeb" row (#30): games the PlayInWeb team gave the award to, newest first,
 * with a NEW tag for the first 30 days. Stays hidden until at least three games hold it.
 */
export function BestOfRow({ catalogue }: { catalogue: Game[] }) {
  const winners = useBestOfWinners();
  const games = useMemo(() => {
    const byId = new Map(catalogue.map((g) => [g.id, g]));
    return winners.flatMap((w) => {
      const game = byId.get(w.projectId);
      return game ? [{ game, isNew: isNewAward(w.awardedAt) }] : [];
    });
  }, [catalogue, winners]);
  if (games.length < BEST_OF_ROW_MIN) return null;
  return (
    <Row icon={IconTrophy} title="Best of PlayInWeb" kind="tall">
      {games.slice(0, 12).map(({ game, isNew }, i) => (
        <TallCard key={game.id} game={game} i={i} badge={isNew ? "new" : null} />
      ))}
    </Row>
  );
}
