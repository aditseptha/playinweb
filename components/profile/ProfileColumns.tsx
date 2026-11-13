import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// The shared layout of the public profile and Your channel (#39). Only the behaviour is shared:
// content on the left, a sticky sidebar (the Badges panel) on the right from lg up, and a choice of
// where the sidebar goes on phones. Each page keeps its own header and styling.

export function ProfileColumns({
  main,
  side,
  sideFirstOnPhone = false,
  className,
}: {
  main: ReactNode;
  /** Nothing to put beside the content (signed out): the content takes the full width. */
  side?: ReactNode;
  /** Your channel shows badges before the play history on phones; the public profile shows games first. */
  sideFirstOnPhone?: boolean;
  className?: string;
}) {
  if (!side) return <div className={cn("min-w-0", className)}>{main}</div>;
  return (
    <div className={cn("grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]", className)}>
      <div className={cn("min-w-0", sideFirstOnPhone && "order-2 lg:order-1")}>{main}</div>
      <aside className={cn("min-w-0 lg:sticky lg:top-24", sideFirstOnPhone && "order-1 lg:order-2")}>{side}</aside>
    </div>
  );
}
