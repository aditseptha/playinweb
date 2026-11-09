import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import Link from "next/link";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { focusRing } from "./styles";

// Two ways through long lists:
//   LoadMore    catalogue grids (players browse; keep their scroll position)
//   Pagination  tables in creator and admin areas (people come back to "page 3")

/** Page numbers to show: always first and last, the current page and its neighbours, gaps as null. */
export function pageWindow(page: number, pages: number): Array<number | null> {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...keep].sort((a, b) => a - b);
  const out: Array<number | null> = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}

export function Pagination({
  page,
  pages,
  hrefFor,
  className,
}: {
  page: number;
  pages: number;
  /** Builds the link for a page, so pages are shareable and work without JavaScript. */
  hrefFor: (page: number) => string;
  className?: string;
}) {
  if (pages <= 1) return null;
  const cell = cn(
    "grid h-11 min-w-11 place-items-center rounded-pw-md px-3 text-pw-body-sm font-semibold tabular-nums",
    focusRing,
  );
  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-center gap-1", className)}>
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          aria-label="Previous page"
          className={cn(cell, "text-pw-text-soft hover:bg-pw-surface-2")}
        >
          <IconChevronLeft aria-hidden className="size-4" />
        </Link>
      ) : (
        <span aria-hidden className={cn(cell, "text-pw-faint")}>
          <IconChevronLeft className="size-4" />
        </span>
      )}
      <ol className="flex items-center gap-1">
        {pageWindow(page, pages).map((n, i) =>
          n === null ? (
            <li key={`gap-${i}`} aria-hidden className="grid h-11 w-6 place-items-center text-pw-muted">
              …
            </li>
          ) : (
            <li key={n}>
              <Link
                href={hrefFor(n)}
                aria-label={`Page ${n}`}
                aria-current={n === page ? "page" : undefined}
                className={cn(
                  cell,
                  n === page
                    ? "bg-pw-primary text-pw-on-primary"
                    : "text-pw-text-soft hover:bg-pw-surface-2 hover:text-pw-text",
                )}
              >
                {n}
              </Link>
            </li>
          ),
        )}
      </ol>
      {page < pages ? (
        <Link
          href={hrefFor(page + 1)}
          aria-label="Next page"
          className={cn(cell, "text-pw-text-soft hover:bg-pw-surface-2")}
        >
          <IconChevronRight aria-hidden className="size-4" />
        </Link>
      ) : (
        <span aria-hidden className={cn(cell, "text-pw-faint")}>
          <IconChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}

/** "Showing 24 of 120" plus a Load more button. Hidden once everything is shown. */
export function LoadMore({
  shown,
  total,
  loading = false,
  onLoadMore,
  noun = "games",
  className,
}: {
  shown: number;
  total: number;
  loading?: boolean;
  onLoadMore: () => void;
  noun?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <p className="text-pw-caption text-pw-muted tabular-nums" aria-live="polite">
        Showing {formatNumber(Math.min(shown, total))} of {formatNumber(total)} {noun}
      </p>
      {shown < total ? (
        <Button onClick={onLoadMore} loading={loading}>
          Load more
        </Button>
      ) : null}
    </div>
  );
}
