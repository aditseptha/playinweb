// Writes app/tokens.css from lib/tokens.ts.
//   node scripts/build-tokens.mjs          write the file
//   node scripts/build-tokens.mjs --check  fail if the committed file is out of date (CI)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const { tokensCss } = await import("../lib/tokens.ts");
const out = fileURLToPath(new URL("../app/tokens.css", import.meta.url));
const next = tokensCss();

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(out, "utf8");
  } catch {}
  if (current !== next) {
    console.error("app/tokens.css is out of date. Run `npm run tokens` and commit the result.");
    process.exit(1);
  }
  console.log("app/tokens.css is up to date.");
} else {
  writeFileSync(out, next);
  console.log("Wrote app/tokens.css");
}
