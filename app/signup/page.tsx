import type { Metadata } from "next";
import { SignupForm } from "@/components/SignupForm";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="min-w-0 pt-4">
      <h1 className="text-display font-semibold tracking-tight">Create an account</h1>
      <p className="mt-1.5 text-body text-text-muted">
        Your handle becomes a page on this site — <span className="text-text">localhost:4000/yourname</span>.
      </p>
      <div className="mt-8 max-w-md rounded-panel bg-surface-2 p-5">
        <SignupForm />
      </div>
    </div>
  );
}
