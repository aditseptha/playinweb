import type { GameCardData } from "@/components/ds/game-card";

/** Fixed "now" for relative dates, so the server, the browser and screenshots agree. */
export const DEMO_NOW = Date.UTC(2026, 10, 8, 15, 0, 0);

// Sample content for the DS page. "Worst case" swaps in the data that breaks layouts:
// very long and unbroken text, huge numbers, non-Latin titles, missing covers and avatars.

const NORMAL: GameCardData[] = [
  {
    title: "Ayam Kabur",
    href: "#",
    cover: "/home-hero.webp",
    coverPosition: "62 40",
    creator: { name: "kikiew" },
    plays: 12_400,
    likes: 886,
    badge: "top",
    playHref: "#",
  },
  {
    title: "Night Bus 9",
    href: "#",
    cover: "/top-hero.webp",
    creator: { name: "Dimas Game" },
    plays: 4_200,
    likes: 300,
    badge: "new",
  },
  {
    title: "Salt Garden",
    href: "#",
    cover: "/sidebar-footer.webp",
    creator: { name: "laras.dev" },
    plays: 640,
    likes: 46,
    playHref: "#",
  },
  {
    title: "Legenda Danau Biru",
    href: "#",
    creator: { name: "Nusa Studio" },
    plays: 2_800,
    likes: 200,
  },
];

const WORST: GameCardData[] = [
  {
    title: "The Extraordinarily Long and Winding Adventures of Si Kancil and the Seven Crocodiles of Sungai Barito",
    href: "#",
    cover: "/home-hero.webp",
    creator: { name: "nusantara.interactive.collective.official.studio" },
    plays: 98_765_432,
    likes: 1_234_567,
    badge: "top",
    playHref: "#",
  },
  {
    title: "夜の森と迷子の狐 — ป่าแห่งค่ำคืน",
    href: "#",
    cover: "/top-hero.webp",
    creator: { name: "森の小屋ゲームズ" },
    plays: 999_950,
    likes: 0,
  },
  {
    title: "Supercalifragilisticexpialidociousnessandmore",
    href: "#",
    creator: { name: "x" },
    plays: 0,
    likes: 1,
    playHref: "#",
  },
  {
    title: "A",
    href: "#",
    cover: "/sidebar-footer.webp",
    creator: { name: "" },
    plays: 1,
  },
];

export function sampleGames(worstCase: boolean) {
  return worstCase ? WORST : NORMAL;
}

export type SampleRow = {
  id: string;
  creator: string;
  game: string;
  amount: number;
  date: string;
  status: "paid" | "pending" | "failed";
};

export function sampleRows(worstCase: boolean): SampleRow[] {
  if (worstCase) {
    return [
      {
        id: "1",
        creator: "nusantara.interactive.collective.official.studio",
        game: "The Extraordinarily Long and Winding Adventures of Si Kancil",
        amount: 98_765_432.1,
        date: "2026-11-08T14:25:00Z",
        status: "failed",
      },
      {
        id: "2",
        creator: "森の小屋ゲームズ",
        game: "夜の森と迷子の狐",
        amount: 0.01,
        date: "2026-01-01T00:00:00Z",
        status: "pending",
      },
    ];
  }
  return [
    { id: "1", creator: "kikiew", game: "Ayam Kabur", amount: 25, date: "2026-11-08T09:12:00Z", status: "paid" },
    { id: "2", creator: "laras.dev", game: "Salt Garden", amount: 5, date: "2026-11-06T18:40:00Z", status: "pending" },
    { id: "3", creator: "Dimas Game", game: "Night Bus 9", amount: 12.5, date: "2026-10-28T11:00:00Z", status: "paid" },
  ];
}
