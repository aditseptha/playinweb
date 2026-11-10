// Curated games (#9): games by other creators that PlayInWeb lists with credit until they claim them.
// Unclaimed curated games belong to the system account `listed`; the credit lives in project_curation.
// No "@/" imports here, so `npm test` can load this file directly.

import type { Database } from "./database.types";

type CurationRow = Database["public"]["Tables"]["project_curation"]["Row"];

/** Handle of the system account that owns unclaimed curated games. Hidden from every creator surface. */
export const CURATED_HANDLE = "listed";

/**
 * hosted: we host the build. link_out: players go to the creator's page.
 * embed: the game plays here, loaded from the creator's page through the site's own embed player.
 */
export type PlayMode = "hosted" | "link_out" | "embed";

export type Curation = {
  creatorName: string;
  creatorUrl?: string;
  sourceUrl?: string;
  sourceCodeUrl?: string;
  license: string;
  licenseUrl?: string;
  /** We changed the build (for example removed trackers). GPL and MPL ask for that to be stated. */
  modified: boolean;
  playMode: PlayMode;
  status: "listed" | "claim_pending";
};

/**
 * Licenses an admin may pick. Each one allows hosting the game here, also on a site with donations.
 * Non-commercial (NC) and no-derivatives (ND) licenses are left out on purpose.
 * "Permission" means the creator agreed in writing; keep that message.
 */
export const CURATION_LICENSES = [
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "Zlib",
  "MPL-2.0",
  "GPL-2.0",
  "GPL-3.0",
  "LGPL-3.0",
  "AGPL-3.0",
  "CC0-1.0",
  "CC-BY-4.0",
  "CC-BY-SA-4.0",
  "Unlicense",
  "Permission",
] as const;

/**
 * The license value for a link-out or embedded curated game (#9 F2). We only link to or embed the
 * creator's own page and host nothing, so no hosting license applies. Not in CURATION_LICENSES, which are for hosted builds.
 */
export const LINK_OUT_LICENSE = "Link only";

const LICENSE_LABELS: Record<string, string> = {
  MIT: "MIT License",
  "Apache-2.0": "Apache License 2.0",
  "BSD-2-Clause": "BSD 2-Clause License",
  "BSD-3-Clause": "BSD 3-Clause License",
  ISC: "ISC License",
  Zlib: "zlib License",
  "MPL-2.0": "Mozilla Public License 2.0",
  "GPL-2.0": "GNU GPL v2",
  "GPL-3.0": "GNU GPL v3",
  "LGPL-3.0": "GNU LGPL v3",
  "AGPL-3.0": "GNU AGPL v3",
  "CC0-1.0": "CC0 (public domain)",
  "CC-BY-4.0": "CC BY 4.0",
  "CC-BY-SA-4.0": "CC BY-SA 4.0",
  Unlicense: "The Unlicense",
  Permission: "Shared with the creator's permission",
  [LINK_OUT_LICENSE]: "Played on the creator's site",
};

export function licenseLabel(license: string) {
  return LICENSE_LABELS[license] ?? license;
}

function optionalUrl(value: string | null | undefined) {
  const v = value?.trim();
  return v && /^https?:\/\//i.test(v) ? v : undefined;
}

/**
 * The credit for a game, from an embedded `project_curation ( ... )` select.
 * PostgREST returns one object for this one-to-one table; accept an array too.
 * A claimed game is the creator's own again, so it gets no curated treatment.
 */
export function curationFromRow(
  embed: Partial<CurationRow> | Partial<CurationRow>[] | null | undefined,
): Curation | null {
  const row = Array.isArray(embed) ? embed[0] : embed;
  if (!row || !row.creator_name || !row.license) return null;
  if (row.status !== "listed" && row.status !== "claim_pending") return null;
  return {
    creatorName: row.creator_name,
    creatorUrl: optionalUrl(row.creator_url),
    sourceUrl: optionalUrl(row.source_url),
    sourceCodeUrl: optionalUrl(row.source_code_url),
    license: row.license,
    licenseUrl: optionalUrl(row.license_url),
    modified: Boolean(row.modified),
    playMode: row.play_mode === "link_out" || row.play_mode === "embed" ? row.play_mode : "hosted",
    status: row.status,
  };
}

/**
 * Embed players that game sites offer for use on other sites, so the game can play inside PlayInWeb
 * without us hosting the build. Only these load in our play frame; other external links open a new tab.
 */
type FrameSize = { width: number; height: number };

const OFFICIAL_EMBEDS: { host: string; path: RegExp; size?: FrameSize }[] = [
  // itch.io: the "embed-upload" player for an HTML5 upload, the one itch's own embed code uses.
  { host: "itch.io", path: /^\/embed-upload\/\d+$/ },
  // PICO-8: the Lexaloffle BBS cart player. It only lays out cleanly near the 621×513 box from
  // Lexaloffle's own embed code (smaller frames crop the cart, larger ones pin it to the left).
  { host: "www.lexaloffle.com", path: /^\/bbs\/widget\.php$/, size: { width: 621, height: 513 } },
];

function officialEmbed(value: string | null | undefined) {
  let url: URL;
  try {
    url = new URL(value?.trim() ?? "");
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  return OFFICIAL_EMBEDS.find((e) => url.hostname === e.host && e.path.test(url.pathname)) ?? null;
}

export function isOfficialEmbedUrl(value: string | null | undefined) {
  return officialEmbed(value) !== null;
}

/** The fixed frame size an embed player needs (scale it to fit), or null when it fills any frame. */
export function embedFrameSize(value: string | null | undefined): FrameSize | null {
  return officialEmbed(value)?.size ?? null;
}

/** "github.com/gabrielecirulli/2048" from a URL, for compact credit links. */
export function shortUrl(url: string) {
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
}

/** One plain-text credit line, e.g. for the admin list or a copy button. */
export function attributionText(c: Curation) {
  return [
    `Made by ${c.creatorName}`,
    licenseLabel(c.license),
    c.modified ? "Modified for PlayInWeb" : null,
    c.sourceCodeUrl ? `Source: ${shortUrl(c.sourceCodeUrl)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function isCuratedHandle(handle: string | null | undefined) {
  return handle?.toLowerCase() === CURATED_HANDLE;
}
