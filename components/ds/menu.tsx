"use client";

import { DropdownMenu as RMenu } from "radix-ui";
import { cn } from "@/lib/cn";
import { usePortalContainer } from "./portal";
import { floatingSurface } from "./styles";

// Action menu (account menu, "more" buttons). Arrow keys move, Enter picks, Esc closes and
// returns focus to the trigger; typing a letter jumps to the matching item.

export const Menu = RMenu.Root;
export const MenuTrigger = RMenu.Trigger;

export function MenuContent({
  className,
  sideOffset = 8,
  align = "end",
  ...props
}: React.ComponentProps<typeof RMenu.Content>) {
  const container = usePortalContainer();
  return (
    <RMenu.Portal container={container}>
      <RMenu.Content
        sideOffset={sideOffset}
        align={align}
        className={cn("z-[var(--pw-z-dropdown)] min-w-56 rounded-pw-lg p-1.5", floatingSurface, className)}
        {...props}
      />
    </RMenu.Portal>
  );
}

export function MenuItem({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<typeof RMenu.Item> & { tone?: "default" | "danger" }) {
  return (
    <RMenu.Item
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-pw-sm px-3 text-pw-body-sm font-medium outline-none select-none [&_svg]:size-4",
        tone === "danger" ? "text-pw-danger" : "text-pw-text-soft",
        "data-[highlighted]:bg-pw-primary/15 data-[highlighted]:text-pw-text data-[disabled]:pointer-events-none data-[disabled]:opacity-45",
        className,
      )}
      {...props}
    />
  );
}

export function MenuLabel({ className, ...props }: React.ComponentProps<typeof RMenu.Label>) {
  return <RMenu.Label className={cn("px-3 pt-2 pb-1 text-pw-caption text-pw-muted", className)} {...props} />;
}

export function MenuSeparator({ className, ...props }: React.ComponentProps<typeof RMenu.Separator>) {
  return <RMenu.Separator className={cn("mx-1 my-1.5 h-px bg-pw-line", className)} {...props} />;
}
