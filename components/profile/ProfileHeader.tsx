"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ds/button";
import { IconCalendar, IconCheck, IconCopy, IconPencil, IconPlus, IconShare, IconUser } from "@/components/icons";
import { cn } from "@/lib/cn";
import { formatJoined, formatPlays, initials } from "@/lib/format";
import { apexHref } from "@/lib/host";
import { canOptimizeImage } from "@/lib/optimize-image";

// Profile header from the "Explore B" design (#30): a card with a gold-ringed avatar, the name in
// the display face, @handle and join date, Follow and Share, the bio, and Copy profile link.

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function ProfileAvatar({ name, src }: { name: string; src?: string }) {
  return (
    <span className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-pw-xl bg-pw-surface-2 ring-[3px] ring-pw-highlight ring-offset-4 ring-offset-pw-surface-1 sm:size-32">
      {src ? (
        canOptimizeImage(src) ? (
          <Image src={src} alt="" fill sizes="128px" className="object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="size-full object-cover" />
        )
      ) : name.trim() ? (
        <span className="font-pw-display text-pw-display-m font-extrabold italic text-pw-text-soft">{initials(name)}</span>
      ) : (
        <IconUser aria-hidden className="size-10 text-pw-muted" />
      )}
    </span>
  );
}

export function ProfileHeader({
  name,
  handle,
  bio,
  joinedAt,
  avatarUrl,
  bannerUrl,
  profileUrl,
  isOwner,
  following,
  followBusy,
  onFollow,
}: {
  name: string;
  handle: string;
  bio: string;
  joinedAt: string;
  avatarUrl?: string;
  bannerUrl?: string;
  profileUrl: string;
  isOwner: boolean;
  following: boolean;
  followBusy: boolean;
  onFollow: () => void;
}) {
  const [copied, setCopied] = useState<"link" | "share" | null>(null);
  const joined = formatJoined(joinedAt);

  async function onCopy(kind: "link" | "share") {
    if (await copyText(profileUrl)) {
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    }
  }

  async function onShare() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${name} on PlayInWeb`, url: profileUrl });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    await onCopy("share");
  }

  return (
    <section className="relative overflow-hidden rounded-pw-lg border border-pw-line bg-pw-surface-1">
      {bannerUrl ? (
        <div aria-hidden className="absolute inset-0">
          {canOptimizeImage(bannerUrl) ? (
            <Image src={bannerUrl} alt="" fill sizes="(min-width: 1440px) 1440px, 100vw" className="object-cover opacity-30" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerUrl} alt="" className="size-full object-cover opacity-30" />
          )}
          <div className="absolute inset-0 bg-linear-to-r from-pw-surface-1 via-pw-surface-1/85 to-pw-surface-1/40" />
        </div>
      ) : null}

      <div className="relative flex flex-col gap-6 p-5 sm:flex-row sm:items-start sm:gap-10 sm:p-10">
        <ProfileAvatar name={name} src={avatarUrl} />
        <div className="min-w-0 flex-1">
          <h1 className="font-pw-display text-pw-display-l font-extrabold uppercase italic leading-[0.9] break-words text-pw-text sm:text-pw-display-xl">
            {name || handle}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-pw-body-sm text-pw-muted">
            <span className="font-semibold text-pw-text-soft">@{handle}</span>
            {joined ? (
              <>
                <span aria-hidden>•</span>
                <span className="inline-flex items-center gap-1.5">
                  <IconCalendar aria-hidden className="size-4" />
                  Joined {joined}
                </span>
              </>
            ) : null}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {isOwner ? (
              <>
                <Button variant="primary" asChild>
                  <Link href={apexHref("/profile?edit=1")}>
                    <IconPencil aria-hidden />
                    Edit profile
                  </Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href={apexHref("/manage")}>Manage games</Link>
                </Button>
              </>
            ) : (
              <Button
                variant={following ? "secondary" : "primary"}
                onClick={onFollow}
                aria-pressed={following}
                disabled={followBusy}
              >
                {following ? <IconCheck aria-hidden /> : <IconPlus aria-hidden />}
                {following ? "Following" : "Follow"}
              </Button>
            )}
            <Button variant="secondary" onClick={() => void onShare()}>
              <IconShare aria-hidden />
              {copied === "share" ? "Link copied" : "Share profile"}
            </Button>
          </div>
          {bio ? <p className="mt-5 max-w-prose whitespace-pre-line text-pw-body text-pw-text-soft">{bio}</p> : null}
        </div>
      </div>

      <div className="absolute top-4 right-4 hidden sm:block">
        <Button variant="ghost" size="sm" onClick={() => void onCopy("link")} className="border border-pw-line">
          {copied === "link" ? <IconCheck aria-hidden /> : <IconCopy aria-hidden />}
          {copied === "link" ? "Copied" : "Copy profile link"}
        </Button>
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Profile link copied" : ""}
      </span>
    </section>
  );
}

export function ProfileStats({ stats }: { stats: { label: string; value: number }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-y-4 rounded-pw-lg border border-pw-line bg-pw-surface-1 px-2 py-4 sm:flex sm:flex-wrap sm:px-4">
      {stats.map((s, i) => (
        <div key={s.label} className={cn("grid gap-1 px-4 py-1 sm:px-6", i > 0 && "sm:border-l sm:border-pw-line")}>
          <dt className="order-2 text-pw-caption text-pw-muted">{s.label}</dt>
          <dd className="order-1 font-pw-display text-pw-display-m font-extrabold italic leading-none tabular-nums text-pw-text">
            {formatPlays(s.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
