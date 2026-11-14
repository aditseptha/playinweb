"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Illustration } from "@/components/ds/illustration";
import { Skeleton } from "@/components/ds/skeleton";
import s from "@/components/home/home.module.css";
import { IconBell, IconCoin, IconComment, IconFlag, IconHeart, IconUsers, IconWallet, type AppIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { isAdminEmail } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { startNavigation } from "@/lib/nav-progress";
import { loadNotices, markNoticesSeen, noticesSeenAt, type Notice } from "@/lib/notices";

const KIND_ICON: Record<string, AppIcon> = {
  donation: IconCoin,
  comment: IconComment,
  follow: IconUsers,
  payout: IconWallet,
  tip: IconHeart,
  report: IconFlag,
};

function appPath(href: string) {
  try {
    const url = new URL(href, window.location.href);
    if (url.origin === window.location.origin) return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    /* leave external links to the browser */
  }
  return null;
}

export function Notices() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[] | null>(null);
  // Lazy read is hydration-safe: nothing renders until auth finishes loading on the client.
  const [seen, setSeen] = useState(noticesSeenAt);
  const root = useRef<HTMLDivElement>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [prevUser, setPrevUser] = useState(user);

  if (user !== prevUser) {
    setPrevUser(user);
    if (!user) setItems(null);
  }

  useEffect(() => {
    if (!user) return;
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
      const cutoff = seen;
      setFresh(
        new Set(
          (items ?? [])
            .filter((row) => !cutoff || Date.parse(row.at) > Date.parse(cutoff))
            .map((row) => row.id),
        ),
      );
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
        {unread > 0 ? <span className={s.noticeBadge} /> : null}
      </Button>
      {open ? (
        <div role="dialog" aria-label="Notifications" className={s.noticePop}>
          <div className={s.noticeHead}>
            <b>Notifications</b>
            {fresh.size > 0 ? <small>{fresh.size} new</small> : null}
          </div>
          {items === null ? (
            <div className={s.noticeList} role="status" aria-label="Loading notifications">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="mb-2 h-14 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className={s.noticeEmpty}>
              <Illustration name="no-notifications" size="s" />
              <b>No notifications yet</b>
              <span>Donations, comments, follows, and payouts show up here.</span>
            </div>
          ) : (
            <ul className={s.noticeList}>
              {items.map((row) => {
                const Icon = KIND_ICON[row.id.split(":")[0]] ?? IconBell;
                return (
                  <li key={row.id}>
                    <Link
                      href={row.href}
                      onClick={(event) => {
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                        const path = appPath(row.href);
                        if (!path) return;
                        event.preventDefault();
                        setOpen(false);
                        startNavigation(path);
                        router.push(path);
                      }}
                      className={cn(s.noticeItem, fresh.has(row.id) && s.noticeFresh)}
                    >
                      <span className={s.noticeIcon}>
                        <Icon />
                      </span>
                      <span className={s.noticeCopy}>
                        <span className={s.noticeTitle}>{row.title}</span>
                        <span className={s.noticeDetail}>{row.detail}</span>
                      </span>
                      <span className={s.noticeWhen}>{age(row.at)}</span>
                    </Link>
                  </li>
                );
              })}
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
