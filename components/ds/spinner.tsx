import { cn } from "@/lib/cn";

const SIZES = { sm: "size-4", md: "size-5", lg: "size-8" } as const;

/** Indeterminate progress. Use inside buttons and small sections; pages use skeletons. */
export function Spinner({
  size = "md",
  label = "Loading",
  className,
}: {
  size?: keyof typeof SIZES;
  /** Read by screen readers. Pass "" when a parent already announces the busy state. */
  label?: string;
  className?: string;
}) {
  return (
    <span role={label ? "status" : undefined} aria-label={label || undefined} className={cn("inline-grid", className)}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className={cn(SIZES[size], "animate-spin motion-reduce:animate-[spin_1.6s_linear_infinite]")}
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}
