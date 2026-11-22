import type { Curation } from "./curation";
import type { Orientation } from "./device";

export type Game = {
  id: string
  title: string
  developer: string
  description: string
  playUrl: string
  thumbnailUrl: string
  portraitUrl?: string
  focalX?: number
  focalY?: number
  previewClipUrl?: string
  previewClipKind?: "video" | "gif"
  screenshots: string[]
  embeddable: boolean
  tags: string[]
  createdAt: string
  playCount: number
  viewCount?: number
  likeCount: number
  promotionBoost: number
  channelHandle?: string
  /** Creator's profile photo, when they set one. */
  creatorAvatarUrl?: string
  projectSlug?: string
  /** How the game is controlled (#38): touch, keyboard, mouse, gamepad. Empty when nobody has checked. */
  controls?: string[]
  /** An admin played it on a real phone and it passed (#38). Phone shows only these games. */
  mobileReady?: boolean
  /** How the game wants the phone held (#38). Undefined when nobody has said. */
  orientation?: Orientation
  /** Set for a curated game by another creator (#9); developer then holds that creator's name. */
  curated?: Curation
};

export type Profile = {
  name: string
  handle: string
  bio: string
};

export type HistoryItem = {
  id: string
  at: number
};

export type Collection = {
  id: string
  name: string
  gameIds: string[]
  createdAt: string
};
