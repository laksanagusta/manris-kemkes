import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const badge = readFileSync(new URL("./badge.tsx", import.meta.url), "utf8");

test("shared badges are borderless with readable default and dense sizes", () => {
  assert.match(badge, /rounded-full border-0 px-3 py-0 text-sm font-semibold/);
  assert.match(badge, /compact: "h-6 rounded-sm px-2 text-xs"/);
  assert.match(badge, /micro: "h-5 rounded-sm px-1\.5 text-\[11px\]"/);
});

test("badge tones use the approved pastel chip palette", () => {
  assert.match(badge, /neutral: "border-0 bg-\[#eeeeed\] text-\[#211d1c\]"/);
  assert.match(badge, /progress: "border-0 bg-\[#c6f2fb\] text-\[#29449a\]"/);
  assert.match(badge, /success: "border-0 bg-\[#c9f3df\] text-\[#006331\]"/);
  assert.match(badge, /warning: "border-0 bg-\[#fbedb9\] text-\[#9b2f00\]"/);
  assert.match(badge, /danger: "border-0 bg-\[#fbdedc\] text-\[#ad001b\]"/);
  assert.match(badge, /info: "border-0 bg-\[#c6f2fb\] text-\[#29449a\]"/);
});
