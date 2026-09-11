import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const badge = readFileSync(new URL("./badge.tsx", import.meta.url), "utf8");

test("shared badges use the shadcn base geometry and dense sizes", () => {
  assert.match(badge, /rounded-4xl border border-transparent px-2 py-0\.5 text-xs font-medium/);
  assert.match(badge, /compact: "h-6 rounded-4xl px-2 text-xs"/);
  assert.match(badge, /micro: "h-5 rounded-4xl px-1\.5 text-\[11px\]"/);
});

test("badge tones use the fixed light color pairs", () => {
  assert.match(badge, /neutral: "bg-zinc-50 text-secondary-foreground"/);
  assert.match(badge, /progress: "bg-blue-50 text-blue-700"/);
  assert.match(badge, /success: "bg-green-50 text-green-700"/);
  assert.match(badge, /warning: "bg-amber-50 text-amber-700"/);
  assert.match(badge, /danger: "bg-red-50 text-red-700"/);
  assert.match(badge, /info: "bg-sky-50 text-sky-700"/);
  assert.doesNotMatch(badge, /\bdark\b/);
});
