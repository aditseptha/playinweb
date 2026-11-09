# Lighthouse baseline

Measured on production (`www.playinweb.com`) on 2026-11-09 with Lighthouse 12.6, before the redesign (#4).
Mobile uses Lighthouse's default throttling (slow 4G, 4× CPU); desktop uses `--preset=desktop`.
Scores are Performance / Accessibility / Best practices / SEO.

| Page | Template | Mobile | Desktop | Mobile LCP | Mobile CLS | Mobile TBT |
|---|---|---|---|---|---|---|
| Home `/` | T1 Catalogue | **27** / 98 / 100 / 100 | 73 / 98 / 100 / 100 | 6.7 s | **0.214** | **9,600 ms** |
| Game `/kikiew/ayam-kabur` | T2 Detail | 76 / **92** / 100 / 100 | 93 / 93 / 100 / 100 | 5.5 s | 0 | 20 ms |
| Login `/login` | T5 Auth | 95 / 96 / 100 / 100 | 99 / 96 / 100 / 100 | 2.7 s | 0 | 40 ms |
| Manage `/manage` (signed out) | T3 Dashboard | 90 / 100 / 100 / 100 | 99 / 96 / 100 / 100 | 3.4 s | 0 | 70 ms |

## What drags the numbers down

**Home, mobile performance (27).**
- Almost all of the 9.6 s blocking time is rendering work Lighthouse can't tie to a script ("Unattributable" / "Other" on the main thread). JavaScript is only about 1 s of it.
- The likely sources are the homepage's continuous effects: the blurred fog, the fireflies, `backdrop-filter` on cards and pills, and the long drift animation on the hero art.
- The LCP element is the hero image (6.7 s on slow 4G).

**Home, layout shift (0.214).**
- The whole shift comes from a `.reveal` section (the scroll-driven entrance), which moves content after first paint.

**Accessibility.**
- Game page: 7 colour-contrast failures and 1 link without a name.
- Login: 2 colour-contrast failures.
- Manage: 3 colour-contrast failures.
- Home: one skipped heading level.

All of these are on pages that still use the old styles. The DS tokens pass contrast by test, so they should disappear as each page moves over in #4.

## Targets

To be met by each page's redesign PR in #4.

| Template | Mobile performance | Desktop performance | Accessibility | CLS | Mobile TBT |
|---|---|---|---|---|---|
| T1 Catalogue (home, top, library) | ≥ 70 | ≥ 90 | ≥ 95 | < 0.1 | < 600 ms |
| T2 Detail (game, creator site) | ≥ 80 | ≥ 95 | ≥ 95 | < 0.1 | < 300 ms |
| T3–T6 (dashboards, forms, auth, documents) | ≥ 90 | ≥ 95 | ≥ 95 | < 0.1 | < 300 ms |

Best practices and SEO stay at 100.

**Why mobile T1 aims at 70 and not 90:** the catalogue is image-heavy by design ("Game first"). Getting from 27 to 70 means:
- pausing the continuous effects when they're off screen, and dropping the blur on phones;
- preloading the hero image at a phone-sized width;
- making the reveal animation transform-only, so nothing shifts.

Re-measure in each redesign PR and update this file.
