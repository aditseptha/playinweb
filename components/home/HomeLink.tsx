"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { keepDevice } from "@/lib/device";

// Homepage filters live in the address (?view=, ?tag=, ?device=…) but are worked out in the browser
// from the catalogue it already has. Changing them through the router asks the server for the whole
// page again (about 114 KB and several seconds on a phone, #45). The browser's history API changes
// the address instantly, and Next.js still updates useSearchParams.

/** Change the homepage filters without a new history entry (chips, checkboxes, search). */
export function replaceHomeUrl(href: string) {
  window.history.replaceState(null, "", href);
}

/** The top of the catalogue column, so "See all" lands on the results, not halfway down them. */
function revealCatalogue() {
  const top = document.querySelector<HTMLElement>("[data-catalogue]");
  if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: "start" });
}

/**
 * A link to a homepage view ("See all", "Back to home"). On the homepage it switches the view in
 * place and keeps the Phone or Desktop choice; anywhere else it is a normal link.
 */
export function HomeLink({ href, onClick, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const onHome = pathname === "/";
  const to = onHome ? keepDevice(href, params.toString()) : href;

  const handle = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (!onHome || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.history.pushState(null, "", to);
    revealCatalogue();
  };

  return <Link href={to} onClick={handle} data-nav-progress={onHome ? "off" : undefined} {...props} />;
}
