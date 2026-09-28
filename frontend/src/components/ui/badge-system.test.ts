import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const badge = readFileSync(new URL("./badge.tsx", import.meta.url), "utf8");
const badgeVariant = readFileSync(
  new URL("../../lib/badge-variant.ts", import.meta.url),
  "utf8",
);

test("shared badges use the stock shadcn base geometry", () => {
  assert.match(badge, /rounded-4xl border border-transparent px-2 py-0\.5 text-xs font-medium/);
  assert.doesNotMatch(badge, /tone:/);
  assert.doesNotMatch(badge, /size:/);
});

test("status badge colors use borderless Tailwind class pairs", () => {
  assert.match(badgeVariant, /border-transparent bg-blue-50 text-blue-700/);
  assert.match(badgeVariant, /border-transparent bg-green-50 text-green-700/);
  assert.match(badgeVariant, /border-transparent bg-red-50 text-red-700/);
});
