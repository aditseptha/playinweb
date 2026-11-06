import { Suspense, type ReactNode } from "react";
import { HomeShell } from "@/components/home/HomeShell";

/** The homepage gets its own top-nav shell; every other page keeps the sidebar AppShell in (main). */
export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <HomeShell>{children}</HomeShell>
    </Suspense>
  );
}
