"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { capitalize, filtersHref, type HomeFilters } from "@/components/home/filters";
import { IconClock, IconGrid, IconHeart, IconSearch } from "@/components/icons";
import { cn } from "@/lib/cn";

const TAB_TAGS = 4;

function Tab({ href, active, icon, children }: { href: string; active: boolean; icon?: ReactNode; children: ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-ui font-medium transition-colors",
        active
          ? "bg-accent text-accent-fg shadow-[0_6px_18px_-8px_var(--accent)]"
          : "text-text-muted hover:bg-surface-2 hover:text-text",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

/** Quick filters and search in one bar: the tabs set a single view, the panel combines filters. */
export function CategoryTabs({
  filters,
  tags,
  onOpenFilters,
}: {
  filters: HomeFilters;
  tags: string[];
  onOpenFilters?: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState(filters.q);
  const onlyTag = filters.tags.length === 1 && !filters.creators.length && !filters.view ? filters.tags[0] : null;
  const nothing = !filters.q && !filters.tags.length && !filters.creators.length && !filters.view;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    router.push(filtersHref({ ...filters, q: value.trim() }), { scroll: false });
  }

  return (
    <div className="flex flex-col gap-2 rounded-[22px] border border-border bg-surface p-1.5 shadow-panel md:flex-row md:items-center md:rounded-full">
      <div className="scrollbar-hide flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {onOpenFilters ? (
          <button
            type="button"
            onClick={onOpenFilters}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border px-4 text-ui font-semibold lg:hidden"
          >
            Filters
            {filters.tags.length + filters.creators.length > 0 ? (
              <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] text-accent-fg">
                {filters.tags.length + filters.creators.length}
              </span>
            ) : null}
          </button>
        ) : null}
        <Tab href="/" active={nothing} icon={<IconGrid className="h-4 w-4" />}>
          All games
        </Tab>
        {tags.slice(0, TAB_TAGS).map((tag) => (
          <Tab key={tag} href={filtersHref({ tags: [tag] })} active={onlyTag === tag}>
            {capitalize(tag)}
          </Tab>
        ))}
        <Tab href={filtersHref({ view: "liked" })} active={filters.view === "liked"} icon={<IconHeart className="h-4 w-4" />}>
          Liked
        </Tab>
        <Tab href={filtersHref({ view: "recent" })} active={filters.view === "recent"} icon={<IconClock className="h-4 w-4" />}>
          Recently played
        </Tab>
      </div>
      <form onSubmit={onSubmit} role="search" className="md:w-52 md:shrink-0 2xl:w-64">
        <label htmlFor={id} className="sr-only">
          Search games and creators
        </label>
        <div className="flex h-10 items-center rounded-full border border-border bg-surface-2 pl-4 pr-1 focus-within:border-accent">
          <input
            id={id}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search games"
            className="h-full min-w-0 flex-1 bg-transparent text-ui text-text outline-none placeholder:text-text-subtle"
          />
          <button type="submit" aria-label="Search" className="grid size-8 place-items-center rounded-full text-text-muted hover:text-text">
            <IconSearch className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
