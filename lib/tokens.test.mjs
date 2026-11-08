// Run with `npm test`. Fails when a design system colour pair drops below WCAG 2.2 AA.
import assert from "node:assert/strict";
import { test } from "node:test";

const { themes, contrastPairs, contrast, primitives, tokensCss } = await import("./tokens.ts");

for (const theme of ["dark", "light"]) {
  test(`${theme} theme colour pairs meet their contrast minimum`, () => {
    const failures = [];
    for (const { fg, bg, min, note } of contrastPairs) {
      const ratio = contrast(themes[theme][fg], themes[theme][bg]);
      assert.notEqual(ratio, null, `${fg} or ${bg} is not a parseable colour`);
      if (ratio < min) failures.push(`${note}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${min}:1`);
    }
    assert.deepEqual(failures, []);
  });
}

test("both themes define the same semantic tokens", () => {
  assert.deepEqual(Object.keys(themes.light).sort(), Object.keys(themes.dark).sort());
});

test("primitives are valid hex colours", () => {
  for (const [name, value] of Object.entries(primitives)) {
    assert.match(value, /^#[0-9a-f]{6}$/i, name);
  }
});

test("generated CSS covers every semantic token", () => {
  const css = tokensCss();
  for (const name of Object.keys(themes.dark)) {
    assert.ok(css.includes(`--pw-${name}:`), `--pw-${name} missing`);
    assert.ok(css.includes(`--color-pw-${name}: var(--pw-${name});`), `Tailwind colour for ${name} missing`);
  }
});
