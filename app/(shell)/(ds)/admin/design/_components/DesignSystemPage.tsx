"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Chip } from "@/components/ds/badge";
import { Switch } from "@/components/ds/field";
import { PortalScope } from "@/components/ds/portal";
import { ToastProvider } from "@/components/ds/toast";
import { TooltipProvider } from "@/components/ds/tooltip";
import { focusRing } from "@/components/ds/styles";
import { cn } from "@/lib/cn";
import { ComponentSections } from "./ComponentSections";
import { FoundationSections } from "./FoundationSections";
import { DocSettingsContext, type Density } from "./kit";
import { PatternSections } from "./PatternSections";

const NAV = [
  {
    group: "Language",
    items: [
      ["principles", "Principles & voice"],
      ["colors", "Colors"],
      ["type", "Typography"],
      ["foundations", "Space, shape, motion"],
      ["format", "Formatting"],
      ["icons", "Icons"],
      ["illustrations", "Illustrations"],
      ["brand", "Brand"],
    ],
  },
  {
    group: "Build",
    items: [
      ["components", "Components"],
      ["templates", "Templates"],
      ["forms", "Form patterns"],
      ["states", "States"],
      ["interaction", "Hover, touch, keyboard"],
    ],
  },
  { group: "Log", items: [["whats-new", "What’s new"]] },
] as const;

type Preview = "site" | "dark" | "light";

export function DesignSystemPage() {
  const [preview, setPreview] = useState<Preview>("site");
  const [density, setDensity] = useState<Density>("default");
  const [worstCase, setWorstCase] = useState(false);

  return (
    <TooltipProvider>
      <header className="top-0 z-[var(--pw-z-nav)] md:sticky border-b border-pw-line bg-[color-mix(in_srgb,var(--pw-bg)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 md:px-6">
          <Link href="/admin" className={cn("flex items-center gap-2.5 rounded-pw-md", focusRing)}>
            <Image src="/playinweb-icon.png" alt="" width={32} height={32} className="rounded-pw-sm" />
            <span className="leading-tight">
              <span className="block text-pw-body-sm font-bold">Design system</span>
              <span className="block text-pw-caption text-pw-muted">PlayInWeb · back to admin</span>
            </span>
          </Link>
          <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2">
            <fieldset className="flex items-center gap-1.5">
              <legend className="sr-only">Preview theme</legend>
              <span aria-hidden className="mr-1 text-pw-caption text-pw-muted">
                Theme
              </span>
              {(["site", "dark", "light"] as const).map((p) => (
                <Chip key={p} pressed={preview === p} onClick={() => setPreview(p)} size="sm">
                  {p === "site" ? "Site" : p === "dark" ? "Dark" : "Light"}
                </Chip>
              ))}
            </fieldset>
            <fieldset className="flex items-center gap-1.5">
              <legend className="sr-only">Table density</legend>
              <span aria-hidden className="mr-1 text-pw-caption text-pw-muted">
                Density
              </span>
              {(["default", "compact"] as const).map((d) => (
                <Chip key={d} pressed={density === d} onClick={() => setDensity(d)} size="sm">
                  {d === "default" ? "Default" : "Compact"}
                </Chip>
              ))}
            </fieldset>
            <Switch
              label="Worst-case data"
              checked={worstCase}
              onCheckedChange={setWorstCase}
              className="text-pw-body-sm"
            />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-10 md:px-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Design system sections" className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-6">
            {NAV.map((g) => (
              <div key={g.group}>
                <p className="mb-2 font-pw-pixel text-pw-label tracking-[0.06em] text-pw-muted uppercase">{g.group}</p>
                <ul className="flex flex-col gap-0.5">
                  {g.items.map(([id, label]) => (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        className={cn(
                          "block rounded-pw-sm px-2 py-1.5 text-pw-body-sm text-pw-text-soft hover:bg-pw-surface-2 hover:text-pw-text",
                          focusRing,
                        )}
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* The preview theme class sits on this wrapper; floating UI portals into it too. */}
        <div className={cn("min-w-0", preview !== "site" && preview)}>
          <PortalScope>
            <ToastProvider>
              <DocSettingsContext.Provider value={{ density, worstCase }}>
                <main className="flex min-w-0 flex-col gap-16 rounded-pw-2xl bg-pw-bg text-pw-text">
                  <div>
                    <h1 className="font-pw-display text-pw-display-xl font-extrabold uppercase italic">
                      <span className="bg-linear-to-b from-pw-gold-soft to-pw-orange bg-clip-text text-transparent">
                        One language
                      </span>
                      <br />
                      for every page
                    </h1>
                    <p className="mt-4 max-w-2xl text-pw-body text-pw-muted">
                      Tokens, components, templates and state patterns for PlayInWeb, rendered from the real code.
                      Everything here is in <code className="text-pw-text-soft">lib/tokens.ts</code> and{" "}
                      <code className="text-pw-text-soft">components/ds</code>. Use the theme and worst-case toggles
                      above to check a component before you ship it.
                    </p>
                  </div>
                  <FoundationSections />
                  <ComponentSections />
                  <PatternSections />
                </main>
              </DocSettingsContext.Provider>
            </ToastProvider>
          </PortalScope>
        </div>
      </div>
    </TooltipProvider>
  );
}
