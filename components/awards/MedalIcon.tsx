import { cn } from "@/lib/cn";

/**
 * The Best of PlayInWeb medal drawn flat: ribbon, clasp, Sunburst and medallion. Used for the chip
 * above a game's title, and in place of the 3D medal until three.js loads (or when it cannot run).
 */
export function MedalIcon({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 64 80"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d="M18 0 H27 L34 17 L30 19 Z" fill="#0871ed" />
      <path d="M37 0 H46 L34 19 L30 17 Z" fill="#0658d7" />
      <rect x="26.5" y="15" width="11" height="5" rx="2" fill="#ffb641" />
      <circle cx="32" cy="23.5" r="3.2" fill="none" stroke="#ffb641" strokeWidth="1.6" />
      <polygon points={SUN_OUTER} fill="#f3c058" />
      <polygon points={SUN_INNER} fill="#0a5fd8" />
      <circle cx="32" cy="53" r="14.3" fill="#e2a93c" />
      <circle cx="32" cy="53" r="11.8" fill="none" stroke="#ffe08a" strokeOpacity="0.7" strokeWidth="0.9" />
      <path d="M28 47 L39 53 L28 59 Z" fill="#ffe08a" />
    </svg>
  );
}

const SUN_OUTER =
  "32.0,26.3 28.8,36.8 23.6,32.6 22.8,39.2 13.1,34.1 18.2,43.8 11.6,44.6 15.8,49.8 5.3,53.0 15.8,56.2 11.6,61.4 18.2,62.2 13.1,71.9 22.8,66.8 23.6,73.4 28.8,69.2 32.0,79.7 35.2,69.2 40.4,73.4 41.2,66.8 50.9,71.9 45.8,62.2 52.4,61.4 48.2,56.2 58.7,53.0 48.2,49.8 52.4,44.6 45.8,43.8 50.9,34.1 41.2,39.2 40.4,32.6 35.2,36.8";
const SUN_INNER =
  "32.0,30.6 29.3,39.4 24.9,35.9 24.3,41.4 16.2,37.2 20.4,45.3 14.9,45.9 18.4,50.3 9.6,53.0 18.4,55.7 14.9,60.1 20.4,60.7 16.2,68.8 24.3,64.6 24.9,70.1 29.3,66.6 32.0,75.4 34.7,66.6 39.1,70.1 39.7,64.6 47.8,68.8 43.6,60.7 49.1,60.1 45.6,55.7 54.4,53.0 45.6,50.3 49.1,45.9 43.6,45.3 47.8,37.2 39.7,41.4 39.1,35.9 34.7,39.4";
