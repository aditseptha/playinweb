"use client";

import { X } from "lucide-react";
import { Dialog as RDialog } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { usePortalContainer } from "./portal";
import { floatingSurface, focusRing } from "./styles";

// A panel that slides in from an edge. Bottom on phones (filters, menus, long-press detail),
// right on wider screens for side tasks. Same focus behaviour as Dialog.

export const Sheet = RDialog.Root;
export const SheetTrigger = RDialog.Trigger;
export const SheetClose = RDialog.Close;

export function SheetContent({
  title,
  description,
  side = "bottom",
  children,
  footer,
  className,
  ...props
}: Omit<React.ComponentProps<typeof RDialog.Content>, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  side?: "bottom" | "right";
  footer?: ReactNode;
}) {
  const container = usePortalContainer();
  return (
    <RDialog.Portal container={container}>
      <RDialog.Overlay className="fixed inset-0 z-[var(--pw-z-sheet)] bg-pw-overlay" />
      <RDialog.Content
        className={cn(
          "fixed z-[var(--pw-z-sheet)] flex flex-col",
          floatingSurface,
          side === "bottom" &&
            "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-pw-2xl pb-[env(safe-area-inset-bottom)] motion-safe:animate-[pw-sheet-up_0.3s_var(--pw-ease-out)]",
          side === "right" &&
            "inset-y-0 right-0 w-[min(420px,100vw)] rounded-l-pw-2xl motion-safe:animate-[pw-sheet-left_0.3s_var(--pw-ease-out)]",
          focusRing,
          className,
        )}
        {...props}
      >
        {side === "bottom" ? (
          <span aria-hidden className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-pw-line-strong" />
        ) : null}
        <div className="flex items-start gap-4 px-5 pt-4">
          <div className="min-w-0 flex-1">
            <RDialog.Title className="text-pw-title font-bold">{title}</RDialog.Title>
            {description ? (
              <RDialog.Description className="mt-1 text-pw-body-sm text-pw-muted">{description}</RDialog.Description>
            ) : null}
          </div>
          <RDialog.Close asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close" className="-mr-2">
              <X />
            </Button>
          </RDialog.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="flex gap-2 border-t border-pw-line p-4 [&>*]:flex-1">{footer}</div> : null}
      </RDialog.Content>
    </RDialog.Portal>
  );
}
