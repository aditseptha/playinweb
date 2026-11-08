import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Illustration, type IllustrationName } from "./illustration";

// Empty states are a call to action: say what's missing, why, and the one next step.
//
//   first-use   nothing has ever been here (creator's first game)    → large illustration + main CTA
//   user        the user emptied it or hasn't started (favorites)   → medium illustration + "Browse games"
//   no-results  filters or search matched nothing                    → small illustration + "Clear filters"
//   inline      inside a table, list or card                         → icon and text only, no illustration

type Kind = "first-use" | "user" | "no-results" | "inline";

const SIZE = { "first-use": "l", user: "m", "no-results": "s" } as const;

export function EmptyState({
  kind,
  illustration,
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  kind: Kind;
  /** Page-level kinds only. */
  illustration?: IllustrationName;
  /** Inline kind only. */
  icon?: LucideIcon;
  title: ReactNode;
  body?: ReactNode;
  /** One primary next step (a Button). Optionally a secondary one after it. */
  action?: ReactNode;
  className?: string;
}) {
  if (kind === "inline") {
    return (
      <div className={cn("flex flex-col items-center gap-2 px-4 py-6 text-center", className)}>
        {Icon ? <Icon aria-hidden className="size-6 text-pw-muted" /> : null}
        <p className="text-pw-body-sm font-semibold text-pw-text">{title}</p>
        {body ? <p className="max-w-sm text-pw-caption text-pw-muted">{body}</p> : null}
        {action ? <div className="mt-1">{action}</div> : null}
      </div>
    );
  }

  const size = SIZE[kind];
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        size === "l" ? "gap-5 py-16" : size === "m" ? "gap-4 py-12" : "gap-3 py-8",
        className,
      )}
    >
      {illustration ? <Illustration name={illustration} size={size} /> : null}
      <div className="flex max-w-md flex-col gap-1.5">
        <h2
          className={cn(
            "font-bold text-pw-text [text-wrap:balance]",
            size === "s" ? "text-pw-title" : "text-pw-heading",
          )}
        >
          {title}
        </h2>
        {body ? <p className="text-pw-body text-pw-muted [text-wrap:pretty]">{body}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

// ---------- StatusPage (template T7) ----------

type Status = "error" | "not-found" | "sign-in" | "no-access" | "coming-soon";

const STATUS: Record<Status, { illustration: IllustrationName; eyebrow: string; title: string; body: string }> = {
  error: {
    illustration: "error",
    eyebrow: "Error",
    title: "Something went wrong",
    body: "This page didn’t load. Try again, or head back home.",
  },
  "not-found": {
    illustration: "not-found",
    eyebrow: "404",
    title: "Nothing at this address",
    body: "The page or game may have moved or been removed.",
  },
  "sign-in": {
    illustration: "sign-in",
    eyebrow: "Sign in",
    title: "Sign in to continue",
    body: "Your games, saves and wallet live in your account.",
  },
  "no-access": {
    illustration: "coming-soon",
    eyebrow: "No access",
    title: "You don’t have access",
    body: "This page is for a different account. Switch accounts or head back home.",
  },
  "coming-soon": {
    illustration: "coming-soon",
    eyebrow: "Coming soon",
    title: "This isn’t open yet",
    body: "We’re still building it. Check back soon.",
  },
};

/** Full-page status: 404, error, sign in required, no access, feature locked. */
export function StatusPage({
  status,
  title,
  body,
  actions,
  errorId,
  fullHeight = true,
  className,
}: {
  status: Status;
  title?: ReactNode;
  body?: ReactNode;
  /** Always offer a way out: retry, home, sign in. */
  actions: ReactNode;
  /** Error digest, so a report can be matched to logs. */
  errorId?: string;
  /** Fill most of the viewport (default). Off when shown inside another layout. */
  fullHeight?: boolean;
  className?: string;
}) {
  const s = STATUS[status];
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-xl flex-col items-center justify-center gap-6 px-6 py-16 text-center",
        fullHeight && "min-h-[60dvh]",
        className,
      )}
    >
      <Illustration name={s.illustration} size="l" />
      <div className="flex flex-col items-center gap-2">
        <p className="font-pw-pixel text-pw-label tracking-[0.06em] text-pw-highlight-ink uppercase">{s.eyebrow}</p>
        <h1 className="font-pw-display text-pw-display-l font-extrabold text-pw-text uppercase italic [text-wrap:balance]">
          {title ?? s.title}
        </h1>
        <p className="max-w-md text-pw-body text-pw-muted [text-wrap:pretty]">{body ?? s.body}</p>
        {errorId ? <p className="text-pw-caption text-pw-faint">Error ID: {errorId}</p> : null}
      </div>
      <div className="flex flex-wrap justify-center gap-3">{actions}</div>
    </div>
  );
}
