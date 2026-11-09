"use client";

import { IconAlertCircle, IconCheckCircle, IconClose, IconInfo } from "@/components/icons";
import { Toast as RToast } from "radix-ui";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { usePortalContainer } from "./portal";
import { floatingSurface, focusRing } from "./styles";

// Small, temporary confirmation of an action ("Saved", "Removed from favorites"). Failed
// actions use tone "danger" and offer a retry. Anything the user must act on belongs in the
// page or a dialog, not a toast.

type Tone = "info" | "success" | "danger";
type ToastInput = {
  title: ReactNode;
  description?: ReactNode;
  tone?: Tone;
  action?: { label: string; onClick: () => void };
};
type Item = ToastInput & { id: number };

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

export function useToast() {
  const push = useContext(ToastContext);
  if (!push) throw new Error("useToast needs <ToastProvider> above it.");
  return push;
}

const ICONS = { info: IconInfo, success: IconCheckCircle, danger: IconAlertCircle } as const;
const ICON_TONE = { info: "text-pw-link", success: "text-pw-success", danger: "text-pw-danger" } as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const push = useCallback((t: ToastInput) => {
    setItems((cur) => [...cur.slice(-2), { ...t, id: Date.now() + Math.random() }]);
  }, []);
  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      <RToast.Provider swipeDirection="down" duration={5000}>
        {children}
        {items.map((t) => (
          <ToastItem key={t.id} item={t} onClose={() => setItems((cur) => cur.filter((x) => x.id !== t.id))} />
        ))}
        <Viewport />
      </RToast.Provider>
    </ToastContext.Provider>
  );
}

function Viewport() {
  const container = usePortalContainer();
  const viewport = (
    <RToast.Viewport className="fixed bottom-0 left-1/2 z-[var(--pw-z-toast)] flex w-[min(420px,100vw)] -translate-x-1/2 flex-col gap-2 p-4 outline-none" />
  );
  // Inside a preview scope the viewport lives in the scoped container to pick up its theme.
  return container ? createPortal(viewport, container) : viewport;
}

function ToastItem({ item, onClose }: { item: Item; onClose: () => void }) {
  const tone = item.tone ?? "info";
  const Icon = ICONS[tone];
  return (
    <RToast.Root
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      type={tone === "danger" ? "foreground" : "background"}
      className={cn(
        "flex items-start gap-3 rounded-pw-lg p-4 motion-safe:animate-[pw-toast-in_0.25s_var(--pw-ease-out)]",
        "data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)] data-[swipe=end]:animate-none",
        floatingSurface,
      )}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", ICON_TONE[tone])} />
      <div className="min-w-0 flex-1">
        <RToast.Title className="text-pw-body-sm font-semibold">{item.title}</RToast.Title>
        {item.description ? (
          <RToast.Description className="mt-0.5 text-pw-caption text-pw-muted">{item.description}</RToast.Description>
        ) : null}
        {item.action ? (
          <RToast.Action altText={item.action.label} asChild>
            <button
              type="button"
              onClick={item.action.onClick}
              className={cn(
                "mt-2 text-pw-body-sm font-bold text-pw-link underline-offset-2 hover:underline",
                focusRing,
              )}
            >
              {item.action.label}
            </button>
          </RToast.Action>
        ) : null}
      </div>
      <RToast.Close
        aria-label="Dismiss"
        className={cn(
          "-m-1 grid size-8 shrink-0 place-items-center rounded-full text-pw-muted hover:bg-pw-surface-3 hover:text-pw-text",
          focusRing,
        )}
      >
        <IconClose className="size-4" />
      </RToast.Close>
    </RToast.Root>
  );
}
