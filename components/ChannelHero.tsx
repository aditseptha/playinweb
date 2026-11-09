"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import {
  formatBannerPosition,
  parseBannerPosition,
  useChannelImageUpload,
} from "@/components/ChannelMedia";
import { IconPencil, IconShield } from "@/components/icons";
import s from "@/components/home/home.module.css";
import { Button } from "@/components/ui/button";
import { isAdminEmail } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatPlays } from "@/lib/format";
import { apexHref, siteOrigin } from "@/lib/host";
import { canOptimizeImage } from "@/lib/optimize-image";

type Reposition = {
  src: string;
  file: File | null;
  x: number;
  y: number;
  naturalW: number;
  naturalH: number;
};

export function ChannelHero({
  name,
  handle,
  bio,
  subtitle,
  gameCount,
  views,
  plays,
  followers,
  avatarUrl,
  bannerUrl,
  bannerPosition,
  moreHref,
  showOwnerActions,
  showSiteLink,
  editable,
}: {
  name: string;
  handle: string;
  bio: string;
  subtitle?: string;
  gameCount: number;
  views?: number;
  plays: number;
  followers?: number;
  avatarUrl?: string;
  bannerUrl?: string;
  bannerPosition?: string | null;
  moreHref?: string;
  showOwnerActions?: boolean;
  showSiteLink?: boolean;
  editable?: boolean;
}) {
  const { user } = useAuth();
  const admin = isAdminEmail(user?.email);
  const shortBio = bio.length > 110 ? `${bio.slice(0, 110).trimEnd()}…` : bio;
  const truncated = bio.length > 110;
  const { pending, error, onPick, save, saveBannerPosition, remove, canUpload } = useChannelImageUpload();
  const canEdit = Boolean(editable && canUpload);
  const savedPos = parseBannerPosition(bannerPosition);
  const [reposition, setReposition] = useState<Reposition | null>(null);
  const shownBanner = reposition?.src ?? bannerUrl;
  const shownPos = reposition ? { x: reposition.x, y: reposition.y } : savedPos;

  function startBannerFile(file: File) {
    const src = URL.createObjectURL(file);
    const probe = new window.Image();
    probe.onload = () => {
      setReposition({
        src,
        file,
        x: 50,
        y: 50,
        naturalW: probe.naturalWidth,
        naturalH: probe.naturalHeight,
      });
    };
    probe.onerror = () => URL.revokeObjectURL(src);
    probe.src = src;
  }

  function startBannerReposition() {
    if (!bannerUrl) return;
    const probe = new window.Image();
    probe.onload = () => {
      setReposition({
        src: bannerUrl,
        file: null,
        x: savedPos.x,
        y: savedPos.y,
        naturalW: probe.naturalWidth,
        naturalH: probe.naturalHeight,
      });
    };
    probe.src = bannerUrl;
  }

  async function confirmBanner() {
    if (!reposition) return;
    const pos = formatBannerPosition(reposition.x, reposition.y);
    const ok = reposition.file
      ? await save("banner", reposition.file, pos)
      : await saveBannerPosition(pos);
    if (ok) {
      if (reposition.file) URL.revokeObjectURL(reposition.src);
      setReposition(null);
    }
  }

  const avatar = canEdit && !reposition ? (
    <ImageEdit
      kind="avatar"
      hasImage={Boolean(avatarUrl)}
      pending={pending === "avatar"}
      busy={pending != null}
      onPick={(file) => onPick("avatar", file)}
      onRemove={() => void remove("avatar")}
      className={s.channelAvatar}
    >
      <Avatar name={name} src={avatarUrl} size={96} />
    </ImageEdit>
  ) : (
    <Avatar name={name} src={avatarUrl} size={96} className={s.channelAvatar} />
  );

  return (
    <section className={s.channel}>
      <div className={s.channelMedia}>
        <div className={s.channelArt}>
          <BannerImage src={shownBanner} position={shownPos} />
        </div>
        {canEdit && !reposition ? (
          <ImageEdit
            kind="banner"
            hasImage={Boolean(bannerUrl)}
            pending={pending === "banner"}
            busy={pending != null}
            onPick={startBannerFile}
            onReposition={bannerUrl ? startBannerReposition : undefined}
            onRemove={() => void remove("banner")}
          />
        ) : null}
        {reposition ? (
          <BannerReposition
            draft={reposition}
            busy={pending === "banner"}
            onMove={(x, y) => setReposition((cur) => (cur ? { ...cur, x, y } : cur))}
            onCancel={() => {
              if (reposition.file) URL.revokeObjectURL(reposition.src);
              setReposition(null);
            }}
            onConfirm={() => void confirmBanner()}
          />
        ) : null}
      </div>
      <div className={cn(s.frame, s.channelBody)}>
        <div className={s.wrap}>
          <div className={s.channelRow}>
            <div className={s.channelWho}>
              {avatar}
              <div className="min-w-0">
                <p className={s.eyebrow}>@{handle || "you"}</p>
                <h1 className={s.channelTitle}>{name || "You"}</h1>
                {subtitle ? (
                  <p className={s.channelBio}>{subtitle}</p>
                ) : (
                  <>
                    <p className={s.channelStats}>
                      <b>{formatPlays(followers ?? 0)}</b> {(followers ?? 0) === 1 ? "follower" : "followers"}
                      <span aria-hidden> · </span>
                      <b>{gameCount}</b> {gameCount === 1 ? "game" : "games"}
                      <span aria-hidden> · </span>
                      <b>{formatPlays(views ?? 0)}</b> {(views ?? 0) === 1 ? "view" : "views"}
                      <span aria-hidden> · </span>
                      <b>{formatPlays(plays)}</b> plays
                    </p>
                    {bio ? (
                      <p className={s.channelBio}>
                        {shortBio}{" "}
                        {truncated && moreHref ? (
                          <Link href={moreHref} className={s.linkGold}>
                            more
                          </Link>
                        ) : null}
                      </p>
                    ) : null}
                  </>
                )}
                {showOwnerActions ? (
                  <div className={s.channelActions}>
                    {admin ? (
                      <Link href={apexHref("/admin")} className={cn(s.btn, s.btnGhost)} aria-label="Admin" title="Admin">
                        <IconShield className="h-4 w-4" />
                      </Link>
                    ) : null}
                    <Link href={apexHref("/profile?edit=1")} className={cn(s.btn, s.btnGhost)}>
                      Profile setting
                    </Link>
                    <Link href={apexHref("/manage")} className={cn(s.btn, s.btnGhost)}>
                      Manage games
                    </Link>
                    {showSiteLink ? (
                      <Link href={siteOrigin(handle)} className={cn(s.btn, s.btnPrimary)}>
                        View site
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          {canEdit && error ? (
            <p className="mt-3 text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ImageEdit({
  kind,
  hasImage,
  pending,
  busy,
  onPick,
  onReposition,
  onRemove,
  className,
  children,
}: {
  kind: "avatar" | "banner";
  hasImage: boolean;
  pending: boolean;
  busy: boolean;
  onPick: (file: File) => void;
  onReposition?: () => void;
  onRemove: () => void;
  className?: string;
  children?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const cover = kind === "banner";
  const show = open || pending;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={cn("group/edit", cover ? s.channelEdit : "relative z-30", className)}
    >
      {children}
      {cover ? (
        <button
          type="button"
          disabled={busy}
          aria-label="Edit banner"
          aria-expanded={open}
          aria-busy={pending}
          onClick={() => setOpen((v) => !v)}
          className="grid size-11 place-items-center rounded-full bg-black/65 text-white shadow-panel backdrop-blur-sm hover:bg-black/80 disabled:opacity-45"
        >
          <IconPencil className="h-5 w-5" />
        </button>
      ) : (
        <div
          className={cn(
            "absolute inset-0 grid place-items-center rounded-full bg-black/45 transition-opacity",
            show ? "opacity-100" : "opacity-0 group-hover/edit:opacity-100",
          )}
        >
          <button
            type="button"
            disabled={busy}
            aria-label="Edit photo"
            aria-expanded={open}
            aria-busy={pending}
            onClick={() => setOpen((v) => !v)}
            className="grid size-11 place-items-center rounded-full bg-black/65 text-white shadow-panel backdrop-blur-sm hover:bg-black/80 disabled:opacity-45"
          >
            <IconPencil className="h-5 w-5" />
          </button>
        </div>
      )}
      {open ? (
        <div
          className={cn(
            "pointer-events-auto absolute z-50 w-32",
            cover ? "right-0 top-full mt-2" : "top-full left-1/2 mt-2 -translate-x-1/2",
          )}
        >
          <div className="rounded-xl bg-black/85 p-1 text-white shadow-panel backdrop-blur-sm">
            <button
              type="button"
              disabled={busy}
              className="block w-full rounded-lg px-3 py-1.5 text-left text-ui hover:bg-white/10 disabled:opacity-45"
              onClick={() => {
                setOpen(false);
                inputRef.current?.click();
              }}
            >
              Change
            </button>
            {hasImage && onReposition ? (
              <button
                type="button"
                disabled={busy}
                className="block w-full rounded-lg px-3 py-1.5 text-left text-ui hover:bg-white/10 disabled:opacity-45"
                onClick={() => {
                  setOpen(false);
                  onReposition();
                }}
              >
                Reposition
              </button>
            ) : null}
            {hasImage ? (
              <button
                type="button"
                disabled={busy}
                className="block w-full rounded-lg px-3 py-1.5 text-left text-ui hover:bg-white/10 disabled:opacity-45"
                onClick={() => {
                  setOpen(false);
                  onRemove();
                }}
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onPick(file);
        }}
      />
    </div>
  );
}

function BannerImage({ src, position }: { src?: string; position: { x: number; y: number } }) {
  if (!src) return null;
  const objectPosition = `${position.x}% ${position.y}%`;
  if (canOptimizeImage(src)) {
    return (
      <Image
        src={src}
        alt=""
        fill
        sizes="100vw"
        preload
        className="object-cover"
        style={{ objectPosition }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="size-full object-cover" style={{ objectPosition }} />
  );
}

function leftoverAxis(imgW: number, imgH: number, frameW: number, frameH: number): "x" | "y" | null {
  if (!imgW || !imgH || !frameW || !frameH) return null;
  const imgR = imgW / imgH;
  const frameR = frameW / frameH;
  if (Math.abs(imgR - frameR) < 0.02) return null;
  return imgR > frameR ? "x" : "y";
}

function leftoverPx(imgW: number, imgH: number, frameW: number, frameH: number, axis: "x" | "y") {
  if (axis === "x") return Math.max(0, imgW * (frameH / imgH) - frameW);
  return Math.max(0, imgH * (frameW / imgW) - frameH);
}

function BannerReposition({
  draft,
  busy,
  onMove,
  onCancel,
  onConfirm,
}: {
  draft: Reposition;
  busy: boolean;
  onMove: (x: number, y: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [axis, setAxis] = useState<"x" | "y" | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    function measure() {
      const box = frameRef.current?.getBoundingClientRect();
      if (!box) return;
      setAxis(leftoverAxis(draft.naturalW, draft.naturalH, box.width, box.height));
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [draft.naturalW, draft.naturalH]);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!axis) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: draft.x, y: draft.y, px: e.clientX, py: e.clientY };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current || !axis) return;
    const box = frameRef.current?.getBoundingClientRect();
    if (!box) return;
    const extra = leftoverPx(draft.naturalW, draft.naturalH, box.width, box.height, axis);
    if (extra < 1) return;
    const start = drag.current;
    if (axis === "x") {
      const next = start.x - ((e.clientX - start.px) / extra) * 100;
      onMove(Math.min(100, Math.max(0, next)), 50);
    } else {
      const next = start.y - ((e.clientY - start.py) / extra) * 100;
      onMove(50, Math.min(100, Math.max(0, next)));
    }
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  return (
    <div className="absolute inset-0 z-40">
      <div
        ref={frameRef}
        className={cn("absolute inset-0", axis ? "cursor-grab active:cursor-grabbing" : "cursor-default")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-3">
        <p className="rounded-lg bg-black/60 px-2.5 py-1 text-caption text-white backdrop-blur-sm">
          {axis === "x" ? "Drag left or right" : axis === "y" ? "Drag up or down" : "Image fits this banner"}
        </p>
        <div className="pointer-events-auto flex gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" size="sm" variant="primary" onClick={onConfirm} disabled={busy}>
            {busy ? "Saving…" : "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ChannelTabs({
  tabs,
  active,
}: {
  tabs: { id: string; label: string; href: string }[];
  active: string;
}) {
  return (
    <nav className="mt-6 flex min-w-0 gap-1 overflow-x-auto border-b border-border" aria-label="Channel">
      {tabs.map((tab) => {
        const on = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`relative shrink-0 px-4 py-3 text-ui font-medium ${
              on ? "text-text" : "text-text-muted hover:text-text"
            }`}
            aria-current={on ? "page" : undefined}
          >
            {tab.label}
            {on ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
