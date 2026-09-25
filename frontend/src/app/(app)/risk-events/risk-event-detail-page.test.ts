import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./[id]/page.tsx", import.meta.url), "utf8");

test("risk event linked-risk group uses a subtle border", () => {
  assert.match(
    source,
    /className="rounded-lg border border-border\/70 bg-secondary-card-surface px-3 py-2"/,
  );
});
