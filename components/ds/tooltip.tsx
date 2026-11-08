"use client";

import { Tooltip as RTooltip } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { usePortalContainer } from "./portal";

// Short supporting text on hover and keyboard focus. Never put the only copy of important
// information in a tooltip: touch screens don't hover.

export const TooltipProvider = RTooltip.Provider;

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: ReactNode;
  /** A focusable element (button, link). */
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  const container = usePortalContainer();
  return (
    <RTooltip.Root delayDuration={300}>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal container={container}>
        <RTooltip.Content
          side={side}
          sideOffset={6}
          className={cn(
            "z-[var(--pw-z-tooltip)] max-w-64 rounded-pw-sm bg-pw-mist-50 px-2.5 py-1.5 text-pw-caption font-medium text-pw-navy shadow-pw-2",
          )}
        >
          {content}
          <RTooltip.Arrow className="fill-pw-mist-50" />
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}
