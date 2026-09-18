"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { Notices } from "@/components/Notices";
import {
  IconBookmark,
  IconClose,
  IconCoin,
  IconDoc,
  IconDownload,
  IconFlag,
  IconLineGraph,
  IconGrid,
  IconHome,
  IconMegaphone,
  IconMenu,
  IconPlus,
  IconSearch,
  IconMoon,
  IconShield,
  IconSun,
  IconUser,
  LogoMark,
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

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-dvh max-w-full flex-col overflow-hidden bg-bg text-text">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
      >
        Skip to content
      </a>
      <Header onMenu={() => setOpen((v) => !v)} menuOpen={open} />
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <Sidebar className="hidden md:flex" />
        {open ? (
          <div className="fixed inset-0 top-14 z-40 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-bg/70"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <Sidebar className="relative z-10 flex h-full shadow-panel" onNavigate={() => setOpen(false)} />
          </div>
        ) : null}
        <main
          id="content"
          className="scrollbar-hide min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-7 sm:px-6 lg:px-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function Header({ onMenu, menuOpen }: { onMenu: () => void; menuOpen: boolean }) {
  return (
    <header className="relative z-30 grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border bg-bg/90 px-2 backdrop-blur-md sm:px-4 md:grid-cols-[minmax(0,1fr)_minmax(0,36rem)_minmax(0,1fr)]">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenu}
          className="md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
        </Button>
        <Link href={apexHref("/")} className="flex items-center gap-2 rounded-lg px-1.5 py-1" aria-label="playinweb home">
          <LogoMark className="h-8 w-8" />
          <span className="hidden text-title font-semibold min-[420px]:inline">
            playin<span className="text-text-muted">web</span>
          </span>
        </Link>
      </div>
      <div className="hidden min-w-0 md:block">
        <SearchBox />
      </div>
      <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
        <MobileSearch />
        <ThemeToggle />
        <Notices />
        <LinkButton href={apexHref("/register")} variant="primary" size="sm" aria-label="Add new game">
          <IconPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Add new game</span>
        </LinkButton>
        <AuthLinks />
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
  const [returnTo, setReturnTo] = useState("");
  useEffect(() => {
    setReturnTo(window.location.href);
  }, []);
  if (loading) return <div className="size-8 rounded-lg bg-surface-2" />;
  if (!user) {
    const href = returnTo
      ? `${apexHref("/login")}?next=${encodeURIComponent(returnTo)}`
      : apexHref("/login");
    return (
      <LinkButton href={href} variant="secondary" size="sm">
        Sign in
      </LinkButton>
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
          className="h-full min-w-0 flex-1 bg-transparent px-3 focus:bg-transparent sm:h-full"
        />
        <Button type="submit" variant="ghost" size="icon-sm" aria-label="Search" className="mr-1">
          <IconSearch className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

function Sidebar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
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
        "scrollbar-hide h-full w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-bg px-3 py-5",
        className,
      )}
      aria-label="Primary"
    >
      <div className="flex flex-col">
        {PRIMARY_NAV.map((group, i) => (
          <Fragment key={group.items[0].href}>
            {group.title ? (
              <p className={cn("mb-2 px-3 text-caption text-text-subtle", i > 0 && "mt-5")}>{group.title}</p>
            ) : null}
            <div className="flex flex-col items-start gap-4">
              {group.items.map((item) => {
                const feature = features.find((row) => row.href === item.href);
                const flags = publicNavFlags(feature, admin);
                if (!flags.show) return null;
                return (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    onNavigate={onNavigate}
                    soon={flags.soon}
                    hidden={flags.hidden}
                    locked={flags.soon && !admin}
                  />
                );
              })}
            </div>
          </Fragment>
        ))}
      </div>
      <div className="mt-auto flex flex-col pt-6">
        <p className="mb-2 px-3 text-caption text-text-subtle">Support</p>
        {SECONDARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={onNavigate} quiet />
        ))}
        <div className="flex items-center">
          {LEGAL_NAV.map((item, i) => (
            <Fragment key={item.href}>
              {i > 0 ? (
                <span className="text-caption text-text-subtle" aria-hidden>
                  •
                </span>
              ) : null}
              <NavLink item={item} active={isActive(item.href)} onNavigate={onNavigate} quiet fit />
            </Fragment>
          ))}
        </div>
        <p className="px-3 pt-2 text-caption text-text-subtle">© 2026 playinweb</p>
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
}: {
  item: { href: string; label: string; icon: typeof IconHome };
  active: boolean;
  onNavigate?: () => void;
  quiet?: boolean;
  fit?: boolean;
  soon?: boolean;
  hidden?: boolean;
  locked?: boolean;
}) {
  const Icon = item.icon;
  const className = cn(
    "flex items-center font-medium transition-colors duration-150 ease-out-quint",
    quiet
      ? "min-h-8 rounded-lg px-3 text-ui"
      : "h-11 w-fit max-w-full gap-1.5 rounded-full py-1 pl-1 pr-3 text-body",
    locked
      ? "cursor-not-allowed text-text-subtle opacity-50"
      : active
        ? "bg-surface-3 text-text"
        : quiet
          ? "text-text-muted hover:bg-surface-2 hover:text-text"
          : "bg-surface-2 text-text hover:bg-surface-3",
  );
  const inner = (
    <>
      {quiet ? null : (
        <span
          className={cn(
            "grid size-[35px] shrink-0 place-items-center rounded-full",
            active ? "bg-accent text-accent-fg" : "bg-bg",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      )}
      <span className={cn("min-w-0 truncate", fit ? "" : quiet ? "flex-1" : "")}>{item.label}</span>
      {soon ? (
        <span className="rounded-full bg-bg px-1.5 py-0.5 text-badge font-medium uppercase tracking-wide text-text-subtle">
          Soon
        </span>
      ) : null}
      {hidden ? (
        <span className="rounded-full bg-bg px-1.5 py-0.5 text-badge font-medium uppercase tracking-wide text-text-subtle">
          Hidden
        </span>
      ) : null}
    </>
  );
  if (locked) {
    return (
      <span className={className} aria-disabled="true">
        {inner}
      </span>
    );
  }
  return (
    <Link
      href={apexHref(item.href)}
      onClick={onNavigate}
      className={className}
      aria-current={active ? "page" : undefined}
    >
      {inner}
    </Link>
  );
}
