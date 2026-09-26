import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupAgreeNote } from "@/components/SignupAgreeNote";
import { SignupPagePrompt } from "@/components/SignupPagePrompt";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="min-w-0 pt-4">
      <h1 className="text-display font-semibold tracking-tight">Create an account</h1>
      <p className="mt-1.5 text-body text-text-muted">
        Your handle becomes a page on this site — <span className="text-text">localhost:4000/yourname</span>.
      </p>
      <SignupAgreeNote className="mt-3 text-body text-text-muted" />
      <div className="mt-8">
        <Suspense fallback={<p className="text-ui text-text-muted">Loading…</p>}>
          <SignupPagePrompt />
        </Suspense>
      </div>
    </div>
  );
}
