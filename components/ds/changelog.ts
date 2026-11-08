// "What's new" on /admin/design. Add an entry in every PR labelled `design-system` that
// renames, removes or changes a token, prop or variant, so people working on the redesign
// (#4) know what moved. Newest first.

export type ChangelogEntry = {
  date: string;
  title: string;
  changes: string[];
  /** True when existing usage has to change. */
  breaking?: boolean;
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-11-09",
    title: "Remaining components, link previews and auth emails (D3, part 1)",
    changes: [
      "New components: Popover, Breadcrumb, Pagination, LoadMore, List, FileUpload, TopNav, Sidebar, MenuSheet, BrandLink.",
      "formatBytes in lib/format for upload sizes.",
      "Open Graph images from lib/og.tsx: site-wide and per game.",
      "Auth email templates from lib/email-templates.ts, written to supabase/templates by npm run emails.",
    ],
  },
  {
    date: "2026-11-08",
    title: "Design system foundations and core components (D1 + D2)",
    changes: [
      "Tokens in lib/tokens.ts, generated into app/tokens.css with the --pw-* prefix and Tailwind utilities (bg-pw-*, text-pw-*, rounded-pw-*, shadow-pw-*).",
      "Fonts: Plus Jakarta Sans, Barlow Condensed, Silkscreen (app/fonts.ts). Pixelify is gone; the homepage logo uses the official lettermark.",
      "Formatting: formatCompact, formatNumber, formatMoney, formatCount, formatDate, formatDateTime, formatRelative in lib/format.",
      "Components in components/ds: Button, Field controls, Tabs, Badge, Chip, Avatar, GameCard, SlotCard, Dialog, ConfirmDialog, Sheet, Menu, Tooltip, Toast, Table, Skeleton, ProgressBar, InlineAlert, Stat, OfflineBanner, EmptyState, StatusPage, RequireAuth.",
      "Templates T1–T7 with matching skeletons, plus FormSection and SaveBar for form pages.",
      "Homepage moved onto the tokens; breakpoints now follow Tailwind (768 / 1024).",
    ],
  },
];
