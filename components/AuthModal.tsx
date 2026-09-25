"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { IconClose, IconEye, IconEyeOff } from "@/components/icons";
import { cn } from "@/lib/cn";
import { signInWithGoogle } from "@/lib/oauth";

export function AuthModalShell({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-bg/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[400px] overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6">
          <div>
            <h2 id={titleId} className="text-display font-semibold tracking-tight text-text">{title}</h2>
            {description ? <p className="mt-1 text-caption text-text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-text-subtle transition-colors hover:bg-surface-3 hover:text-text"
            onClick={onClose}
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 pb-6 pt-5">{children}</div>
        {footer ? <div className="border-t border-border px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export function AuthOrDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-body text-text-subtle">or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  next,
  disabled,
  onError,
}: {
  next?: string | null;
  disabled?: boolean;
  onError?: (message: string) => void;
}) {
  const [pending, setPending] = useState(false);

  async function onGoogle() {
    setPending(true);
    const returnTo = next ?? (typeof window !== "undefined" ? window.location.href : "/");
    const { error } = await signInWithGoogle(returnTo);
    if (error) {
      setPending(false);
      onError?.(error.message);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={() => void onGoogle()}
      className={cn(
        "flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-surface-3 text-body font-medium text-text transition-colors",
        "hover:bg-surface disabled:pointer-events-none disabled:opacity-45",
      )}
    >
      <GoogleMark />
      {pending ? "Redirecting…" : "Continue with Google"}
    </button>
  );
}

const authInputClass =
  "h-11 w-full rounded-xl border border-border bg-surface-3 px-3.5 text-body outline-none transition-colors placeholder:text-text-subtle focus:border-border-strong disabled:pointer-events-none disabled:opacity-45";

export function AuthInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(authInputClass, className)} {...props} />;
}

export function AuthPasswordInput({
  name = "password",
  required,
  minLength,
  autoComplete = "current-password",
  placeholder = "Password",
}: {
  name?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className={cn(
        authInputClass,
        "flex items-center gap-1 pr-1 focus-within:border-border-strong",
      )}
    >
      <input
        name={name}
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-text-subtle"
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        className="grid size-9 shrink-0 place-items-center rounded-lg text-text-subtle transition-colors hover:text-text"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function AuthPrimaryButton({
  children,
  pending,
  pendingLabel,
  disabled,
}: {
  children: ReactNode;
  pending?: boolean;
  pendingLabel: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={cn(
        "h-11 w-full rounded-xl bg-accent text-body font-semibold text-accent-fg transition-colors",
        "hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-45",
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function AuthFooterLink({
  lead,
  action,
  onClick,
}: {
  lead: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <p className="text-body text-text-muted">
      {lead}{" "}
      <button type="button" className="font-medium text-text underline-offset-2 hover:underline" onClick={onClick}>
        {action}
      </button>
    </p>
  );
}
