"use client";

import { IconLogout, IconMenu, IconMoon, IconPlus, IconSun, IconUser } from "@/components/icons";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { MosaicGrid } from "@/components/ui/mosaic-grid";
import { ReportDialog } from "@/components/ReportDialog";
import { LegalProvider } from "@/components/LegalModal";
import { useLoginDialog } from "@/components/LoginDialog";
import { Notices } from "@/components/Notices";
import { SignupProvider, useSignupDialog } from "@/components/SignupDialog";
import { homeFontVars } from "@/components/home/fonts";
import s from "@/components/home/home.module.css";
import { isAdminEmail } from "@/lib/admin";
import { BRAND_MARKS, BRAND_MARK_INTERVAL_MS } from "@/lib/brand";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { navItemVisible, useFeatures } from "@/lib/features";
import { apexHref } from "@/lib/host";
import { publicMediaUrl } from "@/lib/media";
import { usePrefersReducedMotion } from "@/lib/reduced-motion";
import { applyTheme, THEME_KEY } from "@/lib/theme";

/** Top-level links: only pages that exist; feature-flagged ones follow the admin flags. */
const NAV = [
  { href: "/top", label: "Rankings" },
  { href: "/showcase", label: "Showcase" },
];

/** What the sidebar offers on other pages, so it stays one click away from the homepage. */
const ACCOUNT_LINKS = [
  { href: "/profile", label: "Your channel" },
  { href: "/manage", label: "Manage games" },
  { href: "/library", label: "Library" },
  { href: "/donations", label: "Wallet" },
  { href: "/downloads", label: "Downloads" },
];

const SITE_LINKS = [
  { href: "/tip", label: "Tip the developer" },
  { href: "/report", label: "Report an issue" },
];

const FOOTER = [
  {
    title: "Explore",
    links: [
      { href: "/?view=popular", label: "All games" },
      { href: "/?view=new", label: "New releases" },
      { href: "/top", label: "Rankings" },
      { href: "/showcase", label: "Showcase" },
    ],
  },
  {
    title: "Creators",
    links: [
      { href: "/register", label: "Add a game" },
      { href: "/manage", label: "Manage games" },
      { href: "/donations", label: "Wallet" },
    ],
  },
  {
    title: "PlayInWeb",
    links: [
      { href: "/library", label: "Library" },
      { href: "/downloads", label: "Downloads" },
      { href: "/tip", label: "Tip the developer" },
      { href: "mailto:support@playinweb.com", label: "Contact" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/report", label: "Report an issue" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

function useVisible() {
  const { user } = useAuth();
  const { features, loading } = useFeatures();
  const admin = isAdminEmail(user?.email);
  return (href: string) => href.startsWith("mailto:") || navItemVisible(href, features, admin, loading);
}

/** Internal links that live on the apex domain; homepage query links stay relative. */
function hrefFor(href: string) {
  return href.startsWith("mailto:") || href.startsWith("/?") || href.startsWith("/#") ? href : apexHref(href);
}

export function HomeShell({ children }: { children: ReactNode }) {
  const [reportOpen, setReportOpen] = useState(false);
  return (
    <LegalProvider>
      <SignupProvider>
        <div data-scroll-root className={cn(s.root, homeFontVars)}>
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-black"
          >
            Skip to content
          </a>
          <Nav onReport={() => setReportOpen(true)} />
          <main id="content">{children}</main>
          <Footer onReport={() => setReportOpen(true)} />
          {reportOpen ? <ReportDialog onClose={() => setReportOpen(false)} /> : null}
        </div>
      </SignupProvider>
    </LegalProvider>
  );
}

function Logo({ animated = false }: { animated?: boolean }) {
  const [index, setIndex] = useState(0);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!animated || reduceMotion || BRAND_MARKS.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % BRAND_MARKS.length);
    }, BRAND_MARK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [animated, reduceMotion]);

  return (
    <span className={s.logo}>
      {animated ? (
        <span className={s.logoStack}>
          {BRAND_MARKS.map((src, i) => (
            <Image
              key={src}
              src={src}
              alt=""
              width={40}
              height={40}
              className={cn(s.logoMark, i === index && s.logoMarkOn)}
            />
          ))}
        </span>
      ) : (
        <Image src="/playinweb-icon.png" alt="" width={40} height={40} className={s.logoStill} />
      )}
      PlayInWeb
    </span>
  );
}

function ThemeButton() {
  return (
    <button
      type="button"
      className={s.moon}
      aria-label="Toggle light and dark mode"
      onClick={() => {
        const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
        localStorage.setItem(THEME_KEY, next);
        applyTheme(next);
      }}
    >
      <IconMoon className={cn(s.ic, "dark:hidden")} />
      <IconSun className={cn(s.ic, "hidden dark:block")} />
    </button>
  );
}

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

function Nav({ onReport }: { onReport: () => void }) {
  const { user, profile, loading, signOut } = useAuth();
  const { openLogin } = useLoginDialog();
  const { openSignup } = useSignupDialog();
  const visible = useVisible();
  const { open: accountOpen, setOpen: setAccountOpen, ref: accountRef } = usePopover();
  const [sheet, setSheet] = useState(false);

  return (
    <>
      <header className={cn(s.nav, s.frame, s.onDark)}>
        <div className={s.wrap}>
          <Link href="/" aria-label="PlayInWeb home">
            <Logo animated />
          </Link>
          <nav className={s.navlinks} aria-label="Primary">
            {NAV.filter((l) => visible(l.href)).map((l) => (
              <Link key={l.href} href={hrefFor(l.href)}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className={s.navTools}>
            <ThemeButton />
            {user ? (
              <span className={s.bell}>
                <Notices />
              </span>
            ) : null}
          </div>
          <div className={s.navRight}>
            {loading ? null : user ? (
              <>
                <Link href={apexHref("/register")} className={cn(s.btn, s.btnOutline, s.hideSm)}>
                  Add game <IconPlus className={cn(s.ic, s.sm)} />
                </Link>
                <div className={s.popWrap} ref={accountRef}>
                  <button
                    type="button"
                    className={s.avatarBtn}
                    aria-label="Account menu"
                    aria-haspopup="menu"
                    aria-expanded={accountOpen}
                    onClick={() => setAccountOpen((v) => !v)}
                  >
                    <Avatar
                      name={profile?.display_name ?? ""}
                      src={publicMediaUrl(profile?.avatar_path) || undefined}
                      size={42}
                    />
                  </button>
                  {accountOpen ? (
                    <div className={s.pop} role="menu">
                      {profile ? (
                        <div className={s.popHead}>
                          <b>{profile.display_name || profile.handle}</b>
                          {profile.handle ? <small>@{profile.handle}</small> : null}
                        </div>
                      ) : null}
                      {ACCOUNT_LINKS.filter((l) => visible(l.href)).map((l) => (
                        <Link key={l.href} href={apexHref(l.href)} role="menuitem" className={s.popItem} onClick={() => setAccountOpen(false)}>
                          {l.label}
                        </Link>
                      ))}
                      {isAdminEmail(user.email) ? (
                        <Link href={apexHref("/admin")} role="menuitem" className={s.popItem} onClick={() => setAccountOpen(false)}>
                          Admin
                        </Link>
                      ) : null}
                      <div className={s.popSep} />
                      {SITE_LINKS.filter((l) => visible(l.href)).map((l) =>
                        l.href === "/report" ? (
                          <button
                            key={l.href}
                            type="button"
                            role="menuitem"
                            className={s.popItem}
                            onClick={() => {
                              setAccountOpen(false);
                              onReport();
                            }}
                          >
                            {l.label}
                          </button>
                        ) : (
                          <Link key={l.href} href={apexHref(l.href)} role="menuitem" className={s.popItem} onClick={() => setAccountOpen(false)}>
                            {l.label}
                          </Link>
                        ),
                      )}
                      <div className={s.popSep} />
                      <button
                        type="button"
                        role="menuitem"
                        className={s.popItem}
                        onClick={() => {
                          setAccountOpen(false);
                          void signOut();
                        }}
                      >
                        <IconLogout className={cn(s.ic, s.sm)} />
                        Sign out
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <button type="button" className={cn(s.btn, s.btnDark, s.hideSm)} onClick={() => openLogin()}>
                  Sign in
                </button>
                <button type="button" className={cn(s.btn, s.btnPrimary)} onClick={() => openSignup()}>
                  Sign up free
                </button>
              </>
            )}
            <button type="button" className={cn(s.iconBtn, s.menuBtn)} aria-label="Open menu" onClick={() => setSheet(true)}>
              <IconMenu className={s.ic} />
            </button>
          </div>
        </div>
      </header>
      {sheet ? (
        <MenuSheet
          signedIn={Boolean(user)}
          onClose={() => setSheet(false)}
          onSignIn={() => openLogin()}
          onSignOut={() => void signOut()}
        />
      ) : null}
    </>
  );
}

function MenuSheet({
  signedIn,
  onClose,
  onSignIn,
  onSignOut,
}: {
  signedIn: boolean;
  onClose: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const visible = useVisible();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const links = [...NAV, ...(signedIn ? [{ href: "/register", label: "Add game" }, ...ACCOUNT_LINKS] : [])];

  return (
    <>
      <div className={s.scrim} onClick={onClose} aria-hidden />
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label="Menu">
        <div className={s.grab} />
        <div className={cn(s.sheetBody, s.menuSheet)}>
          {links
            .filter((l) => visible(l.href))
            .map((l) => (
              <Link key={l.href} href={hrefFor(l.href)} onClick={onClose}>
                {l.label}
              </Link>
            ))}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (signedIn) onSignOut();
              else onSignIn();
            }}
          >
            {signedIn ? <IconLogout className={s.ic} /> : <IconUser className={s.ic} />}
            {signedIn ? "Sign out" : "Sign in"}
          </button>
        </div>
        <div className={s.sheetFoot}>
          <button type="button" className={cn(s.btn, s.btnGhost)} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}

function Footer({ onReport }: { onReport: () => void }) {
  const visible = useVisible();
  return (
    <footer className={cn(s.footer, s.frame)}>
      <div className={s.footerGrid} style={{ "--mosaic-crest": "116px" } as CSSProperties} aria-hidden>
        <MosaicGrid cols={160} omitBefore={16} omitFrom={192} />
      </div>
      <div className={s.wrap}>
        <div className={s.fTop}>
          <div className={s.fBrand}>
            <Link href="/" aria-label="PlayInWeb home">
              <Logo />
            </Link>
          </div>
          <div className={s.fCols}>
            {FOOTER.map((col) => {
              const links = col.links.filter((l) => visible(l.href));
              if (links.length === 0) return null;
              return (
                <div key={col.title}>
                  <h5>{col.title}</h5>
                  {links.map((l) =>
                    l.href === "/report" ? (
                      <button key={l.href} type="button" onClick={onReport}>
                        {l.label}
                      </button>
                    ) : (
                      <Link key={l.href} href={hrefFor(l.href)}>
                        {l.label}
                      </Link>
                    ),
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className={s.fBot}>
          <span>© 2026 PlayInWeb</span>
          <span className={s.made}>MADE FOR INDIE STORYTELLERS</span>
        </div>
      </div>
    </footer>
  );
}
