"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  IconBook,
  IconCompass,
  IconGhost,
  IconGrid,
  IconHeart,
  IconHistory,
  IconPuzzle,
  IconSearch,
  IconSliders,
  IconSpark,
  type AppIcon,
} from "@/components/icons";
import { capitalize, type HomeFilters } from "@/components/home/filters";
import s from "@/components/home/home.module.css";
import { cn } from "@/lib/cn";

const TAB_TAGS = 4;
const SEARCH_DEBOUNCE_MS = 250;

/** Icons for common genres; anything else gets sparkles. */
function tagIcon(tag: string): AppIcon {
  const t = tag.toLowerCase();
  if (/horror|horor|scary|ghost/.test(t)) return IconGhost;
  if (/story|folk|narrative|visual novel|cerita/.test(t)) return IconBook;
  if (/adventure|explor|petualangan/.test(t)) return IconCompass;
  if (/puzzle/.test(t)) return IconPuzzle;
  return IconSpark;
}

type Tab = { key: string; label: string; icon: AppIcon; active: boolean; onClick: () => void };

export function TabBar({
  filters,
  tags,
  filterCount,
  onChange,
  onReset,
  onOpenFilter,
}: {
  filters: HomeFilters;
  tags: string[];
  filterCount: number;
  onChange: (next: Partial<HomeFilters>) => void;
  onReset: () => void;
  onOpenFilter?: () => void;
}) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ left: number; width: number } | null>(null);
  const [q, setQ] = useState(filters.q);
  const [sent, setSent] = useState(filters.q);
  const [urlQ, setUrlQ] = useState(filters.q);
  // The URL changed from outside (Clear all, back button): show that query instead of the typed one.
  if (filters.q !== urlQ) {
    setUrlQ(filters.q);
    if (filters.q !== sent) {
      setQ(filters.q);
      setSent(filters.q);
    }
  }

  const onlyTag = !filters.view && !filters.creators.length && filters.tags.length === 1 ? filters.tags[0] : null;
  const nothing = !filters.view && !filters.tags.length && !filters.creators.length;

  const tabs: Tab[] = [
    { key: "all", label: "All games", icon: IconGrid, active: nothing, onClick: onReset },
    ...tags.slice(0, TAB_TAGS).map((tag) => ({
      key: `tag:${tag}`,
      label: capitalize(tag),
      icon: tagIcon(tag),
      active: onlyTag === tag,
      onClick: () => onChange({ view: null, creators: [], tags: [tag] }),
    })),
    {
      key: "saved",
      label: "Favorites",
      icon: IconHeart,
      active: filters.view === "saved",
      onClick: () => onChange({ view: "saved" }),
    },
    {
      key: "recent",
      label: "Recently played",
      icon: IconHistory,
      active: filters.view === "recent",
      onClick: () => onChange({ view: "recent" }),
    },
  ];
  const activeKey = tabs.find((t) => t.active)?.key ?? null;

  // Type to filter: push the query to the URL once typing pauses.
  useEffect(() => {
    if (q === sent) return;
    const t = window.setTimeout(() => {
      setSent(q);
      onChange({ q });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [q, sent, onChange]);

  // Slide the highlight under the active tab.
  useLayoutEffect(() => {
    const c = tabsRef.current;
    if (!c) return;
    const btn = c.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!btn) {
      setInd(null);
      return;
    }
    const upd = () => setInd({ left: btn.offsetLeft, width: btn.offsetWidth });
    upd();
    if (btn.offsetLeft < c.scrollLeft || btn.offsetLeft + btn.offsetWidth > c.scrollLeft + c.clientWidth) {
      c.scrollTo({ left: Math.max(0, btn.offsetLeft - 8), behavior: "smooth" });
    }
    const ro = new ResizeObserver(upd);
    ro.observe(c);
    ro.observe(btn);
    void document.fonts?.ready.then(upd);
    return () => ro.disconnect();
  }, [activeKey, tags.length]);

  return (
    <div className={s.tabbar}>
      {onOpenFilter ? (
        <button
          type="button"
          className={cn(s.tab, s.filterBtn)}
          aria-pressed={filterCount > 0}
          onClick={onOpenFilter}
          aria-label="Open filters"
        >
          <IconSliders className={cn(s.ic, s.sm)} />
          {filterCount > 0 ? <b className={s.tnum}>{filterCount}</b> : null}
        </button>
      ) : null}
      <div className={s.tabs} role="toolbar" aria-label="Categories" ref={tabsRef}>
        <span
          className={s.tabInd}
          aria-hidden
          style={ind ? { left: ind.left, width: ind.width } : { opacity: 0, left: 0, width: 0 }}
        />
        {tabs.map((t) => (
          <button key={t.key} type="button" className={s.tab} aria-pressed={t.active} onClick={t.onClick}>
            <t.icon className={cn(s.ic, s.sm)} />
            {t.label}
          </button>
        ))}
      </div>
      <label className={s.search}>
        <span className={s.sr}>Search games</span>
        <input type="search" placeholder="Search games" value={q} onChange={(e) => setQ(e.target.value)} />
        <IconSearch className={cn(s.ic, s.sm)} />
      </label>
    </div>
  );
}
