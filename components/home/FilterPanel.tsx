"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { InitialsAvatar } from "@/components/home/cards";
import { capitalize, filtersHref, toggle, type Creator, type HomeFilters } from "@/components/home/filters";
import { IconChevron, IconClose, IconGrid } from "@/components/icons";
import { cn } from "@/lib/cn";

const VISIBLE_TAGS = 6;
const AVATAR_STACK = 6;

function Group({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <div className="border-t border-border py-4 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between text-left text-[15px] font-semibold"
      >
        {title}
        <IconChevron
          className={cn("h-4 w-4 text-text-subtle transition-transform duration-200", open ? "-rotate-90" : "rotate-90")}
        />
      </button>
      <div id={id} hidden={!open} className="mt-3">
        {children}
      </div>
    </div>
  );
}

function Check({ label, checked, onChange }: { label: ReactNode; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-body text-text-muted hover:text-text has-[:checked]:text-text">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-4 shrink-0 cursor-pointer rounded accent-accent" />
      <span className="min-w-0 truncate">{label}</span>
    </label>
  );
}

function PanelBody({
  filters,
  tags,
  creators,
  go,
}: {
  filters: HomeFilters;
  tags: string[];
  creators: Creator[];
  go: (next: Partial<HomeFilters>) => void;
}) {
  const [allTags, setAllTags] = useState(false);
  const [picker, setPicker] = useState(false);
  const shownTags = allTags ? tags : tags.slice(0, VISIBLE_TAGS);
  const stack = creators.slice(0, AVATAR_STACK);

  return (
    <>
      {tags.length > 0 ? (
        <Group title="Category">
          {shownTags.map((tag) => (
            <Check
              key={tag}
              label={capitalize(tag)}
              checked={filters.tags.includes(tag)}
              onChange={() => go({ tags: toggle(filters.tags, tag) })}
            />
          ))}
          {tags.length > VISIBLE_TAGS ? (
            <button
              type="button"
              onClick={() => setAllTags((v) => !v)}
              className="mt-1 text-ui font-semibold text-accent hover:underline"
            >
              {allTags ? "Show fewer" : `Show all ${tags.length}`}
            </button>
          ) : null}
        </Group>
      ) : null}

      {creators.length > 0 ? (
        <Group title="Creator">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {stack.map((c) => {
                const on = filters.creators.includes(c.handle);
                return (
                  <button
                    key={c.handle}
                    type="button"
                    onClick={() => go({ creators: toggle(filters.creators, c.handle) })}
                    aria-pressed={on}
                    aria-label={`${on ? "Remove" : "Show only"} ${c.name}`}
                    title={c.name}
                    className={cn(
                      "rounded-full ring-2 transition-transform hover:z-10 hover:-translate-y-0.5",
                      on ? "z-10 ring-accent" : "ring-surface",
                    )}
                  >
                    <InitialsAvatar name={c.name} size={32} />
                  </button>
                );
              })}
            </div>
            {creators.length > AVATAR_STACK ? (
              <span className="text-caption text-text-subtle">+{creators.length - AVATAR_STACK} more</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setPicker((v) => !v)}
            aria-expanded={picker}
            className="mt-3 flex h-10 w-full items-center justify-center rounded-xl border border-border bg-surface-2 text-body font-semibold transition-colors hover:bg-surface-3"
          >
            {picker ? "Done" : "Pick creators"}
          </button>
          {picker ? (
            <div className="scrollbar-hide mt-2 max-h-56 overflow-y-auto">
              {creators.map((c) => (
                <Check
                  key={c.handle}
                  label={c.name}
                  checked={filters.creators.includes(c.handle)}
                  onChange={() => go({ creators: toggle(filters.creators, c.handle) })}
                />
              ))}
            </div>
          ) : null}
        </Group>
      ) : null}
    </>
  );
}

function Header({ active, onClear, onClose }: { active: boolean; onClear: () => void; onClose?: () => void }) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-border pb-4">
      <IconGrid className="h-4 w-4 text-text-muted" />
      <h2 className="text-ui font-bold uppercase tracking-[0.08em]">Filter</h2>
      {active ? (
        <button
          type="button"
          onClick={onClear}
          className="ml-auto text-caption font-bold uppercase tracking-[0.06em] text-home-amber-ink hover:underline"
        >
          Clear all
        </button>
      ) : null}
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close filters"
          className={cn("grid size-8 place-items-center rounded-full hover:bg-surface-2", !active && "ml-auto")}
        >
          <IconClose className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Category and creator filters. Duration, rating, language and type join once those
 * fields exist on games (PR 2).
 */
export function FilterPanel({
  filters,
  tags,
  creators,
  mobileOpen,
  onMobileClose,
}: {
  filters: HomeFilters;
  tags: string[];
  creators: Creator[];
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const router = useRouter();
  const active = filters.tags.length > 0 || filters.creators.length > 0;
  const go = (next: Partial<HomeFilters>) => router.replace(filtersHref({ ...filters, ...next }), { scroll: false });
  const clear = () => go({ tags: [], creators: [] });

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onMobileClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, onMobileClose]);

  if (tags.length === 0 && creators.length === 0) return null;

  return (
    <>
      <aside
        aria-label="Filters"
        className="sticky top-[88px] hidden max-h-[calc(100dvh-104px)] w-[260px] shrink-0 self-start overflow-y-auto rounded-[22px] border border-border bg-surface p-5 shadow-panel scrollbar-hide lg:block"
      >
        <Header active={active} onClear={clear} />
        <PanelBody filters={filters} tags={tags} creators={creators} go={go} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" aria-label="Close filters" className="absolute inset-0 bg-black/60" onClick={onMobileClose} />
          <div className="absolute inset-y-0 left-0 w-[min(320px,88vw)] overflow-y-auto bg-surface p-5 shadow-panel">
            <Header active={active} onClear={clear} onClose={onMobileClose} />
            <PanelBody filters={filters} tags={tags} creators={creators} go={go} />
          </div>
        </div>
      ) : null}
    </>
  );
}
