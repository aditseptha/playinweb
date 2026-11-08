# PlayInWeb design system

Live reference: **`/admin/design`** (open on localhost and Vercel previews; admin-only in production).
Plan and decisions: GitHub issue #3. Page redesigns that use it: #4. Game media standards: #5.

## Principles

1. **Game first, chrome second.** Cover art and Play are the loudest things on screen.
2. **A warm night.** Deep blue and gold, never cold black. Gold is for the spotlight, blue is for action.
3. **Creators up front.** A creator's name and face are always visible.
4. **One language, every state.** Same component, same behaviour. Loading, empty and error get the same care.

## Using it

- **Tokens** live in `lib/tokens.ts`. Run `npm run tokens` after editing; it writes `app/tokens.css` (commit both).
  Use the Tailwind utilities (`bg-pw-surface-1`, `text-pw-muted`, `text-pw-body`, `rounded-pw-lg`, `shadow-pw-2`,
  `font-pw-display`) or `var(--pw-*)`. Never a raw hex or rgba in DS code (`npm run check:hex` enforces it).
- **Fonts**: put `dsFontVars` from `app/fonts.ts` on the page root.
- **Components** are imported one file at a time: `import { Button } from "@/components/ds/button"`.
- **Formatting**: numbers, money and dates always go through `@/lib/format` (fixed en-US, UTC).

## Rules

- **Tailwind vs CSS Modules.** Layout, colour, spacing and type are Tailwind. A CSS Module is allowed only for effect
  layers (tilt, shine, glow, fog) and must use tokens. Example: `game-card.module.css`.
- **Props.** `variant`, `size`, `tone`, `loading`, `disabled`; `asChild` renders a child (e.g. a Next `Link`) with the
  component's styling. `className` is for layout (margin, width, position), not for overriding a variant. If you need a
  different look, add a variant.
- **Server vs client.** Display components (GameCard, Badge, Avatar, Skeleton, EmptyState, templates) render on the
  server. Interactive ones and anything built on Radix are client components.
- **Hover is never the only way.** Every hover interaction has a touch and a keyboard path. Tailwind's `hover:` already
  only applies on devices that hover; in CSS use `@media (hover: hover)`.
- **Touch targets** are at least 44px; small controls grow their hit area (`hitArea` in `styles.ts`), not their look.
- **States.** Pages show their template's skeleton, never a bare "Loading…". Empty states use `EmptyState` with one next
  step. Errors and 404 / sign in / no access / coming soon use `StatusPage`.

## Changing the DS

1. Check whether an existing variant covers it before adding a component.
2. Open a PR with the `design-system` label. Say which principle supports the change.
3. Add the example to `/admin/design` and an entry to `components/ds/changelog.ts` if anyone's usage has to change.
4. CI must pass (contrast test, raw-colour check, axe, keyboard tests, screenshots). Adit reviews.

## Browser support

Safari/iOS 16.4+, Chrome/Edge 111+, Firefox 128+ (Tailwind v4's floor). Newer CSS such as scroll-driven animation and
`backdrop-filter` is an extra behind `@supports`; the page must still work without it.

## Brand outputs

- **Link previews**: `lib/og.tsx` draws the site-wide (`app/opengraph-image.tsx`) and per-game Open Graph images.
  Satori reads PNG and JPEG covers only; other formats fall back to the branded background.
- **Auth emails**: edit `lib/email-templates.ts`, run `npm run emails`, commit `supabase/templates/*.html`
  (CI checks they match). Installing them in Supabase is described in `supabase/templates/README.md`.
- **Performance**: the Lighthouse baseline and per-template targets are in `docs/lighthouse-baseline.md`.

Files in a `public/` subfolder are served under a path that the proxy could read as a creator handle. Reserve the
folder name in `RESERVED_HANDLES` (`lib/host.ts`) first, as done for `illustrations`, or keep the file at the top level.
