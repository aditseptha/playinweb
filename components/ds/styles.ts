// Class strings shared across design system components.

/** Visible keyboard focus. Every interactive DS component uses it. */
export const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pw-focus-ring";

/** Grows the tap area of a control smaller than 44px without changing its look. */
export const hitArea = "before:absolute before:-inset-1 before:content-['']";

/** Text printed over game art keeps a light colour and a soft shadow in both themes. */
export const onArt = "text-pw-on-art [text-shadow:0_1px_2px_color-mix(in_srgb,var(--pw-night-950)_60%,transparent)]";

/** Shared surface for menus, popovers, dialogs and sheets. */
export const floatingSurface = "border border-pw-line-strong bg-pw-surface-raised text-pw-text shadow-pw-3";
