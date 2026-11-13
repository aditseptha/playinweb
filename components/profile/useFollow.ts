"use client";

import { useCallback, useEffect, useState } from "react";
import { useLoginDialog } from "@/components/LoginDialog";
import { useAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

/** Follow state for a creator. Signed-out visitors are asked to sign in first. */
export function useFollow(creatorId: string, initialFollowers: number) {
  const { user, loading } = useAuth();
  const { openLogin } = useLoginDialog();
  const userId = user?.id ?? null;
  // Remembered per viewer, so signing out never shows someone else's state.
  const [remote, setRemote] = useState<{ viewer: string; following: boolean } | null>(null);
  const [followers, setFollowers] = useState(initialFollowers);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId || userId === creatorId) return;
    let live = true;
    void createClient()
      .from("profile_follows")
      .select("creator_id")
      .eq("creator_id", creatorId)
      .eq("follower_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (live) setRemote({ viewer: userId, following: Boolean(data) });
      });
    return () => {
      live = false;
    };
  }, [creatorId, userId]);

  const following = Boolean(userId && remote?.viewer === userId && remote.following);

  const toggle = useCallback(async () => {
    if (loading || busy) return;
    if (!userId) {
      openLogin({ description: "Sign in to follow creators and see their new games." });
      return;
    }
    if (userId === creatorId) return;
    const next = !following;
    setBusy(true);
    setRemote({ viewer: userId, following: next });
    setFollowers((n) => Math.max(0, n + (next ? 1 : -1)));
    const supabase = createClient();
    const { error } = next
      ? await supabase.from("profile_follows").insert({ creator_id: creatorId, follower_id: userId })
      : await supabase.from("profile_follows").delete().eq("creator_id", creatorId).eq("follower_id", userId);
    if (error) {
      setRemote({ viewer: userId, following: !next });
      setFollowers((n) => Math.max(0, n + (next ? -1 : 1)));
    }
    setBusy(false);
  }, [busy, creatorId, following, loading, openLogin, userId]);

  return { following, followers, busy, toggle };
}
