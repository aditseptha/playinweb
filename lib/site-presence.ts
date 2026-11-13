"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export const SITE_PRESENCE_CHANNEL = "site-presence";

type PresenceChannel = {
  presenceState: () => Record<string, unknown>;
};

type PresenceRuntime = {
  channel: PresenceChannel;
  removeChannel: () => void;
  listeners: Set<(count: number) => void>;
  count: number;
};

let runtime: PresenceRuntime | null = null;

function presenceCount(channel: PresenceChannel) {
  return Object.keys(channel.presenceState()).length;
}

function broadcast() {
  const state = runtime;
  if (!state) return;
  state.count = presenceCount(state.channel);
  state.listeners.forEach((listener) => listener(state.count));
}

function ensurePresenceChannel() {
  if (runtime) return;

  const supabase = createClient();
  const key =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const channel = supabase.channel(SITE_PRESENCE_CHANNEL, {
    config: { presence: { key } },
  });

  runtime = {
    channel,
    removeChannel: () => {
      void supabase.removeChannel(channel);
    },
    listeners: new Set(),
    count: 0,
  };

  channel.on("presence", { event: "sync" }, broadcast);
  channel.subscribe(async (status) => {
    if (status !== "SUBSCRIBED") return;
    await channel.track({ at: Date.now() });
    broadcast();
  });
}

function subscribePresence(listener: (count: number) => void) {
  ensurePresenceChannel();
  runtime!.listeners.add(listener);
  listener(runtime!.count);
  return () => {
    if (!runtime) return;
    runtime.listeners.delete(listener);
    if (runtime.listeners.size === 0) {
      runtime.removeChannel();
      runtime = null;
    }
  };
}

/** Live count of tabs connected on `site-presence` (one shared channel per page lifetime). */
export function useSiteOnlineCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => subscribePresence(setCount), []);

  return count;
}
