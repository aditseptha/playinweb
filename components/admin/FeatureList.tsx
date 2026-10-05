"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function FeatureList({
  features,
  setFlags,
}: {
  features: { id: string; label: string; description: string; soon: boolean; hidden: boolean }[];
  setFlags: (id: string, flags: { hidden?: boolean; soon?: boolean }) => Promise<string | null>;
}) {
  const [drafts, setDrafts] = useState(features);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [prevFeatures, setPrevFeatures] = useState(features);

  // Reset drafts when the saved list changes (e.g. after a save), without an extra effect pass.
  if (features !== prevFeatures) {
    setPrevFeatures(features);
    setDrafts(features);
  }

  function patchDraft(id: string, patch: { hidden?: boolean; soon?: boolean }) {
    setDrafts((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    setMessages((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function saveFeature(id: string) {
    const draft = drafts.find((item) => item.id === id);
    const saved = features.find((item) => item.id === id);
    if (!draft || !saved) return;
    if (draft.hidden === saved.hidden && draft.soon === saved.soon) return;

    setSavingId(id);
    setMessages((current) => ({ ...current, [id]: "" }));
    const error = await setFlags(id, { hidden: draft.hidden, soon: draft.soon });
    setSavingId(null);
    setMessages((current) => ({
      ...current,
      [id]: error ?? "Saved.",
    }));
  }

  return (
    <section className="mt-8">
      <h2 className="text-title font-semibold tracking-tight">Feature list</h2>
      <ul className="mt-4 divide-y divide-border overflow-hidden rounded-panel bg-surface-2">
        {drafts.map((feature) => {
          const saved = features.find((item) => item.id === feature.id);
          const dirty =
            !!saved && (feature.hidden !== saved.hidden || feature.soon !== saved.soon);
          const message = messages[feature.id];

          return (
            <li key={feature.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-ui font-medium">{feature.label}</p>
                <p className="mt-0.5 text-caption text-text-subtle">{feature.description}</p>
                {message ? (
                  <p className={`mt-1 text-caption ${message === "Saved." ? "text-text-muted" : "text-danger"}`}>
                    {message}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <FlagToggle
                  label="Soon"
                  on={feature.soon}
                  onClick={() => patchDraft(feature.id, { soon: !feature.soon })}
                />
                <FlagToggle
                  label="Hide"
                  on={feature.hidden}
                  onClick={() => patchDraft(feature.id, { hidden: !feature.hidden })}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!dirty || savingId === feature.id}
                  onClick={() => void saveFeature(feature.id)}
                >
                  {savingId === feature.id ? "Saving…" : "Save"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FlagToggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full px-3 py-1.5 text-caption font-medium ${
        on ? "bg-accent text-accent-fg" : "bg-surface-2 text-text-muted hover:text-text"
      }`}
    >
      {label}
    </button>
  );
}
