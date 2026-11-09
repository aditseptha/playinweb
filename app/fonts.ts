import { Barlow_Condensed, Plus_Jakarta_Sans, Silkscreen } from "next/font/google";

// The design system's three faces. Pages built on the DS put `dsFontVars` on their root;
// tokens.css turns these into --pw-font-body / --pw-font-display / --pw-font-pixel.
// They move onto <html> in app/layout.tsx once Geist is retired (#4, R6). Until then the
// old pages don't download them.

/** Body copy and UI. */
const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--pw-font-body-face",
  display: "swap",
});

/** Poster titles printed over game art, and the italic hero title. */
const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--pw-font-display-face",
  display: "swap",
});

/** Small pixel caps for eyebrows and labels (12px and below). */
const pixel = Silkscreen({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--pw-font-pixel-face",
  display: "swap",
});

/** Put on the root of any page built on the DS. `pw-fonts` turns the faces into --pw-font-* stacks. */
export const dsFontVars = ["pw-fonts", body.variable, display.variable, pixel.variable].join(" ");
