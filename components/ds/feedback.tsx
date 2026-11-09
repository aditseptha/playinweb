"use client";

import { IconAlertCircle, IconCheckCircle, IconClose, IconCloudOff, IconInfo, IconWarning } from "@/components/icons";
import type { ReactNode } from "react";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { useOnline } from "./hooks";

// ---------- ProgressBar ----------

/** Determinate progress for uploads: percent, size, and a cancel button. */
export function ProgressBar({
  value,
  label,
  detail,
  onCancel,
  className,
}: {
  /** 0–100. */
  value: number;
  label: string;
  /** e.g. "34 MB of 80 MB". */
  detail?: string;
  onCancel?: () => void;
  className?: string;
}) {
  const v = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3 text-pw-body-sm">
        <span className="truncate font-semibold text-pw-text">{label}</span>
        <span className="shrink-0 text-pw-muted tabular-nums">
          {v}%{detail ? ` · ${detail}` : ""}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={v}
          className="h-2 flex-1 overflow-hidden rounded-full bg-pw-surface-3"
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-pw-primary-lo to-pw-primary-hi transition-[width] duration-300 ease-pw-out"
            style={{ width: `${v}%` }}
          />
        </div>
        {onCancel ? (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// ---------- InlineAlert ----------

const ALERT = {
  info: { icon: IconInfo, box: "border-pw-link/30 bg-pw-link/10", ic: "text-pw-link" },
  success: { icon: IconCheckCircle, box: "border-pw-success/30 bg-pw-success/10", ic: "text-pw-success" },
  warning: { icon: IconWarning, box: "border-pw-warning/30 bg-pw-warning/10", ic: "text-pw-warning" },
  danger: { icon: IconAlertCircle, box: "border-pw-danger/40 bg-pw-danger/10", ic: "text-pw-danger" },
} as const;

/** A message inside a section: a card that failed to load, a warning above a form. */
export function InlineAlert({
  tone = "info",
  title,
  children,
  action,
  onDismiss,
  className,
}: {
  tone?: keyof typeof ALERT;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const a = ALERT[tone];
  const Icon = a.icon;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-pw-lg border p-4", a.box, className)}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", a.ic)} />
      <div className="min-w-0 flex-1">
        <p className="text-pw-body-sm font-semibold text-pw-text">{title}</p>
        {children ? <div className="mt-1 text-pw-body-sm text-pw-text-soft">{children}</div> : null}
        {action ? <div className="mt-3 flex flex-wrap gap-2">{action}</div> : null}
      </div>
      {onDismiss ? (
        <Button variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={onDismiss} className="-m-1">
          <IconClose />
        </Button>
      ) : null}
    </div>
  );
}

// ---------- Stat ----------

/** A headline number on dashboards. Compact by default; pass `full` for money and exact counts. */
export function Stat({
  label,
  value,
  display,
  hint,
  className,
}: {
  label: string;
  value: number;
  /** Preformatted value (money, percent). Defaults to the compact number. */
  display?: string;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-pw-xl border border-pw-line bg-pw-surface-1 p-4", className)}>
      <p className="text-pw-caption font-medium text-pw-muted">{label}</p>
      <p
        className="mt-1 font-pw-display text-pw-display-m font-extrabold text-pw-text tabular-nums"
        title={String(value)}
      >
        {display ?? formatCompact(value)}
      </p>
      {hint ? <p className="mt-1 text-pw-caption text-pw-muted">{hint}</p> : null}
    </div>
  );
}

// ---------- OfflineBanner ----------

/** Pinned notice while the browser is offline. Renders nothing when online. */
export function OfflineBanner({ forceOffline = false }: { forceOffline?: boolean }) {
  const online = useOnline();
  if (online && !forceOffline) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-pw-yellow-300 px-4 py-2 text-pw-body-sm font-semibold text-pw-navy"
    >
      <IconCloudOff aria-hidden className="size-4" />
      You’re offline. We’ll reconnect when the network is back.
    </div>
  );
}
