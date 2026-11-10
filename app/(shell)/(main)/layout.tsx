import { Suspense, type ReactNode } from "react";
import { HomeShell } from "@/components/home/HomeShell";

/** No pages remain here. Kept so a stray error in this group still uses the top nav. */
export default function MainShellLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <HomeShell>{children}</HomeShell>
    </Suspense>
  );
}
