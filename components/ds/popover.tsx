"use client";

import { Popover as RPopover } from "radix-ui";
import { cn } from "@/lib/cn";
import { usePortalContainer } from "./portal";
import { floatingSurface, focusRing } from "./styles";

// A small panel anchored to a button: share links, quick filters, "who made this".
// Not for actions (use Menu) or long tasks (use Dialog or Sheet). Esc closes and returns focus.

export const Popover = RPopover.Root;
export const PopoverTrigger = RPopover.Trigger;
export const PopoverClose = RPopover.Close;

export function PopoverContent({
  className,
  sideOffset = 8,
  align = "center",
  ...props
}: React.ComponentProps<typeof RPopover.Content>) {
  const container = usePortalContainer();
  return (
    <RPopover.Portal container={container}>
      <RPopover.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-[var(--pw-z-dropdown)] w-72 max-w-[calc(100vw-32px)] rounded-pw-lg p-4 text-pw-body-sm",
          "motion-safe:animate-[pw-fade-in_0.15s_var(--pw-ease-out)]",
          floatingSurface,
          focusRing,
          className,
        )}
        {...props}
      />
    </RPopover.Portal>
  );
}
