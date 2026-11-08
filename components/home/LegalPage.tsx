import Link from "next/link";
import s from "@/components/home/home.module.css";
import { LEGAL_CONTACT_EMAIL, LEGAL_DOCS, LEGAL_UPDATED, type LegalKind } from "@/lib/legal";

export function LegalPage({ kind }: { kind: LegalKind }) {
  const doc = LEGAL_DOCS[kind];
  const other = kind === "privacy" ? { href: "/terms", label: "Terms of Service" } : { href: "/privacy", label: "Privacy Policy" };

  return (
    <article className={s.legal}>
      <div className={s.frame}>
        <div className={s.wrap}>
          <p className={s.eyebrow}>{kind === "privacy" ? "Privacy" : "Terms"}</p>
          <h1 className={s.legalTitle}>{doc.title}</h1>
          <p className={s.legalMeta}>Last updated {LEGAL_UPDATED}</p>
          <p className={s.legalIntro}>{doc.intro}</p>
          <p className={s.legalLinks}>
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
            {" · "}
            <Link href={other.href}>{other.label}</Link>
          </p>
          {doc.sections.map((section) => (
            <section key={section.heading} className={s.legalSection}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
              {section.bullets && section.bullets.length > 0 ? (
                <ul>
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
