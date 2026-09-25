"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { Notices } from "@/components/Notices";
import { useLoginDialog } from "@/components/LoginDialog";
import { LegalProvider } from "@/components/LegalModal";
import { SignupProvider, useSignupDialog } from "@/components/SignupDialog";
import {
  IconBookmark,
  IconChevron,
  IconClose,
  IconCoin,
  IconDoc,
  IconDownload,
  IconFlag,
  IconLineGraph,
  IconGrid,
  IconHome,
  IconMail,
  IconMegaphone,
  IconMenu,
  IconPlus,
  IconSearch,
  IconMoon,
  IconShield,
  IconSun,
  IconUser,
} from "@/components/icons";
import { Avatar } from "@/components/Avatar";
import { Button, LinkButton } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { isAdminEmail } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { publicNavFlags, useFeatures } from "@/lib/features";
import { apexHref } from "@/lib/host";
import { publicMediaUrl } from "@/lib/media";
import { useGames } from "@/lib/store";
import { applyTheme, THEME_KEY, type Theme } from "@/lib/theme";

const PRIMARY_NAV = [
  { title: "Browse", items: [{ href: "/", label: "Home", icon: IconHome }] },
  {
    title: "You",
    items: [
      { href: "/profile", label: "Channel", icon: IconUser },
      { href: "/manage", label: "Manage games", icon: IconGrid },
      { href: "/library", label: "Library", icon: IconBookmark },
      { href: "/donations", label: "Donations", icon: IconCoin },
    ],
  },
  {
    title: "Discover",
    items: [
      { href: "/top", label: "Top Played", icon: IconLineGraph },
      { href: "/showcase", label: "Showcase", icon: IconMegaphone },
    ],
  },
  { title: "Files", items: [{ href: "/downloads", label: "Downloads", icon: IconDownload }] },
] as const;

const SECONDARY_NAV = [
  { href: "/tip", label: "Tip the developer", icon: IconCoin },
  { href: "/report", label: "Report an issue", icon: IconFlag },
] as const;

const LEGAL_NAV = [
  { href: "/privacy", label: "Privacy", icon: IconShield },
  { href: "/terms", label: "Terms", icon: IconDoc },
] as const;

const AUTH_GATED_HREFS = new Set(["/profile", "/manage", "/library", "/donations"]);

const SIDEBAR_KEY = "playinweb.sidebar.collapsed";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <LegalProvider>
    <SignupProvider>
    <div className="flex h-dvh max-w-full flex-col gap-2 overflow-hidden bg-transparent p-3 text-text md:flex-row">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
      >
        Skip to content
      </a>
      <div className="hidden h-full min-h-0 shrink-0 md:flex">
        <Sidebar className="flex" collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      </div>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 sm:px-6 lg:px-10">
        {open ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-bg/70"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <Sidebar
              className="relative z-10 m-3 flex max-h-[calc(100%-1.5rem)]"
              onNavigate={() => setOpen(false)}
            />
          </div>
        ) : null}
        <div
          className="scrollbar-hide min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
          onScroll={(e) => {
            const next = e.currentTarget.scrollTop > 20;
            setScrolled((was) => (was === next ? was : next));
          }}
        >
          <div className="sticky top-0 z-30">
            <Header onMenu={() => setOpen((v) => !v)} menuOpen={open} scrolled={scrolled} />
          </div>
          <main id="content" className="pb-8">
            {children}
          </main>
        </div>
      </div>
    </div>
    </SignupProvider>
    </LegalProvider>
  );
}

function Header({
  onMenu,
  menuOpen,
  scrolled,
}: {
  onMenu: () => void;
  menuOpen: boolean;
  scrolled: boolean;
}) {
  return (
    <header
      className={cn(
        "relative z-30 mb-3 flex shrink-0 items-start gap-2",
        scrolled && "pointer-events-none",
      )}
    >
      <div className="pointer-events-auto flex shrink-0 items-center gap-2 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenu}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
        </Button>
        <BrandLink className="md:hidden" />
      </div>
      <div
        className={cn(
          "ml-auto flex min-w-0 items-center gap-2 sm:gap-3 pointer-events-auto",
          "transition-[width,padding,border-color,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          scrolled
            ? "w-[min(100%,32rem)] rounded-full bg-surface px-2 py-1.5 shadow-panel"
            : "w-full justify-between",
        )}
      >
        <div
          className={cn(
            "hidden min-w-0 md:block",
            "transition-[max-width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            scrolled ? "max-w-[13rem] min-w-0 flex-1" : "w-full max-w-xl",
          )}
        >
          <SearchBox />
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
          <MobileSearch />
          <ThemeToggle />
          <Notices />
          <LinkButton href={apexHref("/register")} variant="primary" size="sm" aria-label="Add new game">
            <IconPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Add new game</span>
          </LinkButton>
          <AuthLinks />
        </div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Toggle light and dark mode"
      onClick={() => {
        const next: Theme = document.documentElement.classList.contains("dark") ? "light" : "dark";
        localStorage.setItem(THEME_KEY, next);
        applyTheme(next);
      }}
    >
      <span className="relative grid size-5 place-items-center">
        <IconSun className="col-start-1 row-start-1 hidden h-5 w-5 dark:block" />
        <IconMoon className="col-start-1 row-start-1 h-5 w-5 dark:hidden" />
      </span>
    </Button>
  );
}

function AuthLinks() {
  const { user, profile, loading } = useAuth();
  const { openLogin } = useLoginDialog();
  if (loading) return <div className="size-8 rounded-lg bg-surface-2" />;
  if (!user) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => openLogin()}>
        Sign in
      </Button>
    );
  }
  return (
    <Link
      href={apexHref("/profile")}
      className="rounded-full"
      aria-label="You"
    >
      <Avatar
        name={profile?.display_name ?? ""}
        src={publicMediaUrl(profile?.avatar_path) || undefined}
        size={32}
      />
    </Link>
  );
}

function SearchBox() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  return <SearchForm key={q} initialQuery={q} />;
}

function MobileSearch() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Search games and creators"
      >
        <IconSearch className="h-5 w-5" />
      </Button>
      {open ? (
        <div className="absolute inset-x-0 top-0 z-50 flex h-14 items-center gap-1 bg-bg px-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            aria-label="Close search"
          >
            <IconClose className="h-5 w-5" />
          </Button>
          <SearchForm key={`m-${q}`} initialQuery={q} autoFocus />
        </div>
      ) : null}
    </div>
  );
}

function SearchForm({ initialQuery, autoFocus }: { initialQuery: string; autoFocus?: boolean }) {
  const id = useId();
  const [value, setValue] = useState(initialQuery);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    window.location.assign(apexHref(q ? `/?q=${encodeURIComponent(q)}` : "/"));
  }

  return (
    <form onSubmit={onSubmit} className="w-full min-w-0">
      <label htmlFor={id} className="sr-only">
        Search games and creators
      </label>
      <div className="flex h-10 w-full items-center gap-1 rounded-full bg-surface-2 p-0.5 sm:h-9">
        <TextInput
          id={id}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search games and creators"
          autoFocus={autoFocus}
          className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 shadow-none focus:border-transparent focus:bg-transparent sm:h-full"
        />
        <Button type="submit" variant="ghost" size="icon-sm" aria-label="Search" className="mr-1">
          <IconSearch className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

const BRAND_MARKS = ["/playinweb-icon.png", "/playinweb-mark.png"];

function BrandMark() {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % BRAND_MARKS.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  return (
    <span className="relative size-11 shrink-0">
      {BRAND_MARKS.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          width={88}
          height={88}
          unoptimized
          className={cn(
            "absolute inset-0 size-11 rounded-xl transition-opacity duration-500 ease-out motion-reduce:transition-none",
            i === index ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
    </span>
  );
}

function SidebarCollapseToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? "Expand sidebar" : "Minimize sidebar"}
      aria-expanded={!collapsed}
      className="group absolute right-0 top-7 z-10 flex h-8 w-5 items-center justify-center rounded-l-lg bg-brand-blue outline-none transition-opacity hover:opacity-90"
    >
      <IconChevron
        className={cn(
          "h-3.5 w-3.5 text-white transition-transform duration-300 ease-out-quint",
          collapsed ? "" : "rotate-180",
        )}
      />
    </button>
  );
}

function BrandLink({
  className,
  onClick,
  compact,
}: {
  className?: string;
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <Link
      href={apexHref("/")}
      onClick={onClick}
      className={cn("flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1", compact && "px-0", className)}
      aria-label="PlayInWeb home"
    >
      <BrandMark />
      <span
        className={cn(
          "overflow-hidden transition-[max-width,opacity,margin] duration-300 ease-out-quint",
          compact ? "ml-0 max-w-0 opacity-0" : "max-w-[9rem] opacity-100",
        )}
      >
        <Image
          src="/playinweb-lettermark-white.webp"
          alt="PlayInWeb"
          width={109}
          height={20}
          unoptimized
          className="hidden h-5 w-auto translate-y-[2px] dark:block"
        />
        <Image
          src="/playinweb-lettermark-black.webp"
          alt="PlayInWeb"
          width={109}
          height={20}
          unoptimized
          className="h-5 w-auto translate-y-[2px] dark:hidden"
        />
      </span>
    </Link>
  );
}

function Sidebar({
  className,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: {
  className?: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { openLogin } = useLoginDialog();
  const { profile } = useGames();
  const { features } = useFeatures();
  const admin = isAdminEmail(user?.email);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href === "/library") return pathname === "/library" || pathname.startsWith("/collection/");
    if (href === "/profile") {
      return pathname === "/profile" || (profile != null && pathname === `/channel/${profile.handle}`);
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      className={cn(
        "scrollbar-hide relative h-full shrink-0 flex-col overflow-x-visible overflow-y-auto rounded-2xl bg-surface-2 py-4",
        "transition-[width,padding] duration-300 ease-out-quint",
        collapsed ? "w-24 px-2" : "w-60 px-3",
        className,
      )}
      aria-label="Primary"
    >
      {onToggleCollapse ? (
        <SidebarCollapseToggle collapsed={collapsed} onToggle={onToggleCollapse} />
      ) : null}
      <div className={cn("mb-5 pr-7", collapsed ? "flex justify-center" : "")}>
        <BrandLink compact={collapsed} onClick={onNavigate} />
      </div>
      <div className="flex flex-col">
        {PRIMARY_NAV.map((group, i) => (
          <Fragment key={group.items[0].href}>
            {group.title ? (
              <p
                className={cn(
                  "mb-2 overflow-hidden whitespace-nowrap px-3 text-caption text-text-subtle transition-[max-height,opacity,margin] duration-300 ease-out-quint",
                  i > 0 && "mt-5",
                  collapsed ? "pointer-events-none mb-0 mt-3 max-h-0 px-0 opacity-0" : "max-h-6 opacity-100",
                )}
              >
                {group.title}
              </p>
            ) : i > 0 ? (
              <div className={cn("transition-[margin] duration-300 ease-out-quint", collapsed ? "mt-3" : "mt-5")} />
            ) : null}
            <div
              className={cn(
                "flex flex-col gap-4 transition-[align-items] duration-300 ease-out-quint",
                collapsed ? "items-center" : "items-start",
              )}
            >
              {group.items.map((item) => {
                const feature = features.find((row) => row.href === item.href);
                const flags = publicNavFlags(feature, admin);
                if (!flags.show) return null;
                const authGated = !loading && !user && AUTH_GATED_HREFS.has(item.href);
                return (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    onNavigate={onNavigate}
                    collapsed={collapsed}
                    soon={flags.soon}
                    hidden={flags.hidden}
                    locked={flags.soon && !admin}
                    authGated={authGated}
                    onAuthGate={() => openLogin({ next: apexHref(item.href) })}
                  />
                );
              })}
            </div>
          </Fragment>
        ))}
      </div>
      <div
        className={cn(
          "mt-auto flex flex-col pt-6 transition-[align-items] duration-300 ease-out-quint",
          collapsed && "items-center",
        )}
      >
        <p
          className={cn(
            "mb-2 overflow-hidden whitespace-nowrap px-3 text-caption text-text-subtle transition-[max-height,opacity,margin] duration-300 ease-out-quint",
            collapsed ? "pointer-events-none mb-0 max-h-0 px-0 opacity-0" : "max-h-6 opacity-100",
          )}
        >
          Support
        </p>
        {SECONDARY_NAV.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
            onNavigate={onNavigate}
            quiet={!collapsed}
            collapsed={collapsed}
          />
        ))}
        <a
          href="mailto:support@playinweb.com"
          className={cn(
            "flex items-center font-medium transition-[color,background-color,width,height,padding,border-radius] duration-300 ease-out-quint",
            collapsed
              ? "size-11 justify-center rounded-full text-text hover:bg-surface-3"
              : "min-h-8 rounded-lg px-3 text-ui text-text-muted hover:bg-surface-3 hover:text-text",
          )}
          aria-label="Contact us"
          title="support@playinweb.com"
          onClick={() => onNavigate?.()}
        >
          {collapsed ? (
            <IconMail className="h-4 w-4" />
          ) : (
            "Contact us"
          )}
        </a>
        <div className={cn("flex items-center", collapsed && "flex-col")}>
          {LEGAL_NAV.map((item, i) => (
            <Fragment key={item.href}>
              {i > 0 && !collapsed ? (
                <span className="text-caption text-text-subtle" aria-hidden>
                  •
                </span>
              ) : null}
              <NavLink
                item={item}
                active={isActive(item.href)}
                onNavigate={onNavigate}
                quiet={!collapsed}
                collapsed={collapsed}
              />
            </Fragment>
          ))}
        </div>
        <p
          className={cn(
            "overflow-hidden whitespace-nowrap px-3 pt-2 text-caption text-text-subtle transition-[max-height,opacity,padding] duration-300 ease-out-quint",
            collapsed ? "pointer-events-none max-h-0 px-0 pt-0 opacity-0" : "max-h-8 opacity-100",
          )}
        >
          © 2026 PlayInWeb
        </p>
      </div>
    </nav>
  );
}

function NavLink({
  item,
  active,
  onNavigate,
  quiet,
  fit,
  soon,
  hidden,
  locked,
  collapsed,
  authGated,
  onAuthGate,
}: {
  item: { href: string; label: string; icon: typeof IconHome };
  active: boolean;
  onNavigate?: () => void;
  quiet?: boolean;
  fit?: boolean;
  soon?: boolean;
  hidden?: boolean;
  locked?: boolean;
  collapsed?: boolean;
  authGated?: boolean;
  onAuthGate?: () => void;
}) {
  const Icon = item.icon;
  const iconOnly = Boolean(collapsed);
  const className = cn(
    "flex items-center font-medium transition-[color,background-color,width,height,padding,border-radius,gap] duration-300 ease-out-quint",
    iconOnly
      ? "size-11 justify-center gap-0 rounded-full"
      : quiet
        ? "min-h-8 rounded-lg px-3 text-ui"
        : "h-11 w-fit max-w-full gap-1.5 rounded-full py-1 pl-1 pr-3 text-body",
    locked
      ? "cursor-not-allowed text-text-subtle opacity-50"
      : active
        ? "bg-surface-3 text-text"
        : quiet && !iconOnly
          ? "text-text-muted hover:bg-surface-2 hover:text-text"
          : iconOnly
            ? active
              ? "bg-surface-3 text-text"
              : "text-text hover:bg-surface-2"
            : "bg-surface-2 text-text hover:bg-surface-3",
  );
  const inner = (
    <>
      {quiet && !iconOnly ? null : (
        <span
          className={cn(
            "grid shrink-0 place-items-center rounded-full transition-[width,height,background-color,color] duration-300 ease-out-quint",
            iconOnly ? "size-8" : "size-[35px]",
            active ? "bg-accent text-accent-fg" : "bg-bg",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      )}
      <span
        className={cn(
          "min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-300 ease-out-quint",
          iconOnly ? "ml-0 max-w-0 opacity-0" : cn("max-w-[10rem] opacity-100", fit ? "" : quiet ? "flex-1" : ""),
        )}
      >
        {item.label}
      </span>
      <span
        className={cn(
          "overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-out-quint",
          soon && !iconOnly ? "max-w-[3.5rem] opacity-100" : "max-w-0 opacity-0",
        )}
      >
        <span className="rounded-full bg-bg px-1.5 py-0.5 text-badge font-medium uppercase tracking-wide text-text-subtle">
          Soon
        </span>
      </span>
      <span
        className={cn(
          "overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-out-quint",
          hidden && !iconOnly ? "max-w-[4rem] opacity-100" : "max-w-0 opacity-0",
        )}
      >
        <span className="rounded-full bg-bg px-1.5 py-0.5 text-badge font-medium uppercase tracking-wide text-text-subtle">
          Hidden
        </span>
      </span>
    </>
  );
  if (locked) {
    return (
      <span className={className} aria-disabled="true" title={item.label}>
        {inner}
      </span>
    );
  }
  if (authGated) {
    return (
      <button
        type="button"
        onClick={() => {
          onAuthGate?.();
          onNavigate?.();
        }}
        className={className}
        aria-label={iconOnly ? item.label : undefined}
        title={iconOnly ? item.label : undefined}
      >
        {inner}
      </button>
    );
  }
  return (
    <Link
      href={apexHref(item.href)}
      onClick={onNavigate}
      className={className}
      aria-current={active ? "page" : undefined}
      aria-label={iconOnly ? item.label : undefined}
      title={iconOnly ? item.label : undefined}
    >
      {inner}
    </Link>
  );
}

