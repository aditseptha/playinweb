import { Suspense, type ReactNode } from "react";
import { HomeShell } from "@/components/home/HomeShell";

/** Catalogue, legal, publish, sign-in, and the creator channel use the top-nav shell. Account tools stay in the sidebar AppShell. */
export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <HomeShell>{children}</HomeShell>
    </Suspense>
  );
}
