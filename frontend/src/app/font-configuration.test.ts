import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");

test("uses Inter, JetBrains Mono, and Poppins as the application fonts", () => {
  assert.match(
    source,
    /import \{ Inter, JetBrains_Mono, Poppins \} from "next\/font\/google"/,
  );
  assert.match(source, /variable: "--font-inter"/);
  assert.match(source, /variable: "--font-jetbrains-mono"/);
  assert.match(source, /weight: \["600"\]/);
  assert.match(source, /variable: "--font-poppins"/);
  assert.match(source, /"var\(--font-inter\), ui-sans-serif/);
  assert.match(source, /"var\(--font-jetbrains-mono\), ui-monospace/);
  assert.match(source, /"var\(--font-poppins\), ui-sans-serif/);
  assert.doesNotMatch(source, /Plus_Jakarta_Sans|Google_Sans_Flex|Geist_Mono/);
});
