// Bundles 3:4 JPEGs for the site OG card (Satori reads PNG/JPEG only). Re-run after changing sources.
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const OUT = join(process.cwd(), "assets/og");
const W = 360;
const H = 480;

/** @type {{ dest: string; url: string; alreadyPortrait?: boolean; position?: string }[]} */
const SOURCES = [
  {
    dest: "poster-a.jpg",
    url: "https://pimwmbwxmcqdudcxlvot.supabase.co/storage/v1/object/public/project-media/a48a9432-c6a8-4e8e-8118-809dce5f3841/covers/6da7ba9f-52ec-45c0-b65b-7462fd8b481f.webp",
    alreadyPortrait: true,
  },
  {
    dest: "poster-b.jpg",
    // Ayam Kabur cover is 16:9; centre crop keeps the title sign and coop.
    url: "https://pimwmbwxmcqdudcxlvot.supabase.co/storage/v1/object/public/project-media/89e14074-91ea-4c75-8229-fcc5fa9c4dc6/covers/54165757-650c-4aeb-8a20-15c7ded660c4.webp",
    position: "centre",
  },
  {
    dest: "poster-c.jpg",
    url: "https://img.itch.zone/aW1nLzk5MDk2MjIucG5n/original/DvS67A.png",
  },
];

async function fetchBuffer(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

await mkdir(OUT, { recursive: true });

for (const { dest, url, alreadyPortrait, position } of SOURCES) {
  const buf = await fetchBuffer(url);
  let pipe = sharp(buf);
  const meta = await pipe.metadata();
  const ratio = (meta.width ?? 1) / (meta.height ?? 1);
  const isPortrait = alreadyPortrait || ratio < 0.85;
  pipe = pipe.resize(W, H, {
    fit: "cover",
    position: position ?? (isPortrait ? "centre" : "attention"),
  });
  await pipe.jpeg({ quality: 88 }).toFile(join(OUT, dest));
  console.log("wrote", dest, "←", url);
}
