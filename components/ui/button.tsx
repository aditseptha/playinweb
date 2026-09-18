"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "icon" | "icon-sm";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover shadow-sm",
  secondary: "bg-surface-2 text-text hover:bg-surface-3",
  ghost: "text-text-muted hover:text-text hover:bg-surface-2",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-ui gap-1.5 rounded-lg",
  md: "h-10 sm:h-9 px-3.5 text-body gap-2 rounded-lg",
  icon: "size-10 sm:size-9 rounded-lg",
  "icon-sm": "size-7 rounded-md",
};

const base =
  "inline-flex shrink-0 items-center justify-center font-medium transition-colors select-none";

export function Button({
  className,
  variant = "secondary",
  size = "md",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type={type}
      className={cn(base, "disabled:pointer-events-none disabled:opacity-45", variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export function LinkButton({
  className,
  variant = "secondary",
  size = "md",
  href,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  size?: Size;
  href: string;
}) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...props} />
  );
}
