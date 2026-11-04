import { Barlow_Condensed, Pixelify_Sans, Silkscreen } from "next/font/google";

/** Small pixel caps for eyebrows and labels. */
export const pixelFont = Silkscreen({ weight: ["400", "700"], subsets: ["latin"], display: "swap" });

/** Narrower, heavier pixel face for the hero title. */
export const pixelDisplayFont = Pixelify_Sans({ weight: ["700"], subsets: ["latin"], display: "swap" });

/** Condensed poster face for titles printed over game art. */
export const posterFont = Barlow_Condensed({ weight: ["700", "800"], subsets: ["latin"], display: "swap" });
