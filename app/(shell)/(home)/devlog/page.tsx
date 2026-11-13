import type { Metadata } from "next";
import { Badge } from "@/components/ds/badge";
import { cn } from "@/lib/cn";
import { DEVLOG, DEVLOG_KIND_LABEL, buildId, currentRelease, releaseAnchor, type DevlogKind } from "@/lib/devlog";
import { formatDate } from "@/lib/format";
import s from "@/components/home/home.module.css";

// The devlog (#40): which version is live and what every release changed. Opened from the
// version number in the footer.

export const metadata: Metadata = {
  title: "Devlog",
  description: "Every update to PlayInWeb, newest first: new features, improvements and fixes.",
};

const KIND_TONE: Record<DevlogKind, "success" | "primary" | "warning"> = { new: "success", improved: "primary", fixed: "warning" };
const KIND_ORDER: DevlogKind[] = ["new", "improved", "fixed"];

export default function DevlogPage() {
  const current = currentRelease();
  const build = buildId();
  return (
    <div className={s.frame}>
      <div className={cn(s.wrap, "max-w-3xl! pt-[100px] pb-20 md:pt-[120px]")}>
        <header>
          <p className="font-pw-pixel text-pw-label uppercase tracking-[0.14em] text-pw-highlight">PlayInWeb updates</p>
          <h1 className="mt-2 font-pw-display text-pw-display-xl font-extrabold uppercase italic leading-[0.9] text-pw-text">Devlog</h1>
          <p className="mt-4 max-w-prose text-pw-body text-pw-text-soft">
            Everything that changed on PlayInWeb, newest first. We&apos;re in beta, so versions stay below 1.0 for now.
          </p>
          <p className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-pw-pill border border-pw-line bg-pw-surface-1 px-4 py-2 text-pw-body-sm text-pw-text-soft">
            You&apos;re on <strong className="font-bold text-pw-text">v{current.version}</strong>
            <span aria-hidden>·</span>
            <span>{formatDate(`${current.date}T00:00:00Z`)}</span>
            {build ? (
              <>
                <span aria-hidden>·</span>
                <span>
                  build <code className="font-mono text-pw-caption text-pw-muted">{build}</code>
                </span>
              </>
            ) : null}
          </p>
        </header>

        <ol className="mt-12 grid gap-10">
          {DEVLOG.map((release, i) => (
            <li key={release.version} id={releaseAnchor(release.version)} className="scroll-mt-28">
              <article className={cn("rounded-pw-xl border p-6", i === 0 ? "border-pw-line-strong bg-pw-surface-1" : "border-pw-line")}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <a href={`#${releaseAnchor(release.version)}`} className="font-pw-display text-pw-title font-extrabold italic text-pw-highlight hover:underline">
                    v{release.version}
                  </a>
                  <time dateTime={release.date} className="text-pw-caption text-pw-muted">
                    {formatDate(`${release.date}T00:00:00Z`)}
                  </time>
                  {i === 0 ? (
                    <Badge tone="highlight" look="pixel">
                      Latest
                    </Badge>
                  ) : null}
                </div>
                <h2 className="mt-2 text-pw-title font-bold text-pw-text">{release.title}</h2>
                {release.summary ? <p className="mt-2 text-pw-body-sm text-pw-text-soft">{release.summary}</p> : null}
                <ul className="mt-4 grid gap-2.5">
                  {[...release.items]
                    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
                    .map((item, j) => (
                      <li key={j} className="flex items-start gap-3 text-pw-body-sm text-pw-text">
                        <Badge tone={KIND_TONE[item.kind]} className="mt-0.5 w-20 justify-center">
                          {DEVLOG_KIND_LABEL[item.kind]}
                        </Badge>
                        <span className="min-w-0">{item.text}</span>
                      </li>
                    ))}
                </ul>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
