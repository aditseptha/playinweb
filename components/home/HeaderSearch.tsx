"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { IconSearch } from "@/components/icons";
import { filtersHref, parseFilters } from "@/components/home/filters";
import s from "@/components/home/home.module.css";
import { cn } from "@/lib/cn";

const DEBOUNCE_MS = 250;

/** Catalogue search in the top nav; updates `/?q=` on the homepage. */
export function HeaderSearch() {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const onHome = pathname === "/";
  const filters = useMemo(() => parseFilters(params), [params]);
  const [q, setQ] = useState("");
  const [sent, setSent] = useState("");
  const [urlQ, setUrlQ] = useState("");

  if (!onHome) {
    if (q !== "" || sent !== "" || urlQ !== "") {
      setQ("");
      setSent("");
      setUrlQ("");
    }
  } else if (filters.q !== urlQ) {
    setUrlQ(filters.q);
    if (filters.q !== sent) {
      setQ(filters.q);
      setSent(filters.q);
    }
  }

  useEffect(() => {
    if (q === sent) return;
    const t = window.setTimeout(() => {
      setSent(q);
      if (onHome) {
        router.replace(filtersHref({ ...filters, q }), { scroll: false });
      } else if (q.trim()) {
        router.push(filtersHref({ q }));
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [q, sent, onHome, filters, router]);

  return (
    <label className={cn(s.search, s.navSearch)}>
      <span className={s.sr}>Search games</span>
      <input
        type="search"
        placeholder="Search games"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        enterKeyHint="search"
      />
      <IconSearch className={cn(s.ic, s.sm)} />
    </label>
  );
}
