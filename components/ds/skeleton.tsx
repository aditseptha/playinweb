import { cn } from "@/lib/cn";

// Loading placeholders. Pages show the skeleton of their template (below) instead of
// a "Loading…" line, so the layout is already in place when content arrives.

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-pw-md bg-pw-surface-3 motion-safe:animate-pulse", className)} {...props} />;
}

/** Announces the loading state once for the whole skeleton. */
function Busy({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className={cn("min-w-0", className)}>
      {children}
    </div>
  );
}

/** T1 Catalogue: hero, a row of filters, a grid of cards. */
export function CatalogSkeleton({ label = "Loading games" }: { label?: string }) {
  return (
    <Busy label={label} className="space-y-6">
      <Skeleton className="aspect-[21/9] w-full rounded-pw-2xl" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-24 rounded-pw-pill" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="aspect-video rounded-pw-xl" />
        ))}
      </div>
    </Busy>
  );
}

/** T2 Detail: big media with an aside. */
export function DetailSkeleton({ label = "Loading game" }: { label?: string }) {
  return (
    <Busy label={label} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <Skeleton className="aspect-video w-full rounded-pw-2xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-pw-pill" />
        <Skeleton className="h-40 w-full rounded-pw-xl" />
      </div>
    </Busy>
  );
}

/** T3 Dashboard: header, stats, table rows. */
export function DashboardSkeleton({ label = "Loading", rows = 5 }: { label?: string; rows?: number }) {
  return (
    <Busy label={label} className="space-y-6">
      <Skeleton className="h-9 w-56" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-pw-xl" />
        ))}
      </div>
      <TableSkeletonRows rows={rows} />
    </Busy>
  );
}

/** T4 Form: label + control pairs and the save bar. */
export function FormSkeleton({ label = "Loading form", fields = 4 }: { label?: string; fields?: number }) {
  return (
    <Busy label={label} className="mx-auto max-w-2xl space-y-6">
      <Skeleton className="h-9 w-64" />
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
      <Skeleton className="ml-auto h-11 w-32 rounded-pw-pill" />
    </Busy>
  );
}

/** T5 Auth: a centred card. */
export function AuthSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <Busy label={label} className="mx-auto w-full max-w-sm space-y-4 rounded-pw-2xl border border-pw-line p-6">
      <Skeleton className="mx-auto h-10 w-10 rounded-pw-md" />
      <Skeleton className="mx-auto h-6 w-40" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full rounded-pw-pill" />
    </Busy>
  );
}

/** Rows for a table or list that is loading on its own. */
export function TableSkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden className="overflow-hidden rounded-pw-xl border border-pw-line">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-pw-line px-4 py-3.5 last:border-b-0">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/5" />
          <Skeleton className="ml-auto h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
