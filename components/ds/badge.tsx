import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { focusRing, hitArea } from "./styles";

export const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-bold [&_svg]:size-3.5",
  {
    variants: {
      tone: {
        neutral: "bg-pw-surface-3 text-pw-text-soft",
        primary: "bg-pw-primary text-pw-on-primary",
        /** Gold. Reserved for rank and spotlight: TOP, Featured. */
        highlight: "bg-pw-highlight text-pw-on-highlight",
        /** Gold text without a fill, for eyebrows: "Featured game". */
        "highlight-text": "bg-transparent px-0! text-pw-highlight-ink",
        success: "bg-pw-success/15 text-pw-success",
        danger: "bg-pw-danger/15 text-pw-danger",
        warning: "bg-pw-warning/15 text-pw-warning",
        /** Sits on game art: dark glass with light text in both themes. */
        art: "bg-[color-mix(in_srgb,var(--pw-night-900)_72%,transparent)] text-pw-on-art backdrop-blur-sm border border-[color-mix(in_srgb,var(--pw-sky)_12%,transparent)]",
      },
      look: {
        /** Small caps label, 11px. */
        label: "h-6 rounded-pw-sm px-2 text-pw-label uppercase tracking-[0.04em]",
        /** Pixel font eyebrow, for game-world flavour (Your turn!, NEW). */
        pixel: "h-6 rounded-pw-sm px-2 font-pw-pixel text-pw-label font-normal uppercase tracking-[0.06em]",
        /** Rounded pill with sentence-case text: "Instant play", "This device only". */
        pill: "h-7 rounded-pw-pill px-3 text-pw-caption font-medium",
      },
    },
    defaultVariants: { tone: "neutral", look: "label" },
  },
);

export function Badge({
  tone,
  look,
  className,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, look }), className)} {...props} />;
}

/** Toggle chip for filters. Pressed state is announced through aria-pressed. */
export function Chip({
  pressed,
  size = "md",
  className,
  type = "button",
  ...props
}: Omit<React.ComponentProps<"button">, "aria-pressed"> & { pressed: boolean; size?: "sm" | "md" }) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={cn(
        "relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-pw-pill border text-pw-body-sm font-semibold transition-colors duration-150 [&_svg]:size-4",
        size === "md" ? "h-11 px-4" : cn("h-9 px-3", hitArea),
        pressed
          ? "border-pw-primary-hi bg-pw-primary/15 text-pw-text"
          : "border-pw-line-strong bg-pw-surface-1 text-pw-text-soft hover:bg-pw-surface-2 hover:text-pw-text",
        "disabled:opacity-45",
        focusRing,
        className,
      )}
      {...props}
    />
  );
}
