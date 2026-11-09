"use client";

import { IconMenu, type AppIcon } from "@/components/icons";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "./sheet";
import { focusRing } from "./styles";

// Navigation building blocks. Which shell each page uses (top nav for public pages, sidebar
// for creator/admin areas, or top nav everywhere) is decided in #4; these work either way.

export type NavItem = { href: string; label: string; icon?: AppIcon };
export type NavGroup = { title?: string; items: NavItem[] };

/** Official mark + lettermark. White lettermark on dark and art, black on light. */
export function BrandLink({ href = "/", onArt = false }: { href?: string; onArt?: boolean }) {
  return (
    <Link
      href={href}
      aria-label="PlayInWeb home"
      className={cn("flex shrink-0 items-center gap-2.5 rounded-pw-md", focusRing)}
    >
      <Image src="/playinweb-icon.png" alt="" width={36} height={36} className="rounded-pw-md shadow-pw-glow" />
      {/* ~1KB files: resized variants wouldn't be any smaller. */}
      <Image
        src="/playinweb-lettermark-white.webp"
        alt=""
        width={109}
        height={20}
        unoptimized
        className={cn("h-5 w-auto translate-y-[2.5px]", !onArt && "[.light_&]:hidden")}
      />
      {!onArt ? (
        <Image
          src="/playinweb-lettermark-black.webp"
          alt=""
          width={109}
          height={20}
          unoptimized
          className="hidden h-5 w-auto translate-y-[2.5px] [.light_&]:block"
        />
      ) : null}
    </Link>
  );
}

function isActive(current: string | undefined, href: string) {
  if (!current) return false;
  return href === "/" ? current === "/" : current === href || current.startsWith(`${href}/`);
}

/**
 * Top bar. `onArt` sits transparent over hero art with fixed light text (homepage style);
 * otherwise it is a solid bar on the page background.
 */
export function TopNav({
  links,
  current,
  actions,
  menu,
  onArt = false,
  className,
}: {
  links: NavItem[];
  current?: string;
  /** Right side: theme toggle, notifications, account, sign in. */
  actions?: ReactNode;
  /** Groups for the phone menu sheet. Defaults to `links`. */
  menu?: NavGroup[];
  onArt?: boolean;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "z-[var(--pw-z-nav)] w-full",
        onArt ? "dark absolute inset-x-0 top-0 text-pw-on-art" : "border-b border-pw-line bg-pw-bg text-pw-text",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 md:h-20 md:px-6">
        <BrandLink onArt={onArt} />
        <nav aria-label="Primary" className="ml-6 hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = isActive(current, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-pw-pill px-3.5 py-2 text-pw-body font-medium transition-colors",
                  active ? "text-pw-text" : "text-pw-text-soft hover:text-pw-text",
                  active && "bg-pw-surface-2",
                  focusRing,
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {actions}
          <MenuSheet groups={menu ?? [{ items: links }]} current={current} />
        </div>
      </div>
    </header>
  );
}

/** Phone navigation: a bottom sheet with the nav groups. Hidden from md up. */
export function MenuSheet({ groups, current, footer }: { groups: NavGroup[]; current?: string; footer?: ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu" className="md:hidden" data-testid="open-menu-sheet">
          <IconMenu />
        </Button>
      </SheetTrigger>
      <SheetContent title="Menu">
        <nav aria-label="Menu" className="flex flex-col gap-5">
          {groups.map((g, i) => (
            <div key={g.title ?? i}>
              {g.title ? (
                <p className="mb-1.5 px-3 font-pw-pixel text-pw-label tracking-[0.06em] text-pw-muted uppercase">
                  {g.title}
                </p>
              ) : null}
              <ul className="flex flex-col">
                {g.items.map((item) => (
                  <li key={item.href}>
                    <SheetClose asChild>
                      <NavRow item={item} active={isActive(current, item.href)} />
                    </SheetClose>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {footer}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function NavRow({
  item,
  active,
  ...props
}: { item: NavItem; active: boolean } & Omit<React.ComponentProps<typeof Link>, "href">) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-pw-md px-3 text-pw-body font-medium transition-colors",
        active ? "bg-pw-primary/15 text-pw-text" : "text-pw-text-soft hover:bg-pw-surface-2 hover:text-pw-text",
        focusRing,
      )}
      {...props}
    >
      {Icon ? (
        <Icon aria-hidden className={cn("size-5 shrink-0", active ? "text-pw-primary-hi" : "text-pw-muted")} />
      ) : null}
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/** Side navigation for creator and admin areas. On phones, use MenuSheet with the same groups. */
export function Sidebar({
  groups,
  current,
  footer,
  className,
}: {
  groups: NavGroup[];
  current?: string;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <aside className={cn("flex w-64 shrink-0 flex-col gap-6 border-r border-pw-line bg-pw-bg-deep p-4", className)}>
      <BrandLink />
      <nav aria-label="Sections" className="flex flex-col gap-5">
        {groups.map((g, i) => (
          <div key={g.title ?? i}>
            {g.title ? (
              <p className="mb-1.5 px-3 font-pw-pixel text-pw-label tracking-[0.06em] text-pw-muted uppercase">
                {g.title}
              </p>
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {g.items.map((item) => (
                <li key={item.href}>
                  <NavRow item={item} active={isActive(current, item.href)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      {footer ? <div className="mt-auto">{footer}</div> : null}
    </aside>
  );
}
