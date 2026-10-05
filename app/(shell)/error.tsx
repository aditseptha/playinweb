"use client";

import { ErrorState } from "@/components/RouteStates";
import { WithAppShell } from "@/components/WithAppShell";

export default function ShellError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <WithAppShell>
      <ErrorState {...props} />
    </WithAppShell>
  );
}
