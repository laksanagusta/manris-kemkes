import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./select.tsx", import.meta.url), "utf8");

test("select content stays above drawer overlays", () => {
  assert.match(source, /<SelectPrimitive\.Content[\s\S]*?z-\[80\]/);
});
