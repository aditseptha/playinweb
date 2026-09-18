"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { fileExt, MEDIA_BUCKET } from "@/lib/media";
import { createClient } from "@/lib/supabase/client";

const AVATAR_MAX = 2 * 1024 * 1024;
const BANNER_MAX = 5 * 1024 * 1024;

export function parseBannerPosition(raw?: string | null) {
  const parts = (raw ?? "50 50").split(/\s+/).map(Number);
  const x = Number.isFinite(parts[0]) ? Math.min(100, Math.max(0, parts[0])) : 50;
  const y = Number.isFinite(parts[1]) ? Math.min(100, Math.max(0, parts[1])) : 50;
  return { x, y };
}

export function formatBannerPosition(x: number, y: number) {
  return `${Math.round(x)} ${Math.round(y)}`;
}

export function useChannelImageUpload() {
  const { user, profile, refresh } = useAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"avatar" | "banner" | null>(null);

  async function save(kind: "avatar" | "banner", file: File, bannerPosition?: string) {
    if (!user || !profile) return false;
    const max = kind === "avatar" ? AVATAR_MAX : BANNER_MAX;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return false;
    }
    if (file.size > max) {
      setError(kind === "avatar" ? "Photo must be under 2 MB." : "Background must be under 5 MB.");
      return false;
    }
    setPending(kind);
    setError("");
    const supabase = createClient();
    const path = `${user.id}/channel/${kind}-${crypto.randomUUID()}.${fileExt(file.name)}`;
    const { error: upError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file);
    if (upError) {
      setPending(null);
      setError(upError.message);
      return false;
    }
    const previous = kind === "avatar" ? profile.avatar_path : profile.banner_path;
    const patch =
      kind === "banner"
        ? { banner_path: path, banner_position: bannerPosition ?? "50 50" }
        : { avatar_path: path };
    const { error: rowError } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (rowError) {
      setPending(null);
      setError(rowError.message);
      return false;
    }
    if (previous) {
      await supabase.storage.from(MEDIA_BUCKET).remove([previous]);
    }
    await refresh();
    setPending(null);
    return true;
  }

  function onPick(kind: "avatar" | "banner", file?: File) {
    if (file) void save(kind, file);
  }

  async function saveBannerPosition(position: string) {
    if (!user) return false;
    setPending("banner");
    setError("");
    const { error: rowError } = await createClient()
      .from("profiles")
      .update({ banner_position: position })
      .eq("id", user.id);
    if (rowError) {
      setPending(null);
      setError(rowError.message);
      return false;
    }
    await refresh();
    setPending(null);
    return true;
  }

  async function remove(kind: "avatar" | "banner") {
    if (!user || !profile) return;
    const previous = kind === "avatar" ? profile.avatar_path : profile.banner_path;
    if (!previous) return;
    setPending(kind);
    setError("");
    const supabase = createClient();
    const { error: rowError } = await supabase
      .from("profiles")
      .update(kind === "avatar" ? { avatar_path: null } : { banner_path: null })
      .eq("id", user.id);
    if (rowError) {
      setPending(null);
      setError(rowError.message);
      return;
    }
    await supabase.storage.from(MEDIA_BUCKET).remove([previous]);
    await refresh();
    setPending(null);
  }

  return { pending, error, onPick, save, saveBannerPosition, remove, canUpload: Boolean(user && profile) };
}
