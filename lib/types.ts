export type Game = {
  id: string
  title: string
  developer: string
  description: string
  playUrl: string
  thumbnailUrl: string
  screenshots: string[]
  embeddable: boolean
  tags: string[]
  createdAt: string
  playCount: number
  viewCount?: number
  likeCount: number
  promotionBoost: number
  channelHandle?: string
  projectSlug?: string
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
