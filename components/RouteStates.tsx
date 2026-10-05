"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { apexHref } from "@/lib/host";

/** Shared body for every error.tsx boundary. */
export function ErrorState({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60dvh] w-full max-w-[46rem] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <h1 className="text-display font-semibold tracking-tight text-balance">Something went wrong.</h1>
      <p className="text-body text-text-muted">
        This page didn’t load. Try again, or head back home.
        {error.digest ? <span className="mt-2 block text-caption text-text-subtle">Error ID: {error.digest}</span> : null}
      </p>
      <div className="flex gap-3">
        <Button variant="primary" onClick={() => retry()}>
          Try again
        </Button>
        <LinkButton href={apexHref("/")}>Back to home</LinkButton>
      </div>
    </div>
  );
}

/** Shared body for every loading.tsx boundary. */
export function LoadingState() {
  return (
    <div role="status" aria-label="Loading" className="flex min-w-0 animate-pulse flex-col gap-6 motion-reduce:animate-none">
      <div className="aspect-[21/9] w-full rounded-2xl bg-surface-2" />
      <div className="h-6 w-48 rounded-lg bg-surface-2" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="aspect-video rounded-2xl bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
