import {
  IconAlertCircle,
  IconBell,
  IconCompass,
  IconConfetti,
  IconFolderOpen,
  IconGamepad,
  IconHeart,
  IconHistory,
  IconLock,
  IconNoResults,
  IconSignIn,
  IconWallet,
  type AppIcon,
} from "@/components/icons";
import Image from "next/image";
import { cn } from "@/lib/cn";

// Soft 3D mascot illustrations for page-level empty and status states. Until an asset is drawn,
// a placeholder (large icon on a grid) stands in, so pages never wait on artwork.
// When an asset lands in public/illustrations/, add its file name to ASSETS.

export const ILLUSTRATIONS = {
  "no-results": { icon: IconNoResults, wave: 1, label: "No search results" },
  "first-use": { icon: IconGamepad, wave: 1, label: "Creator has no games yet" },
  "not-found": { icon: IconCompass, wave: 1, label: "404 / game not found" },
  error: { icon: IconAlertCircle, wave: 1, label: "Error / game failed to load" },
  "no-favorites": { icon: IconHeart, wave: 2, label: "No favorites yet" },
  "nothing-played": { icon: IconHistory, wave: 2, label: "Nothing played yet" },
  "empty-library": { icon: IconFolderOpen, wave: 2, label: "Library or collection empty" },
  wallet: { icon: IconWallet, wave: 2, label: "Wallet empty / PayPal not connected" },
  "no-notifications": { icon: IconBell, wave: 2, label: "No notifications" },
  "sign-in": { icon: IconSignIn, wave: 2, label: "Sign in required" },
  "coming-soon": { icon: IconLock, wave: 2, label: "Coming soon / locked" },
  success: { icon: IconConfetti, wave: 2, label: "Published / payment done" },
} satisfies Record<string, { icon: AppIcon; wave: 1 | 2; label: string }>;

export type IllustrationName = keyof typeof ILLUSTRATIONS;

/** Finished artwork, by name → file in public/illustrations/ (480px WebP, transparent). */
const ASSETS: Partial<Record<IllustrationName, string>> = {
  "no-results": "no-results.webp",
  "first-use": "first-use.webp",
  "not-found": "not-found.webp",
  error: "error.webp",
  "no-favorites": "no-favorites.webp",
  "nothing-played": "nothing-played.webp",
  "empty-library": "empty-library.webp",
  wallet: "wallet.webp",
  "no-notifications": "no-notifications.webp",
  "sign-in": "sign-in.webp",
  "coming-soon": "coming-soon.webp",
  success: "success.webp",
};

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
        className={className}
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
      <Icon className="relative text-pw-sky" style={{ width: px * 0.38, height: px * 0.38 }} />
      <span className="absolute right-3 bottom-2 font-pw-pixel text-[9px] tracking-[0.08em] text-pw-faint uppercase">
        draft
      </span>
    </div>
  );
}
