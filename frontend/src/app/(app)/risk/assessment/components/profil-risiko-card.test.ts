import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./profil-risiko-card.tsx", import.meta.url),
  "utf8",
);

test("risk profile card no longer owns the monitoring floating variant", () => {
  assert.doesNotMatch(source, /floating\??:/);
  assert.doesNotMatch(source, /monitoring-baseline-floating/);
  assert.doesNotMatch(source, /fixed inset-x-0 bottom-/);
});
