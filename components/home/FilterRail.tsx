"use client";

import { IconCheck, IconChevronUp, IconSliders } from "@/components/icons";
import { useId, useState, type ReactNode } from "react";
import { CREATOR_COLORS, capitalize, toggle, type Creator, type HomeFilters } from "@/components/home/filters";
import s from "@/components/home/home.module.css";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const VISIBLE_TAGS = 6;
const STACK = 6;

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

/**
 * Category and creator filters. Duration, rating, language and type join once
 * those fields exist on games (PR 2).
 */
export function FilterRail({
  filters,
  tags,
  creators,
  onChange,
  onReset,
}: {
  filters: HomeFilters;
  tags: string[];
  creators: Creator[];
  onChange: (next: Partial<HomeFilters>) => void;
  onReset: () => void;
}) {
  const [allTags, setAllTags] = useState(false);
  const [pick, setPick] = useState(false);
  const dirty = filters.tags.length > 0 || filters.creators.length > 0 || Boolean(filters.q.trim()) || Boolean(filters.view);
  const shownTags = allTags ? tags : tags.slice(0, VISIBLE_TAGS);

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

      {tags.length > 0 ? (
        <Group title="Category">
          {shownTags.map((tag) => (
            <CheckRow
              key={tag}
              label={capitalize(tag)}
              checked={filters.tags.includes(tag)}
              onChange={() => onChange({ tags: toggle(filters.tags, tag) })}
            />
          ))}
          {tags.length > VISIBLE_TAGS ? (
            <button type="button" className={s.more2} onClick={() => setAllTags((v) => !v)}>
              {allTags ? "Show fewer" : `Show all ${tags.length}`}
            </button>
          ) : null}
        </Group>
      ) : null}

      {creators.length > 0 ? (
        <Group title="Creator">
          <div className={s.stack}>
            {creators.slice(0, STACK).map((c, i) => (
              <span
                key={c.handle}
                title={c.name}
                className={cn(s.av, filters.creators.includes(c.handle) && s.avOn)}
                style={{ background: CREATOR_COLORS[i % CREATOR_COLORS.length] }}
              >
                {c.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatarUrl} alt="" />
                ) : (
                  initials(c.name)
                )}
              </span>
            ))}
            <span className={s.more}>
              {filters.creators.length
                ? `${filters.creators.length} selected`
                : creators.length > STACK
                  ? `+${creators.length - STACK} creators`
                  : `${creators.length} ${creators.length === 1 ? "creator" : "creators"}`}
            </span>
          </div>
          <button type="button" className={s.btnSoft} aria-expanded={pick} onClick={() => setPick((p) => !p)}>
            {pick ? "Done" : "Pick creators"}
          </button>
          {pick ? (
            <div className={s.kpop}>
              {creators.map((c) => (
                <CheckRow
                  key={c.handle}
                  label={c.name}
                  checked={filters.creators.includes(c.handle)}
                  onChange={() => onChange({ creators: toggle(filters.creators, c.handle) })}
                />
              ))}
            </div>
          ) : null}
        </Group>
      ) : null}
    </aside>
  );
}
