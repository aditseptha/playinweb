import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/AppShell";

export function WithAppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
