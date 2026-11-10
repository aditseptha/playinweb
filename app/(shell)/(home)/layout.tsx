import { Suspense, type ReactNode } from "react";
import { HomeShell } from "@/components/home/HomeShell";

/** Catalogue, legal, publish, sign-in, the creator channel, library, manage games, wallet, and the remaining account pages use the top-nav shell. */
export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <HomeShell>{children}</HomeShell>
    </Suspense>
  );
}
