"use client";

import Image from "next/image";
import Link from "next/link";
import { pixelFont } from "@/components/home/fonts";
import { isAdminEmail } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { navItemVisible, useFeatures } from "@/lib/features";
import { apexHref } from "@/lib/host";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { href: "/?view=all", label: "All games" },
      { href: "/?view=all&sort=new", label: "New releases" },
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

export function HomeFooter() {
  const { user } = useAuth();
  const { features, loading } = useFeatures();
  const admin = isAdminEmail(user?.email);

  return (
    <footer className="mt-20 border-t border-border">
      <div className="mx-auto max-w-[1600px] px-4 pb-8 pt-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5" aria-label="PlayInWeb home">
              <Image src="/playinweb-icon.png" alt="" width={40} height={40} className="size-10 rounded-xl" />
              <Image
                src="/playinweb-lettermark-white.webp"
                alt="PlayInWeb"
                width={109}
                height={20}
                unoptimized
                className="hidden h-5 w-auto dark:block"
              />
              <Image
                src="/playinweb-lettermark-black.webp"
                alt="PlayInWeb"
                width={109}
                height={20}
                unoptimized
                className="h-5 w-auto dark:hidden"
              />
            </Link>
            <p className="mt-4 text-body leading-relaxed text-text-muted">
              Story and adventure games from indie creators. Play them right in the browser, nothing to download.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-4 lg:gap-x-16">
            {COLUMNS.map((col) => {
              const links = col.links.filter(
                (l) => l.href.startsWith("mailto:") || navItemVisible(l.href, features, admin, loading),
              );
              if (links.length === 0) return null;
              return (
                <div key={col.title}>
                  <p className="text-body font-semibold">{col.title}</p>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {links.map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href.startsWith("mailto:") || l.href.startsWith("/?") ? l.href : apexHref(l.href)}
                          className="text-body text-text-muted transition-colors hover:text-text"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center gap-3 border-t border-border pt-6 text-caption text-text-subtle sm:flex-row sm:justify-between">
          <p>© 2026 PlayInWeb</p>
          <p className={cn(pixelFont.className, "text-[11px] uppercase tracking-[0.12em] text-home-amber-ink")}>
            Made for indie storytellers
          </p>
        </div>
      </div>
    </footer>
  );
}
