import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-display font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1.5 text-body text-text-muted">Publish games on your page, like yourname/game.</p>
      <div className="mt-8 rounded-panel bg-surface p-5">
        <Suspense fallback={<p className="text-ui text-text-muted">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
