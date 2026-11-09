// Writes supabase/templates/*.html from lib/email-templates.ts.
//   node scripts/build-emails.mjs          write the files
//   node scripts/build-emails.mjs --check  fail if a committed file is out of date (CI)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const { EMAIL_TEMPLATES } = await import("../lib/email-templates.ts");
const dir = fileURLToPath(new URL("../supabase/templates/", import.meta.url));
const check = process.argv.includes("--check");
const stale = [];

mkdirSync(dir, { recursive: true });
for (const t of EMAIL_TEMPLATES) {
  const path = dir + t.file;
  if (check) {
    let current = "";
    try {
      current = readFileSync(path, "utf8");
    } catch {}
    if (current !== t.html) stale.push(t.file);
  } else {
    writeFileSync(path, t.html);
    console.log(`Wrote supabase/templates/${t.file}`);
  }
}

if (check) {
  if (stale.length) {
    console.error(`Out of date: ${stale.join(", ")}. Run \`npm run emails\` and commit the result.`);
    process.exit(1);
  }
  console.log("supabase/templates is up to date.");
}
