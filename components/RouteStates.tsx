"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ds/button";
import { StatusPage } from "@/components/ds/empty-state";

/** Shared body for every error.tsx boundary. */
export function ErrorState({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      status="error"
      fullHeight={false}
      errorId={error.digest}
      actions={
        <>
          <Button variant="primary" onClick={() => retry()}>
            Try again
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </>
      }
    />
  );
}

/** Shared body for every loading.tsx boundary. */
export function LoadingState() {
  return (
    <div role="status" aria-label="Loading" className="flex min-w-0 animate-pulse flex-col gap-6 motion-reduce:animate-none">
      <div className="aspect-[21/9] w-full rounded-2xl bg-pw-surface-2" />
      <div className="h-6 w-48 rounded-lg bg-pw-surface-2" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="aspect-video rounded-2xl bg-pw-surface-2" />
        ))}
      </div>
    </div>
  );
}
