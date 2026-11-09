import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";
import { focusRing, hitArea } from "./styles";

export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-pw-pill font-bold",
    "transition-[translate,filter,background-color,color,border-color] duration-150 ease-pw-out active:translate-y-px",
    // Loading buttons are disabled too, but keep full colour so the spinner reads as progress.
    "disabled:pointer-events-none [&:disabled:not([aria-busy=true])]:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
    "[&_svg]:size-5 [&_svg]:shrink-0",
    focusRing,
  ],
  {
    variants: {
      variant: {
        /** The one main action on a screen: Play, Publish, Save. */
        primary:
          "bg-linear-to-b from-pw-primary-hi to-pw-primary-lo text-pw-on-primary shadow-[inset_0_1px_0_color-mix(in_srgb,var(--pw-white)_28%,transparent),var(--pw-shadow-glow)] hover:brightness-110",
        /** Everything else that is still a button. */
        secondary: "border border-pw-line-strong bg-pw-surface-2 text-pw-text hover:bg-pw-surface-3",
        /** Low-emphasis actions in toolbars and menus. */
        ghost: "text-pw-text-soft hover:bg-pw-surface-2 hover:text-pw-text",
        /** Rare spotlight actions (gold): creator invites, "Your turn". Not for routine actions. */
        highlight: "bg-pw-highlight text-pw-on-highlight hover:brightness-105",
        /** Destructive confirmations: Delete game, Disconnect PayPal. */
        danger: "bg-pw-red-700 text-pw-white hover:brightness-110",
      },
      size: {
        sm: cn("h-9 px-3.5 text-pw-body-sm [&_svg]:size-4", hitArea),
        md: "h-11 px-5 text-pw-body",
        lg: "h-12 px-6 text-pw-body",
        icon: "size-11 p-0",
        "icon-sm": cn("size-9 p-0 [&_svg]:size-4", hitArea),
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. a Next <Link>) with button styling instead of a <button>. */
    asChild?: boolean;
    /** Shows a spinner, keeps the width, and blocks clicks. Not available with `asChild`. */
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (asChild) {
    return (
      <Slot.Root className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }

  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={classes} {...props}>
      {loading ? (
        <>
          {/* opacity-0, not invisible: the label stays the button's accessible name. */}
          <span className="inline-flex items-center gap-2 opacity-0">{children}</span>
          <span className="absolute inset-0 grid place-items-center">
            <Spinner size="sm" label="" />
          </span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
