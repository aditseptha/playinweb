"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isCreatorHost, pullApexSession } from "@/lib/auth-bridge";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type AuthValue = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (id: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
    setProfile(data);
  }, []);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const next = data.user ?? null;
    setUser(next);
    if (next) await loadProfile(next.id);
    else setProfile(null);
  }, [loadProfile]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let booting = true;

    function apply(session: Session | null) {
      const next = session?.user ?? null;
      setUser(next);
      if (next) void loadProfile(next.id);
      else setProfile(null);
      setLoading(false);
    }

    async function boot() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.user) {
        apply(data.session);
        booting = false;
        return;
      }
      if (isCreatorHost()) {
        const tokens = await pullApexSession();
        if (cancelled) return;
        if (tokens) {
          const { data: next } = await supabase.auth.setSession(tokens);
          if (!cancelled) apply(next.session);
          booting = false;
          return;
        }
      }
      if (!cancelled) apply(null);
      booting = false;
    }

    void boot();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (booting && event === "INITIAL_SESSION") return;
      apply(session);
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, refresh, signOut }),
    [user, profile, loading, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
