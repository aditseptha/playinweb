"use client";

import { Check, Copy } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { focusRing } from "@/components/ds/styles";
import { useToast } from "@/components/ds/toast";
import { cn } from "@/lib/cn";

// Building blocks for the DS documentation page itself.

export type Density = "default" | "compact";
export type DocSettings = { density: Density; worstCase: boolean };
export const DocSettingsContext = createContext<DocSettings>({ density: "default", worstCase: false });
export const useDocSettings = () => useContext(DocSettingsContext);

export function DocSection({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 border-t border-pw-line pt-12 first:border-t-0 first:pt-0"
    >
      <p className="font-pw-pixel text-pw-label tracking-[0.06em] text-pw-highlight-ink uppercase">{eyebrow}</p>
      <h2
        id={`${id}-title`}
        className="mt-2 font-pw-display text-pw-display-m font-extrabold text-pw-text uppercase italic"
      >
        {title}
      </h2>
      {description ? (
        <div className="mt-3 max-w-3xl text-pw-body text-pw-muted [text-wrap:pretty]">{description}</div>
      ) : null}
      <div className="mt-8 flex flex-col gap-8">{children}</div>
    </section>
  );
}

/** One component or pattern example, with what to import. */
export function Demo({
  title,
  note,
  code,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  note?: ReactNode;
  code?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-pw-xl border border-pw-line", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-pw-line bg-pw-surface-1 px-4 py-3">
        <h3 className="text-pw-body font-bold text-pw-text">{title}</h3>
        {note ? <p className="text-pw-caption text-pw-muted">{note}</p> : null}
      </div>
      <div className={cn("bg-pw-bg p-5", bodyClassName)}>{children}</div>
      {code ? (
        <pre className="overflow-x-auto border-t border-pw-line bg-pw-surface-1 px-4 py-3 text-pw-caption text-pw-text-soft">
          <code>{code}</code>
        </pre>
      ) : null}
    </div>
  );
}

/** A token name you can click to copy. */
export function CopyToken({ name, className }: { name: string; className?: string }) {
  const toast = useToast();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(name);
          setDone(true);
          toast({ title: `Copied ${name}`, tone: "success" });
          window.setTimeout(() => setDone(false), 1200);
        } catch {
          toast({ title: "Couldn’t copy", description: "Your browser blocked clipboard access.", tone: "danger" });
        }
      }}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-pw-sm px-1.5 py-0.5 font-mono text-pw-caption text-pw-text hover:bg-pw-surface-3",
        focusRing,
        className,
      )}
    >
      <span className="truncate">{name}</span>
      {done ? (
        <Check aria-hidden className="size-3.5 shrink-0 text-pw-success" />
      ) : (
        <Copy aria-hidden className="size-3.5 shrink-0 text-pw-muted" />
      )}
      <span className="sr-only">Copy</span>
    </button>
  );
}

export function Rule({ kind, children }: { kind: "do" | "dont"; children: ReactNode }) {
  return (
    <li className="flex gap-2.5 text-pw-body-sm text-pw-text-soft">
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold",
          kind === "do" ? "bg-pw-success/15 text-pw-success" : "bg-pw-danger/15 text-pw-danger",
        )}
      >
        {kind === "do" ? "✓" : "✕"}
      </span>
      <span>
        <span className="sr-only">{kind === "do" ? "Do: " : "Don’t: "}</span>
        {children}
      </span>
    </li>
  );
}
