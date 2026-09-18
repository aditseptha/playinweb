export const CLASSIFICATIONS = [
  { id: "game", label: "Games — A piece of software you can play" },
  { id: "assets", label: "Game assets — Assets for use in games" },
  { id: "mod", label: "Game mods — Mods for existing games" },
  { id: "physical", label: "Physical games — Board games, card games, and similar" },
  { id: "soundtrack", label: "Soundtracks — Music from or for a game" },
  { id: "tool", label: "Tools — Software to help make games" },
  { id: "comic", label: "Comics — Sequential art" },
  { id: "book", label: "Books — Print or digital books" },
  { id: "other", label: "Other" },
] as const;

export const PROJECT_KINDS = [
  { id: "downloadable", label: "Downloadable — You only have files to be downloaded" },
  { id: "html", label: "HTML — Playable in the browser" },
  { id: "flash", label: "Flash — .swf file" },
  { id: "unity", label: "Unity — Web player or WebGL" },
  { id: "java", label: "Java applet" },
  { id: "other", label: "Other" },
] as const;

export const RELEASE_STATUSES = [
  { id: "released", label: "Released — Game is complete, but might receive some updates" },
  { id: "in_development", label: "In development — Work in progress" },
  { id: "prototype", label: "Prototype — Early concept or demo" },
  { id: "canceled", label: "Canceled — No longer in development" },
] as const;

export const PRICING_TYPES = [
  { id: "donate", label: "$0 or donate" },
  { id: "paid", label: "Paid" },
  { id: "no_payments", label: "No payments" },
] as const;

export const GENRES = [
  "No genre",
  "Action",
  "Adventure",
  "Card Game",
  "Educational",
  "Fighting",
  "Interactive Fiction",
  "Platformer",
  "Puzzle",
  "Racing",
  "Rhythm",
  "Role Playing",
  "Shooter",
  "Simulation",
  "Sports",
  "Strategy",
  "Survival",
  "Visual Novel",
] as const;

export const STORES = [
  { id: "steam", label: "Steam" },
  { id: "apple", label: "Apple App Store" },
  { id: "google", label: "Google Play" },
  { id: "amazon", label: "Amazon App Store" },
  { id: "windows", label: "Windows Store" },
] as const;

export const COMMUNITIES = [
  { id: "disabled", label: "Disabled" },
  { id: "comments", label: "Comments — Add a nested comment thread to the bottom of the game page" },
  { id: "board", label: "Discussion board — Add a dedicated community page" },
] as const;

export type Classification = (typeof CLASSIFICATIONS)[number]["id"];
export type ProjectKind = (typeof PROJECT_KINDS)[number]["id"];
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number]["id"];
export type PricingType = (typeof PRICING_TYPES)[number]["id"];
export type StoreId = (typeof STORES)[number]["id"];
export type Community = (typeof COMMUNITIES)[number]["id"];
