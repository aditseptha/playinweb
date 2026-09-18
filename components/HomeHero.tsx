export function HomeHero() {
  return (
    <section className="relative isolate overflow-hidden px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
      <CosmicBackdrop />
      <div className="relative z-10 max-w-xl">
        <h1 className="text-[40px] font-semibold leading-[1.05] tracking-tight text-white sm:text-[52px] lg:text-[60px]">
          Play Free Online Games
        </h1>
        <p className="mt-5 max-w-[34ch] text-[15px] leading-relaxed text-white/80 sm:text-base">
          Indie games you can open in the browser. No install, no paywall. Pick a title and play.
        </p>
      </div>
    </section>
  );
}

export function CosmicBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_80%_20%,oklch(0.38_0.14_280)_0%,oklch(0.22_0.08_270)_42%,oklch(0.16_0.04_260)_100%)]" />
      <div className="absolute -right-10 top-[-20%] h-[130%] w-[70%] bg-[conic-gradient(from_210deg_at_70%_40%,transparent_0deg,oklch(0.78_0.12_250_/_0.35)_40deg,transparent_90deg,oklch(0.7_0.16_300_/_0.28)_140deg,transparent_200deg)] blur-2xl" />
      <div className="absolute right-[8%] top-[8%] h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
      <svg
        className="absolute inset-y-0 right-0 hidden h-full w-[62%] motion-safe:animate-[hero-drift_18s_ease-in-out_infinite] md:block"
        viewBox="0 0 720 420"
        fill="none"
      >
        <g opacity="0.95">
          <path d="M220 360c80-90 190-150 310-168" stroke="oklch(0.78 0.1 250 / 0.35)" strokeWidth="1.2" />
          <path d="M250 380c90-70 200-120 340-128" stroke="oklch(0.7 0.14 300 / 0.25)" strokeWidth="1" />
        </g>
        <g transform="translate(250 250) rotate(-18)">
          <rect width="54" height="54" rx="8" fill="#f4efe4" />
          <circle cx="16" cy="16" r="5" fill="#1d1a18" />
          <circle cx="38" cy="16" r="5" fill="#1d1a18" />
          <circle cx="16" cy="38" r="5" fill="#1d1a18" />
          <circle cx="38" cy="38" r="5" fill="#1d1a18" />
          <circle cx="27" cy="27" r="5" fill="#1d1a18" />
        </g>
        <g transform="translate(340 180) rotate(14)">
          <rect width="44" height="60" rx="6" fill="#f7f3ee" />
          <rect x="8" y="10" width="28" height="8" rx="2" fill="#c5342a" />
          <path d="M14 28h16M14 36h12" stroke="#1d1a18" strokeWidth="2" />
        </g>
        <g transform="translate(430 120) rotate(-8)">
          <polygon points="28,4 52,20 44,50 12,50 4,20" fill="#5ad0ff" />
          <polygon points="28,12 44,24 38,46 18,46 12,24" fill="#9ae6ff" />
        </g>
        <g transform="translate(520 70) rotate(22)">
          <rect width="48" height="48" rx="6" fill="#7c5cff" />
          <path d="M10 18h28v20H10z" fill="#b9a8ff" />
        </g>
        <g transform="translate(390 250) rotate(8)">
          <path d="M8 8h22v22H8zM30 20h20v20H30zM12 30h20v20H12z" fill="#3dd68c" />
        </g>
        <g transform="translate(560 150) rotate(-16)">
          <ellipse cx="22" cy="22" rx="22" ry="22" fill="#ff6b9a" />
          <ellipse cx="16" cy="16" rx="8" ry="6" fill="#ffd0e0" opacity="0.7" />
        </g>
        <g transform="translate(470 280) rotate(12)">
          <rect width="50" height="36" rx="6" fill="#ffd45e" />
          <circle cx="16" cy="18" r="6" fill="#1d1a18" />
          <circle cx="34" cy="18" r="6" fill="#1d1a18" />
        </g>
        <g transform="translate(610 210) rotate(6)">
          <path d="M6 20 26 4l20 16-8 24H14z" fill="#ff8a3d" />
        </g>
      </svg>
    </div>
  );
}
