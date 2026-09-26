import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    ...props,
  };
}

function glyph(props: IconProps) {
  return base({ ...props, fill: "currentColor", stroke: "none" });
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <svg {...glyph(props)}>
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

export function IconLineGraph(props: IconProps) {
  const line = "M5 16 9 11.5 12 13.5 16.5 7 20 5.5";
  return (
    <svg {...base({ ...props, overflow: "visible" })}>
      <path d="M4 5v14h16" opacity="0.35" />
      <path
        className="icon-chart-line motion-safe:animate-[chart-draw_2.2s_ease-in-out_infinite]"
        d={line}
        pathLength={1}
      />
      <circle
        className="icon-chart-dot motion-safe:animate-[chart-dot_2.2s_ease-in-out_infinite]"
        r="1.35"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16.5 20.5 21" />
    </svg>
  );
}

export function IconMail(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="m4 8 8 6 8-6" />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6.2 9.5a5.8 5.8 0 0 1 11.6 0c0 4 1.2 5.5 1.2 5.5H5s1.2-1.5 1.2-5.5Z" />
      <path d="M10 18.2a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg {...base({ ...props, fill: "currentColor", stroke: "none" })}>
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconSun(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6.1 6.1l1.4 1.4M16.5 16.5l1.4 1.4M6.1 17.9l1.4-1.4M16.5 7.5l1.4-1.4" />
    </svg>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15.5 4.2A7.8 7.8 0 1 0 19.8 15 6.2 6.2 0 0 1 15.5 4.2z" />
    </svg>
  );
}

export function IconExternal(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M14 5h5v5M19 5l-9 9" />
      <path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <svg {...glyph(props)}>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9c.2-3.4 3.2-5.5 7-5.5s6.8 2.1 7 5.5v1H5v-1z" />
    </svg>
  );
}

export function IconChevron(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function IconHeart({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base({ ...props, fill: filled ? "currentColor" : "none" })}>
      <path d="M12 19s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 6.2 3.8 3.8 0 0 1 19 9.8C19 14.6 12 19 12 19z" />
    </svg>
  );
}

export function IconBookmark({ filled = true, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base({ ...props, fill: filled ? "currentColor" : "none" })}>
      <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.5L6 20V5a1 1 0 0 1 1-1z" />
    </svg>
  );
}

export function IconShrink(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 4v5H4M15 4v5h5M4 15h5v5M20 15h-5v5" />
    </svg>
  );
}

export function IconExpand(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 4H4v5M15 4h5v5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

export function IconFullscreen(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 4H5a1 1 0 0 0-1 1v3M16 4h3a1 1 0 0 1 1 1v3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" />
    </svg>
  );
}

export function IconFullscreenExit(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 4v3H5M16 4v3h3M5 16h3v3M19 16h-3v3" />
    </svg>
  );
}

export function IconThumbUp({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base({ ...props, fill: filled ? "currentColor" : "none" })}>
      <path d="M7 11v9H4.8A1.8 1.8 0 0 1 3 18.2V12.8A1.8 1.8 0 0 1 4.8 11H7zM7 11l3.2-6.2A1.8 1.8 0 0 1 11.8 4h.4A2.8 2.8 0 0 1 15 6.8V9h4.1a2 2 0 0 1 2 2.3l-1.1 7A2 2 0 0 1 18 20H7" />
    </svg>
  );
}

export function IconThumbDown({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base({ ...props, fill: filled ? "currentColor" : "none" })}>
      <path d="M17 13V4h2.2A1.8 1.8 0 0 1 21 5.8v5.4A1.8 1.8 0 0 1 19.2 13H17zM17 13l-3.2 6.2A1.8 1.8 0 0 1 12.2 20h-.4A2.8 2.8 0 0 1 9 17.2V15H4.9a2 2 0 0 1-2-2.3l1.1-7A2 2 0 0 1 6 4h11" />
    </svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <svg {...glyph(props)}>
      <path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z" />
    </svg>
  );
}

export function IconShare(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="18" cy="6" r="2.4" />
      <circle cx="6" cy="12" r="2.4" />
      <circle cx="18" cy="18" r="2.4" />
      <path d="M8.2 10.8 15.8 7.2M8.2 13.2l7.6 3.6" />
    </svg>
  );
}

export function IconGrid(props: IconProps) {
  return (
    <svg {...glyph(props)}>
      <path d="M3.5 3.5h7.2v7.2H3.5zm9.8 0h7.2v7.2h-7.2zM3.5 13.3h7.2v7.2H3.5zm9.8 0h7.2v7.2h-7.2z" />
    </svg>
  );
}

export function IconMegaphone(props: IconProps) {
  return (
    <svg {...glyph(props)}>
      <path d="M4 9.2v5.6c0 .5.4.9.9.9h1.4l1.4 3.7c.2.5.7.8 1.2.6.5-.2.8-.7.6-1.2L8.6 15.7h.2L19.8 20c.7.3 1.5-.2 1.5-1V5c0-.8-.8-1.3-1.5-1L8.8 8.3H4.9c-.5 0-.9.4-.9.9z" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12s2.8-5.5 8-5.5 8 5.5 8 5.5-2.8 5.5-8 5.5S4 12 4 12z" />
      <circle cx="12" cy="12" r="2.2" />
    </svg>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12s2.8-5.5 8-5.5 8 5.5 8 5.5-2.8 5.5-8 5.5S4 12 4 12z" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M5 19 19 5" />
    </svg>
  );
}

export function IconFlag(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 4v16" />
      <path d="M6 5h12l-2.2 3.5L18 12H6" />
    </svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5 5 6.5v6.2c0 4 2.9 6.6 7 8.3 4.1-1.7 7-4.3 7-8.3V6.5z" />
    </svg>
  );
}

export function IconDoc(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 4.5h7l4 4V19a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1z" />
      <path d="M14 4.5V9h4M9 13h6M9 16.5h4" />
    </svg>
  );
}

export function IconTrophy(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 4h8v4.2a4 4 0 0 1-8 0z" />
      <path d="M8 6H5.6A2.4 2.4 0 0 0 8 9.3M16 6h2.4A2.4 2.4 0 0 1 16 9.3" />
      <path d="M10 12.8V15h4v-2.2M9 19h6" />
    </svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="5.5" width="16" height="14" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M4 10.5h16" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12.5 9.5 17 19 7.5" />
    </svg>
  );
}

export function IconWallet(props: IconProps) {
  return (
    <svg {...glyph(props)}>
      <path
        fillRule="evenodd"
        d="M5 7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1V7a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v1H5zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"
      />
    </svg>
  );
}

export function IconCoin(props: IconProps) {
  return (
    <svg {...glyph(props)}>
      <path
        fillRule="evenodd"
        d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19ZM11 7h2v1.05c1.15.2 2 .95 2 2.1 0 1.3-1.05 2.05-2.35 2.25V14H14v1.5h-1V17h-2v-1.5h-.15c-1.3-.2-2.35-1-2.35-2.35 0-1.35 1-2.2 2.3-2.4V8.5H9.5V7H11zm.2 6.85v-2.4c-.85.15-1.25.5-1.25 1.05s.4.9 1.25 1.35zm1.8-3.7c0-.5-.4-.9-1.2-1.05v2.25c.8-.15 1.2-.55 1.2-1.2z"
      />
    </svg>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 8v4.2l2.6 1.6" />
    </svg>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

export function IconStar({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base({ ...props, fill: filled ? "currentColor" : "none" })}>
      <path d="M12 4.2 14.2 9l5.3.5-4 3.6 1.2 5.2L12 15.7 7.3 18.3 8.5 13.1 4.5 9.5 9.8 9z" />
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M12 9.5v13l12-6.5z" fill="var(--on-accent)" />
    </svg>
  );
}
