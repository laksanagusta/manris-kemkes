import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");

test("uses Inter as the only application font", () => {
  assert.match(
    source,
    /import \{ Inter \} from "next\/font\/google"/,
  );
  assert.match(source, /variable: "--font-inter"/);
  assert.match(source, /"var\(--font-inter\), ui-sans-serif/);
  assert.match(
    source,
    /"--font-logo":\s*"var\(--font-inter\), ui-sans-serif/,
  );
  assert.match(
    source,
    /"--font-mono":\s*"var\(--font-inter\), ui-sans-serif/,
  );
});
