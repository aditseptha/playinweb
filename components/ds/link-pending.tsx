"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

/**
 * Put inside a <Link> that covers a card. While the page it opens is loading, the card dims and a
 * spinner sits in the middle, so a tap never looks ignored (#45). Game and profile pages have no
 * loading.tsx, so without this the card would just sit there.
 *
 * Always rendered at full size and faded in, so it never shifts the layout.
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      data-pending={pending ? "" : undefined}
      className={cn(
        "pointer-events-none absolute inset-0 grid place-items-center rounded-[inherit] bg-pw-overlay opacity-0",
        "transition-opacity duration-150 ease-pw-out data-[pending]:opacity-100 motion-reduce:transition-none",
        className,
      )}
    >
      {pending ? (
        <span className="grid size-11 place-items-center rounded-pw-pill bg-pw-overlay text-pw-on-art">
          <Spinner size="md" label="" />
        </span>
      ) : null}
    </span>
  );
}
