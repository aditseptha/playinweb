"use client";

import { LegalBody } from "@/components/LegalDialog";
import { LEGAL_UPDATED } from "@/lib/legal";

export default function PrivacyPage() {
  return (
    <article className="min-w-0 pt-4">
      <h1 className="text-display font-semibold tracking-tight">Privacy</h1>
      <p className="mt-1 text-caption text-text-subtle">Last updated {LEGAL_UPDATED}</p>
      <div className="mt-8">
        <LegalBody kind="privacy" />
      </div>
    </article>
  );
}
