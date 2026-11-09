import type { Metadata } from "next";
import type { ReactNode } from "react";
import { dsFontVars } from "@/app/fonts";
import { cn } from "@/lib/cn";
import { DsAccessGate } from "./_components/DsAccessGate";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

// Own route group, so the page renders without AppShell and the old LetMotion look.
// Access: open on localhost and Vercel previews (decided on the server, from the environment);
// production stays admin-only until we decide who else may see it.
export default function DesignSystemLayout({ children }: { children: ReactNode }) {
  const open = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  return (
    <div
      data-scroll-root
      className={cn(dsFontVars, "h-dvh overflow-y-auto bg-pw-bg font-pw-body text-pw-body text-pw-text")}
    >
      {open ? children : <DsAccessGate>{children}</DsAccessGate>}
    </div>
  );
}
