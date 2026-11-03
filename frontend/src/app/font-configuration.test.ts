import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

test("uses Geist as the only application font", () => {
  assert.match(
    source,
    /import \{ Geist \} from "next\/font\/google"/,
  );
  assert.match(source, /variable: "--font-geist-sans"/);
  assert.match(source, /className=\{cn\("font-sans", geist\.variable\)\}/);
  assert.doesNotMatch(source, /Inter/);
  assert.match(stylesheet, /--font-sans: var\(--font-geist-sans\)/);
  assert.match(stylesheet, /--font-heading: var\(--font-geist-sans\)/);
  assert.match(stylesheet, /--font-display: var\(--font-geist-sans\)/);
  assert.match(stylesheet, /--font-logo: var\(--font-geist-sans\)/);
});
