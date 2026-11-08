import {
  Bell,
  CircleAlert,
  Compass,
  FolderOpen,
  Gamepad2,
  Heart,
  History,
  Lock,
  LogIn,
  PartyPopper,
  SearchX,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/cn";

// Pixel-art illustrations for page-level empty and status states. Until an asset is drawn,
// a placeholder (large icon on a pixel grid) stands in, so pages never wait on artwork.
// When an asset lands in public/illustrations/, add its file name to ASSETS.

export const ILLUSTRATIONS = {
  "no-results": { icon: SearchX, wave: 1, label: "No search results" },
  "first-use": { icon: Gamepad2, wave: 1, label: "Creator has no games yet" },
  "not-found": { icon: Compass, wave: 1, label: "404 / game not found" },
  error: { icon: CircleAlert, wave: 1, label: "Error / game failed to load" },
  "no-favorites": { icon: Heart, wave: 2, label: "No favorites yet" },
  "nothing-played": { icon: History, wave: 2, label: "Nothing played yet" },
  "empty-library": { icon: FolderOpen, wave: 2, label: "Library or collection empty" },
  wallet: { icon: Wallet, wave: 2, label: "Wallet empty / PayPal not connected" },
  "no-notifications": { icon: Bell, wave: 2, label: "No notifications" },
  "sign-in": { icon: LogIn, wave: 2, label: "Sign in required" },
  "coming-soon": { icon: Lock, wave: 2, label: "Coming soon / locked" },
  success: { icon: PartyPopper, wave: 2, label: "Published / payment done" },
} satisfies Record<string, { icon: LucideIcon; wave: 1 | 2; label: string }>;

export type IllustrationName = keyof typeof ILLUSTRATIONS;

/** Finished artwork, by name → file in public/illustrations/. Empty until wave 1 is drawn. */
const ASSETS: Partial<Record<IllustrationName, string>> = {};

export function hasIllustrationAsset(name: IllustrationName) {
  return Boolean(ASSETS[name]);
}

const SIZES = { l: 240, m: 160, s: 96 } as const;

export function Illustration({
  name,
  size = "m",
  className,
}: {
  name: IllustrationName;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const px = SIZES[size];
  const file = ASSETS[name];

  if (file) {
    return (
      <Image
        src={`/illustrations/${file}`}
        alt=""
        width={px}
        height={px}
        className={cn("[image-rendering:pixelated]", className)}
      />
    );
  }

  const Icon = ILLUSTRATIONS[name].icon;
  return (
    <div
      aria-hidden
      style={{ width: px, height: px }}
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-pw-2xl border border-pw-line",
        "bg-[radial-gradient(60%_60%_at_50%_45%,color-mix(in_srgb,var(--pw-primary)_22%,transparent),transparent_70%),linear-gradient(180deg,var(--pw-surface-2),var(--pw-surface-1))]",
        className,
      )}
    >
      {/* Pixel grid backdrop, a stand-in for the art style. */}
      <span className="absolute inset-0 bg-[linear-gradient(var(--pw-line)_1px,transparent_1px),linear-gradient(90deg,var(--pw-line)_1px,transparent_1px)] bg-[size:12px_12px] opacity-70" />
      <Icon className="relative text-pw-sky" strokeWidth={1.5} style={{ width: px * 0.38, height: px * 0.38 }} />
      <span className="absolute right-3 bottom-2 font-pw-pixel text-[9px] tracking-[0.08em] text-pw-faint uppercase">
        draft
      </span>
    </div>
  );
}
