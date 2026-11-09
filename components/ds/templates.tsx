import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Page templates T1–T6 (T7 is StatusPage in empty-state.tsx). They set the grid, max width,
// page title style and section rhythm; pages fill the slots. Each has a matching skeleton in
// skeleton.tsx with the same footprint.

/** Page title block. One per page. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 font-pw-pixel text-pw-label tracking-[0.06em] text-pw-highlight-ink uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-pw-display text-pw-display-l font-extrabold text-pw-text uppercase italic [text-wrap:balance]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-pw-body text-pw-muted [text-wrap:pretty]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

/** Section heading inside a page, with an optional "See all" or tools on the right. */
export function SectionHeader({
  title,
  action,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <h2 className="text-pw-heading font-bold text-pw-text">{title}</h2>
      {action}
    </div>
  );
}

const page = "mx-auto w-full max-w-[1440px] px-4 md:px-6";

/** T1 Catalogue: hero, optional filter rail, then sections of cards. */
export function CatalogTemplate({
  hero,
  rail,
  toolbar,
  children,
  className,
}: {
  hero?: ReactNode;
  /** Filter rail on desktop (≥1024px). Pages move it into a Sheet on smaller screens. */
  rail?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-8 pb-16", className)}>
      {hero}
      <div className={cn(page, rail ? "lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8" : null)}>
        {rail ? <aside className="hidden lg:block">{rail}</aside> : null}
        <div className="flex min-w-0 flex-col gap-10">
          {toolbar}
          {children}
        </div>
      </div>
    </div>
  );
}

/** T2 Detail: large media first, details in an aside that drops below on phones. */
export function DetailTemplate({
  media,
  aside,
  children,
  className,
}: {
  media: ReactNode;
  aside: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(page, "grid gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-8", className)}>
      <div className="flex min-w-0 flex-col gap-6">
        {media}
        {children}
      </div>
      <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:self-start">{aside}</aside>
    </div>
  );
}

/** T3 Dashboard: header, a row of stats, then tables. Uses compact tables. */
export function DashboardTemplate({
  header,
  stats,
  children,
  className,
}: {
  header: ReactNode;
  stats?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(page, "flex flex-col gap-8 py-8", className)}>
      {header}
      {stats ? <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{stats}</div> : null}
      <div className="flex min-w-0 flex-col gap-8">{children}</div>
    </div>
  );
}

/** T4 Form: one column, grouped into sections, with the save bar at the bottom. */
export function FormTemplate({
  header,
  children,
  saveBar,
  className,
}: {
  header: ReactNode;
  children: ReactNode;
  /** Usually <SaveBar>. Sticks to the bottom of the viewport on long forms. */
  saveBar?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-2xl px-4 py-8 md:px-6", className)}>
      {header}
      <div className="mt-8 flex flex-col gap-10">{children}</div>
      {saveBar}
    </div>
  );
}

/** A titled group of fields inside a form. */
export function FormSection({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="text-pw-title font-bold text-pw-text">{title}</h2>
        {description ? <p className="mt-1 text-pw-body-sm text-pw-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Sticky bar with the explicit Save action and the unsaved-changes marker. */
export function SaveBar({ dirty, children }: { dirty: boolean; children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-[var(--pw-z-nav)] -mx-4 mt-10 flex items-center justify-between gap-3 border-t border-pw-line bg-[color-mix(in_srgb,var(--pw-bg)_92%,transparent)] px-4 py-3 backdrop-blur-md md:-mx-6 md:px-6">
      <p className="text-pw-body-sm text-pw-muted" aria-live="polite">
        {dirty ? (
          <span className="inline-flex items-center gap-2 text-pw-text">
            <span aria-hidden className="size-2 rounded-full bg-pw-highlight" />
            Unsaved changes
          </span>
        ) : (
          "All changes saved"
        )}
      </p>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

/** T5 Auth: a centred card on the page background. */
export function AuthTemplate({
  children,
  fullHeight = true,
  className,
}: {
  children: ReactNode;
  fullHeight?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("grid place-items-center px-4 py-12", fullHeight && "min-h-[80dvh]", className)}>
      <div className="w-full max-w-sm rounded-pw-2xl border border-pw-line bg-pw-surface-1 p-6 shadow-pw-2 sm:p-8">
        {children}
      </div>
    </div>
  );
}

/** T6 Document: long reading text (privacy, terms) at a comfortable measure. */
export function DocTemplate({
  title,
  updated,
  children,
  className,
}: {
  title: ReactNode;
  /** e.g. "Updated Nov 8, 2026" (use formatDate). */
  updated?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("mx-auto w-full max-w-[68ch] px-4 py-12 md:px-6", className)}>
      <h1 className="font-pw-display text-pw-display-l font-extrabold text-pw-text uppercase italic">{title}</h1>
      {updated ? <p className="mt-2 text-pw-caption text-pw-muted">{updated}</p> : null}
      <div className="mt-8 flex flex-col gap-4 text-pw-body text-pw-text-soft [&_h2]:mt-6 [&_h2]:text-pw-title [&_h2]:font-bold [&_h2]:text-pw-text [&_a]:text-pw-link [&_a]:underline">
        {children}
      </div>
    </article>
  );
}
