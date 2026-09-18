"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconBell } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { isAdminEmail } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { loadNotices, markNoticesSeen, noticesSeenAt, type Notice } from "@/lib/notices";

export function Notices() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[] | null>(null);
  const [seen, setSeen] = useState("");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSeen(noticesSeenAt());
  }, []);

  useEffect(() => {
    if (!user) {
      setItems(null);
      return;
    }
    let cancelled = false;
    loadNotices(user.id, isAdminEmail(user.email))
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (loading || !user) return null;

  const unread = (items ?? []).filter((row) => !seen || Date.parse(row.at) > Date.parse(seen)).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      markNoticesSeen();
      setSeen(new Date().toISOString());
    }
  }

  return (
    <div ref={root} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={unread ? `${unread} notifications` : "Notifications"}
        aria-expanded={open}
        onClick={toggle}
        className="relative"
      >
        <IconBell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-accent" />
        ) : null}
      </Button>
      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-panel bg-surface shadow-panel"
        >
          <p className="border-b border-border px-4 py-3 text-ui font-medium">Notifications</p>
          {items === null ? (
            <p className="px-4 py-6 text-caption text-text-muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-caption text-text-muted">
              Donations, comments, follows, and payouts show up here.
            </p>
          ) : (
            <ul className="max-h-[min(24rem,70vh)] overflow-y-auto">
              {items.map((row) => (
                <li key={row.id}>
                  <Link
                    href={row.href}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 hover:bg-surface-2"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 text-ui font-medium">{row.title}</span>
                      <span className="shrink-0 text-badge text-text-subtle">{age(row.at)}</span>
                    </span>
                    <span className={cn("mt-0.5 block truncate text-caption text-text-muted")}>{row.detail}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function age(iso: string) {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d`;
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}
