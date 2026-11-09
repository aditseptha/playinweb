import { OG_SIZE, siteOgImage } from "@/lib/og";

export const alt = "PlayInWeb: indie games you play right in your browser";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return siteOgImage();
}
