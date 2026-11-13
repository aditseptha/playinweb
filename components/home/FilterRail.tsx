"use client";

import { IconCheck, IconChevronUp, IconSliders } from "@/components/icons";
import { useId, useState, type ReactNode } from "react";
import { capitalize, toggle, type Creator, type HomeFilters } from "@/components/home/filters";
import s from "@/components/home/home.module.css";
import { cn } from "@/lib/cn";

function Group({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <div className={s.fgroup}>
      <button type="button" className={s.fhead} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        {title}
        <IconChevronUp className={cn(s.ic, s.sm)} />
      </button>
      {open ? (
        <div className={s.fbody} id={id}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className={s.check}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className={s.box}>
        <IconCheck className={s.ic} />
      </span>
      <span className={s.checkLabel}>{label}</span>
    </label>
  );
}

/** Sidebar filters: library shortcut and categories. Creator picking is hidden for now. */
export function FilterRail({
  filters,
  tags,
  creators: _creators,
  onChange,
  onReset,
}: {
  filters: HomeFilters;
  tags: string[];
  creators: Creator[];
  onChange: (next: Partial<HomeFilters>) => void;
  onReset: () => void;
}) {
  const dirty = filters.tags.length > 0 || filters.creators.length > 0 || Boolean(filters.q.trim()) || Boolean(filters.view);
  const allCategories = filters.tags.length === 0;

  return (
    <aside className={s.rail} aria-label="Filter games">
      <div className={s.railHead}>
        <span className={s.railTitle}>
          <IconSliders className={cn(s.ic, s.sm)} />
          FILTER
        </span>
        <button type="button" className={s.linkGold} onClick={onReset} disabled={!dirty}>
          Clear all
        </button>
      </div>

      <Group title="Library">
        <CheckRow
          label="Recently played"
          checked={filters.view === "recent"}
          onChange={() =>
            filters.view === "recent" ? onChange({ view: null, browse: false }) : onChange({ view: "recent", browse: false })
          }
        />
      </Group>

      {tags.length > 0 ? (
        <Group title="Category">
          <CheckRow label="All" checked={allCategories} onChange={() => onChange({ tags: [] })} />
          {tags.map((tag) => (
            <CheckRow
              key={tag}
              label={capitalize(tag)}
              checked={filters.tags.includes(tag)}
              onChange={() => onChange({ tags: toggle(filters.tags, tag) })}
            />
          ))}
        </Group>
      ) : null}
    </aside>
  );
}
