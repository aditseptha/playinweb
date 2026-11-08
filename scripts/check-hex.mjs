// Fails when design system code contains raw colours. DS code uses tokens (bg-pw-*, var(--pw-*)).
// Scope: new DS code only. Older files are cleaned up page by page in the redesign (#4).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const SCOPES = ["components/ds", "app/(shell)/(ds)"];
const EXT = /\.(tsx?|css)$/;
// #abc, #aabbcc, #aabbccdd as a colour (not inside an id like "#forms").
const HEX = /(?<![\w&/-])#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})\b(?![\w-])/gi;
const RGB = /\brgba?\(\s*\d/gi;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : EXT.test(name) ? [p] : [];
  });
}

const problems = [];
for (const scope of SCOPES) {
  for (const file of walk(join(root, scope))) {
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        const hits = [...line.matchAll(HEX), ...line.matchAll(RGB)].map((m) => m[0]);
        // Anchor links such as href="#forms" are not colours.
        const colours = hits.filter((h) => !/^#[a-z]+$/i.test(h) || /^#[0-9a-f]+$/i.test(h));
        if (colours.length) problems.push(`${relative(root, file)}:${i + 1}  ${colours.join(", ")}`);
      });
  }
}

if (problems.length) {
  console.error("Raw colours in design system code. Use a token from lib/tokens.ts instead:\n" + problems.join("\n"));
  process.exit(1);
}
console.log("No raw colours in design system code.");
