import { LEGAL_DOCS, type LegalKind } from "@/lib/legal";

export function LegalBody({ kind }: { kind: LegalKind }) {
  const doc = LEGAL_DOCS[kind];
  return (
    <div className="space-y-5 text-body leading-relaxed text-text-muted">
      <p>{doc.intro}</p>
      {doc.sections.map((section) => (
        <section key={section.heading} className="space-y-2">
          <h3 className="text-heading font-semibold text-text">{section.heading}</h3>
          <p>{section.body}</p>
          {section.bullets && section.bullets.length > 0 ? (
            <ul className="list-disc space-y-1.5 pl-5">
              {section.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
