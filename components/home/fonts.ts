import { Barlow_Condensed, Pixelify_Sans, Plus_Jakarta_Sans, Silkscreen } from "next/font/google";

/** Body copy. */
const body = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--f-body", display: "swap" });

/** Poster titles printed over game art, and the italic hero title. */
const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--f-display",
  display: "swap",
});

/** The PlayInWeb wordmark. */
const logo = Pixelify_Sans({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--f-logo", display: "swap" });

/** Small pixel caps for eyebrows and labels. */
const pixel = Silkscreen({ subsets: ["latin"], weight: ["400"], variable: "--f-pixel", display: "swap" });

/** Put on the homepage root so home.module.css can use var(--f-body) and friends. */
export const homeFontVars = [body.variable, display.variable, logo.variable, pixel.variable].join(" ");
