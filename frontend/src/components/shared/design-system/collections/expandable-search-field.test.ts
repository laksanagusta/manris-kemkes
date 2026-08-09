import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./expandable-search-field.tsx", import.meta.url),
  "utf8",
);

test("expandable search preserves controlled and keyboard behavior", () => {
  assert.match(source, /onChange\(event\.target\.value\)/);
  assert.match(source, /if \(!value\) setOpen\(false\)/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /autoFocus/);
  assert.match(source, /aria-label=\{ariaLabel\}/);
});
