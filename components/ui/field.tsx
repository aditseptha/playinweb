"use client";

import { IconChevron } from "@/components/icons";
import { cn } from "@/lib/cn";

export function TextInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-surface-3 px-3 text-body sm:h-9",
        "outline-none transition-colors placeholder:text-text-subtle",
        "focus:border-border-strong focus:bg-surface-3",
        "disabled:pointer-events-none disabled:opacity-45",
        className,
      )}
      {...props}
    />
  );
}

export function TextArea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[7rem] w-full resize-y rounded-lg border border-border bg-surface-3 px-3 py-2.5 text-body",
        "outline-none transition-colors placeholder:text-text-subtle",
        "focus:border-border-strong focus:bg-surface-3",
        className,
      )}
      {...props}
    />
  );
}

export function SelectInput({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block has-[:disabled]:opacity-45">
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-lg border border-border bg-surface-3 px-3 pr-9 text-body sm:h-9",
          "outline-none transition-colors focus:border-border-strong focus:bg-surface-3",
          "disabled:pointer-events-none",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-center text-text-muted"
      >
        <IconChevron className="h-4 w-4 rotate-90" />
      </span>
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-caption font-medium text-text-muted">{label}</span>
      {children}
      {hint ? <span className="text-meta text-text-subtle">{hint}</span> : null}
    </label>
  );
}
