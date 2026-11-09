"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// Dialogs, sheets, menus and toasts render in a portal. By default that is <body>, which only
// sees the site theme. A preview area (the DS page's light/dark toggle) can provide its own
// container so floating UI picks up the same theme class and fonts.

const PortalContext = createContext<HTMLElement | null>(null);

export function usePortalContainer() {
  return useContext(PortalContext) ?? undefined;
}

/** Renders `children` plus an empty node that floating UI inside it portals into. */
export function PortalScope({ children, className }: { children: ReactNode; className?: string }) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  return (
    <PortalContext.Provider value={node}>
      {children}
      <div ref={setNode} className={className} />
    </PortalContext.Provider>
  );
}
