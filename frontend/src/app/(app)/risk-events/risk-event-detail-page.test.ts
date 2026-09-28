import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./[id]/page.tsx", import.meta.url), "utf8");

test("risk event linked-risk rows use an inset surface without a border", () => {
  assert.match(
    source,
    /className="rounded-lg bg-card-subtle-surface px-3 py-2"/,
  );
  assert.doesNotMatch(source, /rounded-lg border border-border\/70 bg-card-subtle-surface/);
});

test("risk event linked-risk label is medium and titles use 12px text", () => {
  assert.match(source, /<p className="text-xs font-medium text-muted-foreground">Risiko terkait<\/p>/);
  assert.match(source, /<p className="mt-1 text-xs text-secondary-foreground">\{risk\.title\}<\/p>/);
});
