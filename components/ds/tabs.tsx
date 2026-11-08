"use client";

import { Tabs as RTabs } from "radix-ui";
import { createContext, useContext } from "react";
import { cn } from "@/lib/cn";
import { focusRing } from "./styles";

// Tabs switch views inside one page (arrow keys move between tabs). For links between pages,
// use a nav with <Link>s instead.

type Look = "pill" | "segmented";
const LookContext = createContext<Look>("pill");

export const Tabs = RTabs.Root;

export function TabsList({
  look = "pill",
  className,
  ...props
}: React.ComponentProps<typeof RTabs.List> & {
  /** pill: the homepage tab bar. segmented: compact switch for dashboards and settings. */
  look?: Look;
}) {
  return (
    <LookContext.Provider value={look}>
      <RTabs.List
        className={cn(
          "inline-flex max-w-full items-center overflow-x-auto [scrollbar-width:none]",
          look === "pill" ? "gap-1" : "gap-0.5 rounded-pw-md border border-pw-line bg-pw-surface-1 p-1",
          className,
        )}
        {...props}
      />
    </LookContext.Provider>
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof RTabs.Trigger>) {
  const look = useContext(LookContext);
  return (
    <RTabs.Trigger
      className={cn(
        "inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-semibold transition-colors duration-150 [&_svg]:size-4",
        look === "pill"
          ? "h-11 rounded-pw-pill px-4 text-pw-body text-pw-text-soft hover:text-pw-text data-[state=active]:bg-pw-primary data-[state=active]:text-pw-on-primary"
          : "h-9 rounded-pw-sm px-3 text-pw-body-sm text-pw-muted hover:text-pw-text data-[state=active]:bg-pw-surface-3 data-[state=active]:text-pw-text",
        "disabled:opacity-45",
        focusRing,
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof RTabs.Content>) {
  return <RTabs.Content className={cn("mt-4", focusRing, className)} {...props} />;
}
