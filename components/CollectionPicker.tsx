"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { IconPlus } from "@/components/icons";
import { useGames } from "@/lib/store";

export function CollectionPicker({ gameId }: { gameId: string }) {
  const { collections, addToCollection, removeFromCollection, createCollection } = useGames();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onCreate(e: FormEvent) {
    e.preventDefault();
    const created = createCollection(name, gameId);
    if (created) {
      setName("");
      setCreating(false);
      setOpen(false);
    }
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-surface-2 px-4 text-body font-medium hover:bg-surface-3 sm:h-9"
        aria-expanded={open}
      >
        Add to collection
      </button>
      {open ? (
        <div className="elevated absolute right-0 z-20 mt-2 w-full min-w-[220px] rounded-panel bg-surface p-2 shadow-panel">
          {collections.length === 0 && !creating ? (
            <p className="px-2 py-2 text-xs text-muted">Create a collection</p>
          ) : (
            <ul className="max-h-48 overflow-y-auto">
              {collections.map((c) => {
                const inIt = c.gameIds.includes(gameId);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() =>
                        inIt ? removeFromCollection(c.id, gameId) : addToCollection(c.id, gameId)
                      }
                      className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-ui hover:bg-surface-2"
                    >
                      <span className="truncate">{c.name}</span>
                      {inIt ? <span className="ml-2 text-xs text-muted">Added</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {creating ? (
            <form onSubmit={onCreate} className="mt-1 flex gap-1 px-1 pb-1">
              <label htmlFor={inputId} className="sr-only">
                Collection name
              </label>
              <input
                id={inputId}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder="Name"
                className="h-8 min-w-0 flex-1 rounded-lg bg-surface-2 px-2 text-ui outline-none focus:bg-surface-3"
              />
              <button
                type="submit"
                className="rounded-lg bg-accent px-2 text-caption font-medium text-accent-fg hover:bg-accent-hover"
              >
                Add
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-ui text-text-muted hover:bg-surface-2 hover:text-text"
            >
              <IconPlus className="h-4 w-4" />
              New collection
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
