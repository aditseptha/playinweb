/**
 * The HomeShell nav floats over the top of the page and is drawn for dark art (white lettermark and
 * links). Pages without a dark hero put this band behind it: invisible in the dark theme, a dark
 * header bar in the light theme. Place it first inside a full-width `relative` wrapper.
 */
export function NavBackdrop() {
  return (
    <div
      aria-hidden
      className="dark pointer-events-none absolute inset-x-0 top-0 h-16 border-b border-pw-line bg-pw-bg md:h-20"
    />
  );
}
