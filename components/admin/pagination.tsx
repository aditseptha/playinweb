"use client";

export const ADMIN_TABLE_PAGE_SIZE = 10;

export function paginateSlice<T>(items: T[], page: number): T[] {
  const start = page * ADMIN_TABLE_PAGE_SIZE;
  return items.slice(start, start + ADMIN_TABLE_PAGE_SIZE);
}

export function adminTablePageCount(totalItems: number) {
  return Math.max(1, Math.ceil(totalItems / ADMIN_TABLE_PAGE_SIZE));
}

export function TablePagination({
  page,
  totalItems,
  onPageChange,
}: {
  page: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems <= ADMIN_TABLE_PAGE_SIZE) return null;

  const totalPages = adminTablePageCount(totalItems);
  const from = page * ADMIN_TABLE_PAGE_SIZE + 1;
  const to = Math.min(totalItems, (page + 1) * ADMIN_TABLE_PAGE_SIZE);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-caption text-text-subtle">
      <span className="tabular-nums">
        {from}–{to} of {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <span className="tabular-nums">
          Page {page + 1} / {totalPages}
        </span>
        <button
          type="button"
          className="rounded-lg border border-border bg-surface-1 px-3 py-1.5 font-medium text-text enabled:hover:bg-surface-2 disabled:opacity-40"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="rounded-lg border border-border bg-surface-1 px-3 py-1.5 font-medium text-text enabled:hover:bg-surface-2 disabled:opacity-40"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
