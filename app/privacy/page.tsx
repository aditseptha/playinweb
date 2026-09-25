import type { Metadata } from "next";
import Link from "next/link";
import { LegalBody } from "@/components/LegalBody";
import { LEGAL_CONTACT_EMAIL, LEGAL_DOCS, LEGAL_UPDATED } from "@/lib/legal";

const doc = LEGAL_DOCS.privacy;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "PlayInWeb Privacy Policy — how we collect, use, share, and protect your personal information when you browse, play, sign in, publish, donate, or use payments on playinweb.com.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto min-w-0 max-w-2xl pt-4 pb-12">
      <header className="border-b border-border pb-6">
        <h1 className="text-display font-semibold tracking-tight">{doc.title}</h1>
        <p className="mt-2 text-body text-text-muted">Last updated {LEGAL_UPDATED}</p>
        <p className="mt-4 text-body leading-relaxed text-text-muted">{doc.intro}</p>
        <p className="mt-3 text-body text-text-muted">
          Contact:{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-text underline-offset-2 hover:underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          {" · "}
          <Link href="/terms" className="text-text underline-offset-2 hover:underline">
            Terms of Service
          </Link>
        </p>
      </header>
      <nav aria-label="Privacy policy sections" className="mt-6 rounded-xl border border-border bg-surface-2 px-4 py-3">
        <p className="text-caption font-medium text-text-subtle">On this page</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-ui text-text-muted">
          {doc.sections.map((section) => (
            <li key={section.heading}>{section.heading}</li>
          ))}
        </ol>
      </nav>
      <div className="mt-8">
        <LegalBody kind="privacy" showIntro={false} />
      </div>
    </article>
  );
}
