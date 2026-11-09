"use client";

import { createContext, useContext, type ReactNode } from "react";
import { cn } from "@/lib/cn";

// Data tables for creator and admin areas. `density="compact"` is the dashboard setting
// (admin, wallet); public pages use the default. Numbers align right and use tabular figures.

type Density = "default" | "compact";
const DensityContext = createContext<Density>("default");

export function Table({
  density = "default",
  caption,
  className,
  children,
}: {
  density?: Density;
  /** Describes the table for screen readers. Visually hidden. */
  caption: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <DensityContext.Provider value={density}>
      <div className={cn("overflow-x-auto rounded-pw-xl border border-pw-line bg-pw-surface-1", className)}>
        <table className="w-full min-w-max border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          {children}
        </table>
      </div>
    </DensityContext.Provider>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-pw-line bg-pw-surface-2">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="[&>tr:last-child]:border-b-0">{children}</tbody>;
}

export function TR({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr className={cn("border-b border-pw-line transition-colors hover:bg-pw-surface-2/60", className)} {...props} />
  );
}

export function TH({ numeric, className, ...props }: React.ComponentProps<"th"> & { numeric?: boolean }) {
  const density = useContext(DensityContext);
  return (
    <th
      scope="col"
      className={cn(
        "px-4 text-pw-caption font-semibold whitespace-nowrap text-pw-muted",
        density === "compact" ? "h-9" : "h-11",
        numeric && "text-right",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ numeric, className, ...props }: React.ComponentProps<"td"> & { numeric?: boolean }) {
  const density = useContext(DensityContext);
  return (
    <td
      className={cn(
        "px-4 text-pw-text",
        density === "compact" ? "py-2 text-pw-body-sm" : "py-3.5 text-pw-body",
        numeric && "text-right tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

/** A full-width row for an empty or failed table. Inline: icon and text, no illustration. */
export function TEmpty({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center">
        {children}
      </td>
    </tr>
  );
}
