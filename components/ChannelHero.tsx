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
import { Button, LinkButton } from "@/components/ui/button";
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

  return (
    <div>
      <div className="relative h-[200px] rounded-panel bg-surface-2 sm:h-[260px] lg:h-[320px]">
        <div className="absolute inset-0 overflow-hidden rounded-panel">
          <BannerImage src={shownBanner} position={shownPos} />
          <div
            className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/80 via-black/45 to-black/10"
            aria-hidden
          />
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
        <div className="absolute inset-x-0 bottom-0 z-40 flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:gap-5 sm:p-5 lg:p-6">
          {canEdit && !reposition ? (
            <ImageEdit
              kind="avatar"
              hasImage={Boolean(avatarUrl)}
              pending={pending === "avatar"}
              busy={pending != null}
              onPick={(file) => onPick("avatar", file)}
              onRemove={() => void remove("avatar")}
              className="size-[92px] shrink-0 self-start translate-x-1 translate-y-1 rounded-full ring-2 ring-white"
            >
              <Avatar name={name} src={avatarUrl} size={92} />
            </ImageEdit>
          ) : (
            <Avatar name={name} src={avatarUrl} size={92} className="self-start translate-x-1 translate-y-1 ring-2 ring-white" />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] font-semibold tracking-tight text-white sm:text-[32px]">{name || "You"}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-white/75">{subtitle}</p>
            ) : (
              <>
                <p className="mt-1 text-sm text-white/75">
                  <span className="text-white">@{handle}</span>
                  <span aria-hidden> · </span>
                  {formatPlays(followers ?? 0)} {(followers ?? 0) === 1 ? "follower" : "followers"}
                  <span aria-hidden> · </span>
                  {gameCount} {gameCount === 1 ? "game" : "games"}
                  <span aria-hidden> · </span>
                  {formatPlays(views ?? 0)} {(views ?? 0) === 1 ? "view" : "views"}
                  <span aria-hidden> · </span>
                  {formatPlays(plays)} plays
                </p>
                {bio ? (
                  <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/70">
                    {shortBio}{" "}
                    {truncated && moreHref ? (
                      <Link href={moreHref} className="font-medium text-white hover:text-white/80">
                        more
                      </Link>
                    ) : null}
                  </p>
                ) : null}
              </>
            )}
          </div>
          {showOwnerActions ? (
            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-black/35 p-1 backdrop-blur-sm sm:justify-end">
              {admin ? (
                <HeroIconLink href={apexHref("/admin")} label="Admin">
                  <IconShield className="h-4 w-4" />
                </HeroIconLink>
              ) : null}
              <LinkButton href={apexHref("/profile?edit=1")} variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
                Profile setting
              </LinkButton>
              <LinkButton href={apexHref("/manage")} variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
                Manage games
              </LinkButton>
              {showSiteLink ? (
                <LinkButton href={siteOrigin(handle)} variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
                  View site
                </LinkButton>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {canEdit && error ? (
        <p className="mt-2 text-caption text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function HeroIconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <LinkButton
      href={href}
      variant="ghost"
      size="sm"
      aria-label={label}
      title={label}
      className="w-8 !px-0 text-white hover:bg-white/10 hover:text-white"
    >
      {children}
    </LinkButton>
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
      className={cn(
        "group/edit",
        cover ? "pointer-events-auto absolute top-3 right-3 z-50" : "relative z-30",
        className,
      )}
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
            cover ? "right-0 top-full mt-2" : "bottom-full left-1/2 mb-2 -translate-x-1/2",
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
        priority
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
