"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { LegalProvider } from "@/components/LegalModal";
import { useLoginDialog } from "@/components/LoginDialog";
import { Notices } from "@/components/Notices";
import { SignupProvider, useSignupDialog } from "@/components/SignupDialog";
import { isBrowsing, parseFilters } from "@/components/home/filters";
import { HomeFooter } from "@/components/home/HomeFooter";
import { IconMenu, IconPlus } from "@/components/icons";
import { isAdminEmail } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { navItemVisible, useFeatures } from "@/lib/features";
import { apexHref } from "@/lib/host";
import { publicMediaUrl } from "@/lib/media";

/** Top-level links. Only pages that exist; feature-flagged ones follow the admin flags. */
const NAV = [
  { href: "/#creators", label: "Creators" },
  { href: "/top", label: "Rankings" },
  { href: "/showcase", label: "Showcase" },
];

/** Everything the sidebar offers on other pages, so it stays one click away from the homepage. */
const ACCOUNT_LINKS = [
  { href: "/profile", label: "Your channel" },
  { href: "/manage", label: "Manage games" },
  { href: "/library", label: "Library" },
  { href: "/donations", label: "Wallet" },
  { href: "/downloads", label: "Downloads" },
];

const SITE_LINKS = [
  { href: "/top", label: "Top played" },
  { href: "/showcase", label: "Showcase" },
  { href: "/tip", label: "Tip the developer" },
  { href: "/report", label: "Report an issue" },
];

export function HomeShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  return (
    <LegalProvider>
      <SignupProvider>
        <div
          data-scroll-root
          className="home-theme scrollbar-hide h-dvh overflow-x-hidden overflow-y-auto overscroll-contain bg-bg text-text"
          onScroll={(e) => {
            const next = e.currentTarget.scrollTop > 24;
            setScrolled((was) => (was === next ? was : next));
          }}
        >
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
          >
            Skip to content
          </a>
          <TopNav scrolled={scrolled} />
          <main id="content">{children}</main>
          <HomeFooter />
        </div>
      </SignupProvider>
    </LegalProvider>
  );
}

function TopNav({ scrolled }: { scrolled: boolean }) {
  // Results views have no hero art behind the bar, so it is solid there from the start.
  const params = useSearchParams();
  const solid = scrolled || isBrowsing(parseFilters(params));
  const { user, loading } = useAuth();
  const { features, loading: featuresLoading } = useFeatures();
  const admin = isAdminEmail(user?.email);
  const nav = NAV.filter((item) => navItemVisible(item.href, features, admin, featuresLoading));

  return (
    // Negative margin lets the hero art run underneath the bar, as in the comp.
    <header
      className={cn(
        "sticky top-0 z-40 -mb-[72px] h-[72px] transition-[background-color,box-shadow,border-color] duration-300 ease-out-quint",
        solid
          ? "border-b border-border/70 bg-bg/85 shadow-[0_8px_24px_-12px_oklch(0%_0_0/0.35)] backdrop-blur-xl"
          : "home-force-dark bg-gradient-to-b from-black/45 to-transparent",
      )}
    >
      <div className="mx-auto flex h-full max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:gap-10 lg:px-8">
        <Brand onDark={!solid} />
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-[15px] font-medium text-text-muted transition-colors hover:bg-surface-2/70 hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
          <ThemeToggle className="rounded-full" />
          <Notices />
          {loading ? (
            <span className="size-9 rounded-full bg-surface-2" aria-hidden />
          ) : user ? (
            <>
              <Link
                href={apexHref("/register")}
                className="hidden h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-[15px] font-semibold text-accent-fg shadow-[0_0_0_1px_oklch(100%_0_0/0.18)_inset,0_8px_24px_-8px_var(--accent)] transition-colors hover:bg-accent-hover sm:inline-flex"
              >
                Add game
                <IconPlus className="h-4 w-4" />
              </Link>
              <HomeMenu signedIn admin={admin} />
            </>
          ) : (
            <>
              <SignedOutButtons />
              <HomeMenu signedIn={false} admin={admin} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Brand({ onDark }: { onDark: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-lg" aria-label="PlayInWeb home">
      <Image src="/playinweb-icon.png" alt="" width={40} height={40} className="size-10 rounded-xl" />
      <span className="hidden sm:block">
        <Image
          src="/playinweb-lettermark-white.webp"
          alt="PlayInWeb"
          width={109}
          height={20}
          unoptimized
          className={cn("h-5 w-auto", onDark ? "block" : "hidden dark:block")}
        />
        <Image
          src="/playinweb-lettermark-black.webp"
          alt="PlayInWeb"
          width={109}
          height={20}
          unoptimized
          className={cn("h-5 w-auto", onDark ? "hidden" : "dark:hidden")}
        />
      </span>
    </Link>
  );
}

function SignedOutButtons() {
  const { openLogin } = useLoginDialog();
  const { openSignup } = useSignupDialog();
  return (
    <>
      <button
        type="button"
        onClick={() => openLogin()}
        className="hidden h-10 items-center rounded-full bg-surface-2 px-4 text-[15px] font-semibold text-text transition-colors hover:bg-surface-3 sm:inline-flex"
      >
        Sign in
      </button>
      <button
        type="button"
        onClick={() => openSignup()}
        className="inline-flex h-10 items-center rounded-full bg-accent px-4 text-[15px] font-semibold text-accent-fg shadow-[0_8px_24px_-8px_var(--accent)] transition-colors hover:bg-accent-hover"
      >
        Sign up free
      </button>
    </>
  );
}

function HomeMenu({ signedIn, admin }: { signedIn: boolean; admin: boolean }) {
  const { profile, signOut } = useAuth();
  const { openLogin } = useLoginDialog();
  const { features, loading: featuresLoading } = useFeatures();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const visible = (href: string) => navItemVisible(href, features, admin, featuresLoading);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={root} className={cn("relative", !signedIn && "md:hidden")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={signedIn ? "Account menu" : "Open menu"}
        className={cn(
          "grid place-items-center rounded-full transition-[box-shadow]",
          signedIn
            ? "size-10 ring-2 ring-transparent hover:ring-border-strong"
            : "size-10 text-text-muted hover:bg-surface-2 hover:text-text",
        )}
      >
        {signedIn ? (
          <Avatar
            name={profile?.display_name ?? ""}
            src={publicMediaUrl(profile?.avatar_path) || undefined}
            size={38}
          />
        ) : (
          <IconMenu className="h-5 w-5" />
        )}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right rounded-2xl border border-border bg-surface p-2 text-text shadow-panel"
        >
          {signedIn && profile ? (
            <div className="px-3 pb-2 pt-1.5">
              <p className="truncate text-body font-semibold">{profile.display_name || profile.handle}</p>
              {profile.handle ? <p className="truncate text-caption text-text-subtle">@{profile.handle}</p> : null}
            </div>
          ) : null}
          <MenuGroup>
            {NAV.filter((item) => visible(item.href)).map((item) => (
              <MenuLink key={item.href} href={item.href} label={item.label} onClick={close} className="md:hidden" />
            ))}
            {signedIn ? (
              <>
                <MenuLink href={apexHref("/register")} label="Add game" onClick={close} className="sm:hidden" />
                {ACCOUNT_LINKS.filter((item) => visible(item.href)).map((item) => (
                  <MenuLink key={item.href} href={apexHref(item.href)} label={item.label} onClick={close} />
                ))}
              </>
            ) : null}
          </MenuGroup>
          {signedIn ? (
            <MenuGroup>
              {SITE_LINKS.filter((item) => visible(item.href)).map((item) => (
                <MenuLink key={item.href} href={apexHref(item.href)} label={item.label} onClick={close} />
              ))}
            </MenuGroup>
          ) : null}
          <MenuGroup>
            {signedIn ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  void signOut();
                }}
                className="flex h-9 w-full items-center rounded-lg px-3 text-left text-body text-text-muted hover:bg-surface-2 hover:text-text"
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  openLogin();
                }}
                className="flex h-9 w-full items-center rounded-lg px-3 text-left text-body font-medium hover:bg-surface-2"
              >
                Sign in
              </button>
            )}
          </MenuGroup>
        </div>
      ) : null}
    </div>
  );
}

function MenuGroup({ children }: { children: ReactNode }) {
  return <div className="border-t border-border py-1 first:border-t-0 first:pt-0 empty:hidden">{children}</div>;
}

function MenuLink({
  href,
  label,
  onClick,
  className,
}: {
  href: string;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex h-9 items-center rounded-lg px-3 text-body text-text-muted hover:bg-surface-2 hover:text-text",
        className,
      )}
    >
      {label}
    </Link>
  );
}
