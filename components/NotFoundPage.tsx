import { LinkButton } from "@/components/ui/button";
import { apexHref } from "@/lib/host";

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <main className="mx-auto flex w-full max-w-[46rem] flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <p className="text-5xl font-semibold tracking-tight text-text-subtle sm:text-6xl">404</p>
        <h1 className="text-display font-semibold tracking-tight text-balance">Nothing at this address.</h1>
        <LinkButton href={apexHref("/")} variant="primary">
          Back to home
        </LinkButton>
      </main>
    </div>
  );
}
