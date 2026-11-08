import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Rows of mixed content: notifications, settings, a creator's games on mobile.
// For columns of data use Table; for game listings use GameCard (row variant).

export function List({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <ul
      aria-label={label}
      className={cn(
        "overflow-hidden rounded-pw-xl border border-pw-line bg-pw-surface-1 [&>li+li]:border-t [&>li+li]:border-pw-line",
        className,
      )}
    >
      {children}
    </ul>
  );
}

export function ListItem({
  leading,
  title,
  description,
  trailing,
  href,
  unread = false,
}: {
  leading?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  /** Makes the whole row a link, with a chevron. */
  href?: string;
  /** Notification style: a dot and bold title. */
  unread?: boolean;
}) {
  const body = (
    <>
      {leading ? <span className="shrink-0">{leading}</span> : null}
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-pw-body text-pw-text", unread ? "font-bold" : "font-medium")}>
          {title}
        </span>
        {description ? <span className="mt-0.5 block text-pw-caption text-pw-muted">{description}</span> : null}
      </span>
      {trailing ? <span className="shrink-0 text-pw-caption text-pw-muted">{trailing}</span> : null}
      {unread ? (
        <>
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-pw-primary-hi" />
          <span className="sr-only">Unread</span>
        </>
      ) : null}
      {href ? <ChevronRight aria-hidden className="size-4 shrink-0 text-pw-faint" /> : null}
    </>
  );
  return (
    <li>
      {href ? (
        <Link
          href={href}
          className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-pw-surface-2 focus-visible:bg-pw-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pw-focus-ring"
        >
          {body}
        </Link>
      ) : (
        <div className="flex min-h-14 items-center gap-3 px-4 py-3">{body}</div>
      )}
    </li>
  );
}
