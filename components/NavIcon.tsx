"use client";

import { useId, type ReactNode, type SVGProps } from "react";

export type NavIconProps = SVGProps<SVGSVGElement> & { active?: boolean };

function navColors(active?: boolean) {
  if (active) {
    return {
      primary: "#ffffff",
      secondary: "color-mix(in oklch, white 42%, transparent)",
    };
  }
  return {
    primary: "var(--text-muted)",
    secondary: "color-mix(in oklch, var(--text-muted) 42%, transparent)",
  };
}

function NavIconFill({ active, className, d, ...props }: NavIconProps & { d: string }) {
  const id = useId();
  const { primary, secondary } = navColors(active);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="none" aria-hidden className={className} {...props}>
      <defs>
        <linearGradient id={id} x1="5" y1="3" x2="19" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={primary} />
          <stop offset="100%" stopColor={secondary} />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#${id})`} />
    </svg>
  );
}

function NavIconStroke({
  active,
  className,
  children,
  ...props
}: Omit<NavIconProps, "children"> & { children: (gradId: string) => ReactNode }) {
  const id = useId();
  const { primary, secondary } = navColors(active);
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id={id} x1="5" y1="3" x2="19" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={primary} />
          <stop offset="100%" stopColor={secondary} />
        </linearGradient>
      </defs>
      {children(id)}
    </svg>
  );
}

export function IconHomeNav(props: NavIconProps) {
  return <NavIconFill {...props} d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />;
}

export function IconUserNav(props: NavIconProps) {
  return (
    <NavIconFill
      {...props}
      d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9c.2-3.4 3.2-5.5 7-5.5s6.8 2.1 7 5.5v1H5v-1z"
    />
  );
}

export function IconGridNav(props: NavIconProps) {
  return (
    <NavIconFill
      {...props}
      d="M3.5 3.5h7.2v7.2H3.5zm9.8 0h7.2v7.2h-7.2zM3.5 13.3h7.2v7.2H3.5zm9.8 0h7.2v7.2h-7.2z"
    />
  );
}

export function IconBookmarkNav(props: NavIconProps) {
  return <NavIconFill {...props} d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.5L6 20V5a1 1 0 0 1 1-1z" />;
}

export function IconWalletNav(props: NavIconProps) {
  return (
    <NavIconFill
      {...props}
      d="M5 7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1V7a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v1H5zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"
    />
  );
}

export function IconCoinNav(props: NavIconProps) {
  return (
    <NavIconFill
      {...props}
      d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19ZM11 7h2v1.05c1.15.2 2 .95 2 2.1 0 1.3-1.05 2.05-2.35 2.25V14H14v1.5h-1V17h-2v-1.5h-.15c-1.3-.2-2.35-1-2.35-2.35 0-1.35 1-2.2 2.3-2.4V8.5H9.5V7H11zm.2 6.85v-2.4c-.85.15-1.25.5-1.25 1.05s.4.9 1.25 1.35zm1.8-3.7c0-.5-.4-.9-1.2-1.05v2.25c.8-.15 1.2-.55 1.2-1.2z"
    />
  );
}

export function IconLineGraphNav({ active, className, ...props }: NavIconProps) {
  const line = "M5 16 9 11.5 12 13.5 16.5 7 20 5.5";
  const { primary, secondary } = navColors(active);
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" overflow="visible" aria-hidden className={className} {...props}>
      <path d="M4 5v14h16" stroke={secondary} opacity="0.55" />
      <path
        className="icon-chart-line motion-safe:animate-[chart-draw_2.2s_ease-in-out_infinite]"
        d={line}
        pathLength={1}
        stroke={primary}
      />
      <circle
        className="icon-chart-dot motion-safe:animate-[chart-dot_2.2s_ease-in-out_infinite]"
        r="1.35"
        fill={primary}
        stroke="none"
      />
    </svg>
  );
}

export function IconMegaphoneNav(props: NavIconProps) {
  return (
    <NavIconFill
      {...props}
      d="M4 9.2v5.6c0 .5.4.9.9.9h1.4l1.4 3.7c.2.5.7.8 1.2.6.5-.2.8-.7.6-1.2L8.6 15.7h.2L19.8 20c.7.3 1.5-.2 1.5-1V5c0-.8-.8-1.3-1.5-1L8.8 8.3H4.9c-.5 0-.9.4-.9.9z"
    />
  );
}

export function IconDownloadNav(props: NavIconProps) {
  return <NavIconFill {...props} d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z" />;
}

export function IconFlagNav(props: NavIconProps) {
  return (
    <NavIconStroke {...props}>
      {(gradId) => (
        <>
          <path d="M6 4v16" fill="none" stroke={`url(#${gradId})`} />
          <path d="M6 5h12l-2.2 3.5L18 12H6" fill="none" stroke={`url(#${gradId})`} />
        </>
      )}
    </NavIconStroke>
  );
}

export function IconShieldNav(props: NavIconProps) {
  return (
    <NavIconStroke {...props}>
      {(gradId) => (
        <path d="M12 3.5 5 6.5v6.2c0 4 2.9 6.6 7 8.3 4.1-1.7 7-4.3 7-8.3V6.5z" fill="none" stroke={`url(#${gradId})`} />
      )}
    </NavIconStroke>
  );
}

export function IconDocNav(props: NavIconProps) {
  return (
    <NavIconStroke {...props}>
      {(gradId) => (
        <>
          <path d="M7 4.5h7l4 4V19a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1z" fill="none" stroke={`url(#${gradId})`} />
          <path d="M14 4.5V9h4M9 13h6M9 16.5h4" fill="none" stroke={`url(#${gradId})`} />
        </>
      )}
    </NavIconStroke>
  );
}
