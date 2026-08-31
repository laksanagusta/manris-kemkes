import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");

test("uses Inter and JetBrains Mono as the application fonts", () => {
  assert.match(
    source,
    /import \{ Inter, JetBrains_Mono \} from "next\/font\/google"/,
  );
  assert.match(source, /variable: "--font-inter"/);
  assert.match(source, /variable: "--font-jetbrains-mono"/);
  assert.match(source, /"var\(--font-inter\), ui-sans-serif/);
  assert.match(source, /"var\(--font-jetbrains-mono\), ui-monospace/);
  assert.doesNotMatch(source, /Plus_Jakarta_Sans|Google_Sans_Flex|Geist_Mono/);
});
