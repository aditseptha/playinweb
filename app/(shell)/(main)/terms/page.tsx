import type { Metadata } from "next";
import { LegalBody } from "@/components/LegalBody";
import { LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <article className="mx-auto min-w-0 max-w-2xl pt-4">
      <h1 className="text-display font-semibold tracking-tight">Terms</h1>
      <p className="mt-1 text-caption text-text-subtle">Last updated {LEGAL_UPDATED}</p>
      <div className="mt-8">
        <LegalBody kind="terms" />
      </div>
    </article>
  );
}
