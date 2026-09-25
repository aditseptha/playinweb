"use client";

import { createContext, useCallback, useContext, useEffect, useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LEGAL_DOCS, LEGAL_UPDATED, type LegalKind } from "@/lib/legal";

const LegalContext = createContext<{ openLegal: (kind: LegalKind) => void }>({
  openLegal: () => {},
});

export function useLegal() {
  return useContext(LegalContext);
}

export function LegalProvider({ children }: { children: ReactNode }) {
  const [kind, setKind] = useState<LegalKind | null>(null);
  const openLegal = useCallback((next: LegalKind) => setKind(next), []);
  return (
    <LegalContext.Provider value={{ openLegal }}>
      {children}
      {kind ? <LegalDialog kind={kind} onClose={() => setKind(null)} /> : null}
    </LegalContext.Provider>
  );
}

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

function LegalDialog({ kind, onClose }: { kind: LegalKind; onClose: () => void }) {
  const titleId = useId();
  const doc = LEGAL_DOCS[kind];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(44rem,calc(100dvh-2rem))] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 id={titleId} className="text-title font-semibold tracking-tight">
              {doc.title}
            </h2>
            <p className="mt-0.5 text-caption text-text-subtle">Last updated {LEGAL_UPDATED}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-5">
          <LegalBody kind={kind} />
        </div>
      </div>
    </div>
  );
}
