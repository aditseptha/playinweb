"use client";

import Image from "next/image";
import { ICON_GALLERY, ICON_SIZES, IconBookmark, IconHeart } from "@/components/icons";
import { useState } from "react";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { ILLUSTRATIONS, Illustration, hasIllustrationAsset, type IllustrationName } from "@/components/ds/illustration";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ds/table";
import {
  formatCompact,
  formatCount,
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatRelative,
} from "@/lib/format";
import { contrast, contrastPairs, motion, pastels, primitives, radius, themes, typeScale, zIndex } from "@/lib/tokens";
import { cn } from "@/lib/cn";
import { CopyToken, Demo, DocSection, Rule } from "./kit";
import { DEMO_NOW } from "./samples";

export function FoundationSections() {
  return (
    <>
      <Principles />
      <Colors />
      <Typography />
      <Foundations />
      <Formatting />
      <Icons />
      <Illustrations />
      <Brand />
    </>
  );
}

// ---------- Principles & voice ----------

const PRINCIPLES = [
  {
    title: "Game first, chrome second",
    body: "Cover art and the Play button are the loudest things on screen. Everything else steps back.",
    example: "Cards without heavy borders; the nav sits transparent over the hero art.",
  },
  {
    title: "A warm night",
    body: "Dark but friendly: deep blue and gold, never cold black. Gold is for the spotlight, blue is for action.",
    example: "Gold only on the hero title, TOP badges and the “Your turn” card.",
  },
  {
    title: "Creators up front",
    body: "A creator’s name and face are always visible, never a footnote.",
    example: "Avatar and name on every card and game page; pastel initials when there’s no photo.",
  },
  {
    title: "One language, every state",
    body: "The same component behaves the same everywhere. Loading, empty and error get the same care as the happy path.",
    example: "No bare “Loading…” text; every empty state offers one next step.",
  },
];

function Principles() {
  return (
    <DocSection
      id="principles"
      eyebrow="Language"
      title="Principles & voice"
      description="Four principles settle the grey areas, in design and in PR review. Copy is English, friendly and short, in sentence case."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {PRINCIPLES.map((p, i) => (
          <article key={p.title} className="rounded-pw-xl border border-pw-line bg-pw-surface-1 p-5">
            <p className="font-pw-pixel text-pw-label text-pw-highlight-ink">0{i + 1}</p>
            <h3 className="mt-2 text-pw-title font-bold text-pw-text">{p.title}</h3>
            <p className="mt-2 text-pw-body-sm text-pw-text-soft">{p.body}</p>
            <p className="mt-3 text-pw-caption text-pw-muted">{p.example}</p>
          </article>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Demo title="Voice">
          <ul className="flex flex-col gap-2.5">
            <Rule kind="do">Sentence case everywhere: “Add game”, “See all”.</Rule>
            <Rule kind="dont">
              Title Case Buttons Or ALL CAPS sentences. (Pixel labels are styled caps, not typed caps.)
            </Rule>
            <Rule kind="do">Buttons say what happens, in 1–3 words: “Play now”, “Save changes”.</Rule>
            <Rule kind="dont">“Click here”, “Submit”, “OK”.</Rule>
            <Rule kind="do">Talk to one person, plainly: “Your games”, “You’re offline”.</Rule>
          </ul>
        </Demo>
        <Demo title="Error messages: what happened, then what to do">
          <ul className="flex flex-col gap-2.5">
            <Rule kind="do">“This game didn’t load. Check your connection and try again.”</Rule>
            <Rule kind="dont">“Error 500.” / “Something bad happened.”</Rule>
            <Rule kind="do">“Cover image must be 5 MB or smaller.”</Rule>
            <Rule kind="dont">“Invalid file.”</Rule>
          </ul>
        </Demo>
      </div>
    </DocSection>
  );
}

// ---------- Colors ----------

function Swatch({ value }: { value: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-8 shrink-0 rounded-pw-sm border border-pw-line-strong"
      style={{ background: value }}
    />
  );
}

function Ratio({ fg, bg, min }: { fg: string; bg: string; min?: number }) {
  const r = contrast(fg, bg);
  if (r === null) return <span className="text-pw-caption text-pw-faint">n/a</span>;
  const pass = min === undefined ? r >= 4.5 : r >= min;
  return (
    <span className={cn("text-pw-caption tabular-nums", pass ? "text-pw-success" : "text-pw-danger")}>
      {r.toFixed(2)}:1
    </span>
  );
}

function Colors() {
  const names = Object.keys(themes.dark);
  return (
    <DocSection
      id="colors"
      eyebrow="Tokens"
      title="Colors"
      description={
        <>
          Components only use semantic tokens. Each has a dark and a light value; the theme class switches them. Click a
          name to copy it. Tailwind: <code className="text-pw-text-soft">bg-pw-surface-1</code>,{" "}
          <code className="text-pw-text-soft">text-pw-muted</code>,{" "}
          <code className="text-pw-text-soft">border-pw-line</code>.
        </>
      }
    >
      <Table caption="Semantic colour tokens with dark and light values" className="max-h-[560px]">
        <THead>
          <TR>
            <TH>Token</TH>
            <TH>Dark</TH>
            <TH>Light</TH>
          </TR>
        </THead>
        <TBody>
          {names.map((n) => (
            <TR key={n}>
              <TD>
                <CopyToken name={`--pw-${n}`} />
              </TD>
              <TD>
                <span className="flex items-center gap-3">
                  <Swatch value={themes.dark[n]} />
                  <span className="font-mono text-pw-caption text-pw-text-soft">{themes.dark[n]}</span>
                </span>
              </TD>
              <TD>
                <span className="flex items-center gap-3">
                  <Swatch value={themes.light[n]} />
                  <span className="font-mono text-pw-caption text-pw-text-soft">{themes.light[n]}</span>
                </span>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <Demo title="Contrast checks" note="Same pairs as lib/tokens.test.mjs. CI fails if one drops below its minimum.">
        <Table caption="Contrast ratios for required colour pairs" density="compact">
          <THead>
            <TR>
              <TH>Pair</TH>
              <TH>Use</TH>
              <TH numeric>Min</TH>
              <TH numeric>Dark</TH>
              <TH numeric>Light</TH>
            </TR>
          </THead>
          <TBody>
            {contrastPairs.map((p) => (
              <TR key={`${p.fg}-${p.bg}`}>
                <TD className="font-mono text-pw-caption">
                  {p.fg} / {p.bg}
                </TD>
                <TD className="text-pw-text-soft">{p.note}</TD>
                <TD numeric>{p.min}:1</TD>
                <TD numeric>
                  <Ratio fg={themes.dark[p.fg]} bg={themes.dark[p.bg]} min={p.min} />
                </TD>
                <TD numeric>
                  <Ratio fg={themes.light[p.fg]} bg={themes.light[p.bg]} min={p.min} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Demo>

      <Demo title="Palette (primitives)" note="Raw values. Don’t use these in UI code; pick the semantic token.">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Object.entries(primitives).map(([n, v]) => (
            <li key={n} className="flex items-center gap-3">
              <Swatch value={v} />
              <span className="min-w-0">
                <CopyToken name={`--pw-${n}`} className="-ml-1.5" />
                <span className="block font-mono text-pw-caption text-pw-muted">{v}</span>
              </span>
            </li>
          ))}
        </ul>
      </Demo>

      <div className="grid gap-4 lg:grid-cols-2">
        <Demo title="Gold vs blue">
          <ul className="flex flex-col gap-2.5">
            <Rule kind="do">Blue for action: buttons, links, focus, selected tabs.</Rule>
            <Rule kind="do">Gold for the spotlight: hero title, TOP rank, “Your turn”, featured.</Rule>
            <Rule kind="dont">Gold buttons for routine actions, or more than one gold element per view.</Rule>
          </ul>
        </Demo>
        <Demo title="Creator pastels" note="Initials fallback only. Text on them is navy.">
          <div className="flex flex-wrap gap-3">
            {pastels.map((v, i) => (
              <span key={v} className="flex items-center gap-2">
                <Swatch value={v} />
                <CopyToken name={`--pw-pastel-${i + 1}`} />
              </span>
            ))}
          </div>
        </Demo>
      </div>
    </DocSection>
  );
}

// ---------- Typography ----------

const ROLE: Record<string, { font: string; sample: string; extra?: string }> = {
  "display-xl": { font: "font-pw-display", sample: "Ayam Kabur", extra: "font-extrabold italic uppercase" },
  "display-l": { font: "font-pw-display", sample: "Your games", extra: "font-extrabold italic uppercase" },
  "display-m": { font: "font-pw-display", sample: "Kos-kosan No 13", extra: "font-extrabold uppercase" },
  heading: { font: "font-pw-body", sample: "Popular this week", extra: "font-bold" },
  title: { font: "font-pw-body", sample: "Publish your first game", extra: "font-bold" },
  body: {
    font: "font-pw-body",
    sample: "Story and adventure games from indie creators. Play them right in the browser.",
  },
  "body-sm": { font: "font-pw-body", sample: "Games you open show up here." },
  caption: { font: "font-pw-body", sample: "By kikiew · 12K plays · 2 days ago" },
  label: { font: "font-pw-pixel", sample: "Featured game", extra: "uppercase tracking-[0.06em]" },
};

function Typography() {
  return (
    <DocSection
      id="type"
      eyebrow="Tokens"
      title="Typography"
      description="Three faces: Plus Jakarta Sans for body and UI, Barlow Condensed for display titles over art, Silkscreen for small pixel labels (12px and below). Use the scale; no one-off sizes like text-[36px]."
    >
      <div className="overflow-hidden rounded-pw-xl border border-pw-line">
        {Object.entries(typeScale).map(([name, [size, lh]]) => {
          const r = ROLE[name];
          return (
            <div
              key={name}
              className="grid gap-3 border-b border-pw-line p-5 last:border-b-0 md:grid-cols-[200px_minmax(0,1fr)] md:items-center"
            >
              <div>
                <CopyToken name={`text-pw-${name}`} className="-ml-1.5" />
                <p className="font-mono text-pw-caption text-pw-muted">
                  {size} / {lh}
                </p>
              </div>
              <p
                className={cn(r.font, r.extra, "min-w-0 text-pw-text [overflow-wrap:anywhere]")}
                style={{ fontSize: `var(--pw-text-${name})`, lineHeight: `var(--pw-leading-${name})` }}
              >
                {r.sample}
              </p>
            </div>
          );
        })}
      </div>
    </DocSection>
  );
}

// ---------- Space, shape, motion ----------

const SPACING = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16];

function Foundations() {
  const [run, setRun] = useState(false);
  return (
    <DocSection
      id="foundations"
      eyebrow="Tokens"
      title="Space, shape, motion"
      description="Spacing is Tailwind’s 4px scale. Breakpoints are Tailwind’s: sm 640, md 768, lg 1024, xl 1280."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Demo title="Spacing (4px steps)">
          <ul className="flex flex-col gap-2">
            {SPACING.map((n) => (
              <li key={n} className="flex items-center gap-3">
                <span className="w-16 font-mono text-pw-caption text-pw-muted">
                  {n} · {n * 4}px
                </span>
                <span className="h-3 rounded-pw-sm bg-pw-primary" style={{ width: `calc(var(--spacing) * ${n})` }} />
              </li>
            ))}
          </ul>
        </Demo>
        <Demo title="Radius">
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(radius).map(([n, v]) => (
              <div key={n} className="flex flex-col items-center gap-2">
                <span className="size-16 border border-pw-line-strong bg-pw-surface-3" style={{ borderRadius: v }} />
                <CopyToken name={`rounded-pw-${n}`} />
              </div>
            ))}
          </div>
        </Demo>
        <Demo title="Elevation">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            {(["1", "2", "3", "glow"] as const).map((n) => (
              <div key={n} className="flex flex-col items-center gap-3">
                <span
                  className="size-16 rounded-pw-lg bg-pw-surface-1"
                  style={{ boxShadow: `var(--pw-shadow-${n})` }}
                />
                <CopyToken name={`shadow-pw-${n}`} />
              </div>
            ))}
          </div>
        </Demo>
        <Demo title="Layers (z-index)">
          <ul className="grid grid-cols-2 gap-2">
            {Object.entries(zIndex).map(([n, v]) => (
              <li key={n} className="flex items-center justify-between rounded-pw-sm bg-pw-surface-1 px-3 py-2">
                <CopyToken name={`--pw-z-${n}`} className="-ml-1.5" />
                <span className="font-mono text-pw-caption text-pw-muted">{v}</span>
              </li>
            ))}
          </ul>
        </Demo>
      </div>
      <Demo
        title="Motion"
        note="Entrances 150–450ms. Everything respects prefers-reduced-motion."
        code={`transition-transform duration-250 ease-pw-out   /* ${motion["ease-out"]} */`}
      >
        <div className="flex flex-col gap-4">
          {(["ease-out", "ease-spring"] as const).map((e) => (
            <div key={e} className="flex items-center gap-4">
              <CopyToken name={`--pw-${e}`} className="w-40 shrink-0" />
              <div className="relative h-10 flex-1 rounded-pw-pill bg-pw-surface-1">
                <span
                  className="absolute top-1 left-1 size-8 rounded-full bg-pw-primary transition-[left] duration-700 motion-reduce:transition-none"
                  style={{ left: run ? "calc(100% - 36px)" : "4px", transitionTimingFunction: `var(--pw-${e})` }}
                />
              </div>
            </div>
          ))}
          <div>
            <Button size="sm" onClick={() => setRun((r) => !r)}>
              Replay
            </Button>
          </div>
        </div>
      </Demo>
    </DocSection>
  );
}

// ---------- Formatting ----------

function Formatting() {
  const now = DEMO_NOW;
  const rows: Array<[string, string, string]> = [
    ["formatCompact(12_400)", "Stats on cards", formatCompact(12_400)],
    ["formatCompact(3_400_000)", "Stats on cards", formatCompact(3_400_000)],
    ["formatNumber(98_765_432)", "Tables, exact counts", formatNumber(98_765_432)],
    ["formatMoney(1250)", "Wallet, tips, checkout", formatMoney(1250)],
    ['formatCount(1, "play")', "Plurals", formatCount(1, "play")],
    ['formatCount(12_400, "play")', "Plurals", formatCount(12_400, "play")],
    ["formatRelative(5 min ago)", "Under 7 days", formatRelative(now - 5 * 60_000, now)],
    ["formatRelative(2 days ago)", "Under 7 days", formatRelative(now - 2 * 86_400_000, now)],
    ["formatRelative(10 days ago)", "Older: full date", formatRelative(now - 10 * 86_400_000, now)],
    ["formatDate(iso)", "Full date (tooltip)", formatDate("2026-11-08T14:25:00Z")],
    ["formatDateTime(iso)", "Date and time", formatDateTime("2026-11-08T14:25:00Z")],
  ];
  return (
    <DocSection
      id="format"
      eyebrow="Content"
      title="Formatting"
      description={
        <>
          Every number, amount and date goes through <code className="text-pw-text-soft">@/lib/format</code>. Locale
          en-US and UTC are fixed so the server and browser print the same thing. Titles clamp at 2 lines, names at 1
          line, with the full text in a <code className="text-pw-text-soft">title</code> attribute.
        </>
      }
    >
      <Table caption="Formatting functions with example output" density="compact">
        <THead>
          <TR>
            <TH>Call</TH>
            <TH>Use</TH>
            <TH numeric>Output</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map(([call, use, out]) => (
            <TR key={call}>
              <TD className="font-mono text-pw-caption">{call}</TD>
              <TD className="text-pw-text-soft">{use}</TD>
              <TD numeric className="font-semibold">
                {out}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </DocSection>
  );
}

// ---------- Icons ----------

function Icons() {
  return (
    <DocSection
      id="icons"
      eyebrow="Language"
      title="Icons"
      description="One set everywhere: Icons8 iOS Filled, drawn for 16, 20 and 24px, in components/icons.tsx. Icons are decorative (aria-hidden); icon-only buttons need an aria-label. Need a new glyph? Add it from the same set (ios-filled, 100px PNG) to public/assets/icons/ios-filled and components/icons.tsx. The free Icons8 licence asks for a link to icons8.com."
    >
      <Demo
        title="App icon set: Icons8 iOS Filled"
        note="components/icons.tsx, shipped on main. Icons take their colour from the surface (currentColor)."
        code={`import { IconHeart } from "@/components/icons";\n<IconHeart width={20} height={20} />`}
      >
        <div className="flex flex-col gap-4">
          {[
            ["On blue", "bg-pw-navy text-pw-mist-50"],
            ["On a cover", "bg-pw-night-900 text-pw-gold-soft"],
          ].map(([label, tone]) => (
            <section key={label}>
              <h4 className="mb-2 text-pw-caption font-semibold text-pw-muted">{label}</h4>
              <ul className={cn("grid grid-cols-2 gap-3 rounded-pw-lg p-4 sm:grid-cols-3 lg:grid-cols-5", tone)}>
                {ICON_GALLERY.map(({ name, Icon }) => (
                  <li key={`${label}-${name}`} className="flex items-center gap-3">
                    <span className="flex items-end gap-2">
                      {ICON_SIZES.map((size) => (
                        <Icon key={size} width={size} height={size} />
                      ))}
                    </span>
                    <span className="text-pw-caption">{name}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <div className="flex flex-wrap gap-6 rounded-pw-lg bg-pw-navy p-4 text-pw-body-sm text-pw-mist-50">
            <span className="flex items-center gap-2">
              <IconBookmark filled={false} width={24} height={24} />
              <IconBookmark width={24} height={24} />
              Bookmark (before / after saving)
            </span>
            <span className="flex items-center gap-2">
              <IconHeart filled={false} width={24} height={24} />
              <IconHeart width={24} height={24} />
              Heart (before / after liking)
            </span>
          </div>
        </div>
      </Demo>
    </DocSection>
  );
}

// ---------- Illustrations ----------

function Illustrations() {
  return (
    <DocSection
      id="illustrations"
      eyebrow="Language"
      title="Illustrations"
      description="Pixel art, night and folklore, palette from the tokens. Page-level empty and status states only; inline empties use an icon. Until each piece is drawn, a placeholder stands in and pages don’t wait. Sizes L 240, M 160, S 96. WebP files use image-rendering: pixelated."
    >
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {(Object.keys(ILLUSTRATIONS) as IllustrationName[]).map((n) => (
          <li
            key={n}
            className="flex flex-col items-center gap-3 rounded-pw-xl border border-pw-line bg-pw-surface-1 p-4 text-center"
          >
            <Illustration name={n} size="s" />
            <div>
              <p className="font-mono text-pw-caption text-pw-text">{n}</p>
              <p className="text-pw-caption text-pw-muted">{ILLUSTRATIONS[n].label}</p>
            </div>
            <Badge tone={hasIllustrationAsset(n) ? "success" : ILLUSTRATIONS[n].wave === 1 ? "warning" : "neutral"}>
              {hasIllustrationAsset(n) ? "Done" : `Wave ${ILLUSTRATIONS[n].wave}`}
            </Badge>
          </li>
        ))}
      </ul>
    </DocSection>
  );
}

// ---------- Brand ----------

function Brand() {
  return (
    <DocSection
      id="brand"
      eyebrow="Language"
      title="Brand"
      description="Use the official files; never retype the wordmark in a font. The SVG master replaces these WebP files when it’s ready. Favicon, OG image and auth email templates come in the next phase (D3)."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Demo title="Mark" note="playinweb-icon.png">
          <Image src="/playinweb-icon.png" alt="PlayInWeb mark" width={64} height={64} className="rounded-pw-md" />
        </Demo>
        <Demo title="Lettermark on dark" note="playinweb-lettermark-white.webp" bodyClassName="bg-pw-night-900">
          <Image src="/playinweb-lettermark-white.webp" alt="PlayInWeb" width={164} height={30} unoptimized />
        </Demo>
        <Demo title="Lettermark on light" note="playinweb-lettermark-black.webp" bodyClassName="bg-pw-day-50">
          <Image src="/playinweb-lettermark-black.webp" alt="PlayInWeb" width={164} height={30} unoptimized />
        </Demo>
      </div>
      <Demo title="Rules">
        <ul className="flex flex-col gap-2.5">
          <Rule kind="do">
            Mark + lettermark together in navs; the mark alone where space is tight (avatars, favicons).
          </Rule>
          <Rule kind="do">White lettermark on dark or on art; black on light.</Rule>
          <Rule kind="dont">Recolour, stretch, add effects, or set the name in Pixelify or any other font.</Rule>
        </ul>
      </Demo>
    </DocSection>
  );
}
