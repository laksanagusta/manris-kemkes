import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");

test("uses Plus Jakarta Sans and JetBrains Mono as the application fonts", () => {
  assert.match(
    source,
    /import \{ JetBrains_Mono, Plus_Jakarta_Sans \} from "next\/font\/google"/,
  );
  assert.match(source, /variable: "--font-jakarta-sans"/);
  assert.match(source, /variable: "--font-jetbrains-mono"/);
  assert.match(source, /"var\(--font-jakarta-sans\), ui-sans-serif/);
  assert.match(source, /"var\(--font-jetbrains-mono\), ui-monospace/);
  assert.doesNotMatch(source, /Google_Sans_Flex|Geist_Mono/);
});
