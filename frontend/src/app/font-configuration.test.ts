import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

test("uses Inter as the only application font", () => {
  assert.match(
    source,
    /import \{ Inter \} from "next\/font\/google"/,
  );
  assert.match(source, /variable: "--font-inter"/);
  assert.match(source, /className=\{cn\("font-sans", inter\.variable\)\}/);
  assert.doesNotMatch(source, /Geist/);
  assert.match(stylesheet, /--font-sans: var\(--font-inter\)/);
  assert.match(stylesheet, /--font-heading: var\(--font-inter\)/);
  assert.match(stylesheet, /--font-display: var\(--font-inter\)/);
  assert.match(stylesheet, /--font-logo: var\(--font-inter\)/);
});
