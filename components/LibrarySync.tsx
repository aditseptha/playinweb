"use client";

// Keeps a signed-in player's Library on their account (#38), so a game saved on a phone is there on
// the computer. Renders nothing. lib/library.ts holds the merge rules.
//
// It sits inside AuthProvider, which sits inside GamesProvider (app/layout.tsx), so it can read both
// the player and the browser's Library.
import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { libraryChanges, libraryOnSignIn } from "@/lib/library";
import { useGames } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

// Which player last synced the Library on this device. Their next sign-in here trusts the account
// instead of merging the browser's copy back in.
const SYNCED_KEY = "playinweb.library-synced-user";

function readSyncedUser() {
  try {
    return localStorage.getItem(SYNCED_KEY);
  } catch {
    return null;
  }
}

function writeSyncedUser(id: string) {
  try {
    localStorage.setItem(SYNCED_KEY, id);
  } catch {
    // Private mode: the next sign-in merges again, which loses nothing.
  }
}

export function LibrarySync() {
  const { user } = useAuth();
  const { library, setLibrary } = useGames();
  const userId = user?.id ?? null;
  // What the account holds, as far as this page knows. Null until the sign-in sync has finished, so
  // changes made before then are folded into that sync instead of being sent twice.
  const synced = useRef<string[] | null>(null);
  const latest = useRef(library);
  useEffect(() => {
    latest.current = library;
  }, [library]);

  // Signing in (or switching player): read the account's Library and merge it with this browser's.
  useEffect(() => {
    synced.current = null;
    if (!userId) return;
    let cancelled = false;
    const supabase = createClient();
    void (async () => {
      const { data, error } = await supabase
        .from("library_items")
        .select("project_id")
        .order("created_at", { ascending: true });
      // Before the migration runs (or offline), the Library simply stays in the browser.
      if (cancelled || error || !data) return;
      const { library: merged, upload } = libraryOnSignIn({
        local: latest.current,
        remote: data.map((row) => row.project_id),
        firstOnDevice: readSyncedUser() !== userId,
      });
      // One at a time: a game deleted since it was saved would fail a batch for all the others.
      await Promise.all(
        upload.map((id) => supabase.from("library_items").insert({ user_id: userId, project_id: id })),
      );
      if (cancelled) return;
      writeSyncedUser(userId);
      synced.current = merged;
      setLibrary(merged);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, setLibrary]);

  // Saving or removing a game while signed in goes to the account too.
  useEffect(() => {
    const before = synced.current;
    if (!userId || !before) return;
    const { added, removed } = libraryChanges(before, library);
    synced.current = library;
    if (!added.length && !removed.length) return;
    const supabase = createClient();
    for (const id of added) void supabase.from("library_items").insert({ user_id: userId, project_id: id });
    if (removed.length) void supabase.from("library_items").delete().eq("user_id", userId).in("project_id", removed);
  }, [library, userId]);

  return null;
}
