// The devlog (#40): what changed on PlayInWeb, release by release, written for players and creators.
//
// - Newest release first. Add a release (or items to the top one) in every PR that changes something
//   people can see or use. The footer shows the top release's version, so the two never disagree.
// - Versions are v0.x while PlayInWeb is in beta. A release groups a few PRs, not every deploy.
// - Write for players, in plain English: what they can do now, not how it was built. Security
//   fixes say "Security fix" without details.
// lib/devlog.test.mjs checks the format.

export type DevlogKind = "new" | "improved" | "fixed";

export type DevlogItem = { kind: DevlogKind; text: string };

export type DevlogRelease = {
  /** "0.6": shown as v0.6. */
  version: string;
  /** YYYY-MM-DD, the day the release went live. */
  date: string;
  title: string;
  summary?: string;
  items: DevlogItem[];
};

export const DEVLOG: DevlogRelease[] = [
  {
    version: "0.8",
    date: "2026-11-14",
    title: "Phone and Desktop",
    summary: "Find games that work on the device in your hand.",
    items: [
      { kind: "new", text: "Phone and Desktop chips above the games. On a phone, Phone turns on by itself; tap it to see every game." },
      { kind: "new", text: "Every game now says how it's played: touchscreen, keyboard, mouse or gamepad." },
      { kind: "improved", text: "On a phone, the featured game at the top is one you can actually play there." },
    ],
  },
  {
    version: "0.7",
    date: "2026-11-13",
    title: "Tidier profiles and safer fullscreen",
    items: [
      { kind: "improved", text: "Game cards on profiles are back to their normal size." },
      { kind: "improved", text: "Your channel shows your badges in a sidebar, and first on phones." },
      { kind: "improved", text: "Fullscreen on iPhone fits the visible screen, so the controls stay within reach." },
      { kind: "fixed", text: "Sign-in and other windows now appear when a game is fullscreen, instead of hiding behind it." },
    ],
  },
  {
    version: "0.6",
    date: "2026-11-13",
    title: "The devlog",
    summary: "A public record of every update, so you always know what changed and which version you're on.",
    items: [
      { kind: "new", text: "This devlog. Open it from the version number at the bottom of any page." },
      { kind: "new", text: "The footer shows the version you're using and the exact build behind it." },
    ],
  },
  {
    version: "0.5",
    date: "2026-11-13",
    title: "Profiles and badges",
    summary: "Profiles got a new look, and every account can now earn badges for playing, commenting and making games.",
    items: [
      { kind: "new", text: "11 badges in 3D: Explorer, Talk of the Town, Fan, Supporter, First Game, Following, Well Liked, Crowd Pleaser, Complete Page, and the rare Foil badges Early Bird and Claimed." },
      { kind: "new", text: "Badges level up from bronze to silver to gold. Hover or tap a badge to see how close the next level is." },
      { kind: "new", text: "A celebration pops up when you earn a badge, with a bigger one for Foil badges. It waits until you stop playing." },
      { kind: "new", text: "Redesigned profiles with a Follow button, stats, and the badges beside your games." },
      { kind: "new", text: "Profiles without games show what that player has been playing lately." },
      { kind: "new", text: "Your badges appear in Your channel and in your notifications." },
      { kind: "improved", text: "Every curated game now fills the game screen at its native size, and the catalogue grew to about 120 games." },
      { kind: "improved", text: "Browsing the homepage catalogue is easier." },
      { kind: "improved", text: "Links to PlayInWeb shared on social media show game posters." },
      { kind: "fixed", text: "A badge celebration no longer comes back every time you open another page." },
    ],
  },
  {
    version: "0.4",
    date: "2026-11-11",
    title: "More games to play right here",
    items: [
      { kind: "new", text: "37 curated itch.io games now play instantly inside PlayInWeb, with full credit to their creators." },
      { kind: "new", text: "30 PICO-8 games that play right on the page." },
      { kind: "new", text: "20 games from Game Jolt, which open on Game Jolt." },
    ],
  },
  {
    version: "0.3",
    date: "2026-11-10",
    title: "Curated indie games",
    summary: "PlayInWeb now lists great indie web games by other creators, credited and linked, until they claim them.",
    items: [
      { kind: "new", text: "Curated games show their original creator, license and source." },
      { kind: "new", text: "Games that can't be embedded open on the creator's own page." },
      { kind: "new", text: "The PlayInWeb mascot now greets you on empty pages and errors." },
      { kind: "fixed", text: "Old game links keep working after a game is renamed or moves to another creator." },
    ],
  },
  {
    version: "0.2",
    date: "2026-11-09",
    title: "A new design system and game page",
    items: [
      { kind: "improved", text: "Redesigned Rankings with a podium and a leaderboard for the top games." },
      { kind: "improved", text: "A consistent look across buttons, cards, dialogs and empty states." },
      { kind: "improved", text: "Redesigned game page." },
      { kind: "improved", text: "Switching between light and dark mode animates with the footer's blue squares." },
      { kind: "improved", text: "Every game has one address, and game pages are easier to find on search engines." },
    ],
  },
  {
    version: "0.1",
    date: "2026-11-07",
    title: "A fresh homepage",
    items: [
      { kind: "new", text: "Redesigned homepage with a big featured game, shelves of games and a new blue palette." },
    ],
  },
];

export const DEVLOG_KIND_LABEL: Record<DevlogKind, string> = { new: "New", improved: "Improved", fixed: "Fixed" };

/** The release that is live: the top of the devlog. */
export function currentRelease(list: readonly DevlogRelease[] = DEVLOG): DevlogRelease {
  return list[0];
}

/** The anchor for a release on /devlog: "v0-6". */
export function releaseAnchor(version: string): string {
  return `v${version.replace(/\./g, "-")}`;
}

/** The first 7 characters of the deployed commit, set at build time by next.config.ts. */
export function buildId(sha: string | undefined = process.env.NEXT_PUBLIC_BUILD_SHA): string | null {
  const s = (sha ?? "").trim();
  return /^[0-9a-f]{7,40}$/i.test(s) ? s.slice(0, 7).toLowerCase() : null;
}

const VERSION_RE = /^0\.\d+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function versionNumber(v: string) {
  return Number(v.split(".")[1]);
}

/** Problems with the devlog's format, for the tests. Empty when everything is fine. */
export function devlogProblems(list: readonly DevlogRelease[]): string[] {
  const out: string[] = [];
  if (list.length === 0) out.push("The devlog needs at least one release.");
  list.forEach((r, i) => {
    const at = `v${r.version}`;
    if (!VERSION_RE.test(r.version)) out.push(`${at}: version must look like 0.N`);
    if (!DATE_RE.test(r.date) || Number.isNaN(Date.parse(`${r.date}T00:00:00Z`))) out.push(`${at}: date must be YYYY-MM-DD`);
    if (!r.title.trim()) out.push(`${at}: title is empty`);
    if (r.items.length === 0) out.push(`${at}: no items`);
    for (const item of r.items) {
      if (!(item.kind in DEVLOG_KIND_LABEL)) out.push(`${at}: unknown kind "${item.kind}"`);
      if (!item.text.trim()) out.push(`${at}: an item has no text`);
    }
    const next = list[i + 1];
    if (next) {
      if (versionNumber(r.version) <= versionNumber(next.version)) out.push(`${at}: must be newer than v${next.version} below it`);
      if (r.date < next.date) out.push(`${at}: date is older than v${next.version} below it`);
    }
  });
  return out;
}
