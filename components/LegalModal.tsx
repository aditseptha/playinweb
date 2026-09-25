"use client";

import { createContext, useCallback, useContext, useEffect, useId, useState, type ReactNode } from "react";
import { LegalBody } from "@/components/LegalBody";
import { IconClose } from "@/components/icons";
import { LEGAL_DOCS, LEGAL_UPDATED, type LegalKind } from "@/lib/legal";

const LegalContext = createContext<{ openLegal: (kind: LegalKind) => void }>({
  openLegal: () => {},
});

export function useLegalModal() {
  return useContext(LegalContext);
}

export function LegalProvider({ children }: { children: ReactNode }) {
  const [kind, setKind] = useState<LegalKind | null>(null);
  const openLegal = useCallback((next: LegalKind) => setKind(next), []);

  return (
    <LegalContext.Provider value={{ openLegal }}>
      {children}
      {kind ? <LegalModal kind={kind} onClose={() => setKind(null)} /> : null}
    </LegalContext.Provider>
  );
}

function LegalModal({ kind, onClose }: { kind: LegalKind; onClose: () => void }) {
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
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-bg/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(44rem,calc(100dvh-2rem))] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-6 pt-6">
          <div>
            <h2 id={titleId} className="text-display font-semibold tracking-tight text-text">{doc.title}</h2>
            <p className="mt-1 text-caption text-text-subtle">Last updated {LEGAL_UPDATED}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-text-subtle transition-colors hover:bg-surface-3 hover:text-text"
            onClick={onClose}
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-6 pb-6 pt-5">
          <LegalBody kind={kind} />
        </div>
      </div>
    </div>
  );
}
