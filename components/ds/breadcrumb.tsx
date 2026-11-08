import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { focusRing } from "./styles";

// Where this page sits: Manage › Ayam Kabur › Edit. The last item is the current page and
// isn't a link. Long middle items truncate; the full text stays in `title`.

export function Breadcrumb({
  items,
  className,
}: {
  items: Array<{ label: string; href?: string }>;
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center gap-1.5 text-pw-body-sm">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li
              key={`${item.label}-${i}`}
              className={cn("flex min-w-0 items-center gap-1.5", last ? "shrink" : "shrink-0")}
            >
              {item.href && !last ? (
                <Link
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "max-w-48 truncate rounded-pw-sm text-pw-muted hover:text-pw-text hover:underline underline-offset-2",
                    focusRing,
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  title={item.label}
                  aria-current={last ? "page" : undefined}
                  className={cn("truncate", last ? "font-semibold text-pw-text" : "text-pw-muted")}
                >
                  {item.label}
                </span>
              )}
              {!last ? <ChevronRight aria-hidden className="size-4 shrink-0 text-pw-faint" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
