"use client";

import { IconClose } from "@/components/icons";
import { Dialog as RDialog } from "radix-ui";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useLeaveFullscreen } from "@/lib/fullscreen";
import { Button } from "./button";
import { TextInput } from "./field";
import { usePortalContainer } from "./portal";
import { floatingSurface, focusRing } from "./styles";

// Radix handles the hard parts: focus moves in and stays in, Esc closes, focus returns to
// the button that opened it, and the page behind is hidden from screen readers.

export const Dialog = RDialog.Root;
export const DialogTrigger = RDialog.Trigger;
export const DialogClose = RDialog.Close;

const overlay =
  "fixed inset-0 z-[var(--pw-z-dialog)] bg-pw-overlay backdrop-blur-[2px] motion-safe:animate-[pw-fade-in_0.2s_var(--pw-ease-out)]";

export function DialogContent({
  title,
  description,
  children,
  footer,
  size = "md",
  className,
  ...props
}: Omit<React.ComponentProps<typeof RDialog.Content>, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const container = usePortalContainer();
  return (
    <RDialog.Portal container={container}>
      <RDialog.Overlay className={overlay} />
      <RDialog.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-[var(--pw-z-dialog)] flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-pw-2xl",
          floatingSurface,
          size === "sm" && "max-w-sm",
          size === "md" && "max-w-lg",
          size === "lg" && "max-w-2xl",
          "motion-safe:animate-[pw-dialog-in_0.25s_var(--pw-ease-out)]",
          focusRing,
          className,
        )}
        {...props}
      >
        <LeaveFullscreen />
        <div className="flex items-start gap-4 p-6 pb-0">
          <div className="min-w-0 flex-1">
            <RDialog.Title className="text-pw-title font-bold text-pw-text">{title}</RDialog.Title>
            {description ? (
              <RDialog.Description className="mt-1.5 text-pw-body-sm text-pw-muted">{description}</RDialog.Description>
            ) : null}
          </div>
          <RDialog.Close asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close" className="-mt-1 -mr-2">
              <IconClose />
            </Button>
          </RDialog.Close>
        </div>
        <div className="min-h-0 overflow-y-auto p-6">{children}</div>
        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-pw-line p-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </RDialog.Content>
    </RDialog.Portal>
  );
}

/** Mounted inside the open dialog only: a fullscreen game would hide the dialog (#38). */
function LeaveFullscreen() {
  useLeaveFullscreen(true);
  return null;
}

/**
 * Confirmation for destructive actions. Pass `confirmText` (e.g. the game title) to make the
 * user type it before the button unlocks: required for deleting a game.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  confirmText,
  onConfirm,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: string;
  confirmText?: string;
  onConfirm: () => void;
  busy?: boolean;
}) {
  const [typed, setTyped] = useState("");
  const locked = confirmText !== undefined && typed.trim() !== confirmText.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped("");
        onOpenChange(next);
      }}
    >
      <DialogContent
        size="sm"
        title={title}
        description={description}
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button variant="danger" disabled={locked} loading={busy} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </>
        }
      >
        {confirmText !== undefined ? (
          <label className="flex flex-col gap-1.5 text-pw-body-sm text-pw-text-soft">
            <span>
              Type <b className="text-pw-text">{confirmText}</b> to confirm
            </span>
            <TextInput value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
          </label>
        ) : (
          <p className="text-pw-body-sm text-pw-text-soft">This can’t be undone.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
