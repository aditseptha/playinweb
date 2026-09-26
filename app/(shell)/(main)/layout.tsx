import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/AppShell";

export default function MainShellLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
