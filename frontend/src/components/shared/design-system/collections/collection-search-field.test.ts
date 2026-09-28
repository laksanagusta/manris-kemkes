import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  new URL("./collection-search-field.tsx", import.meta.url),
  "utf8",
);

test("collection search exposes the Escape clear affordance", () => {
  assert.match(source, /<Kbd[\s\S]*>\s*Esc\s*<\/Kbd>/);
  assert.match(source, /type="text"/);
  assert.match(source, /role="searchbox"/);
  assert.match(source, /aria-keyshortcuts="Escape"/);
  assert.match(source, /peer-placeholder-shown:hidden/);
  assert.match(source, /peer-placeholder-shown:pr-3/);
  assert.match(source, /event\.key !== "Escape"/);
  assert.match(source, /dispatchEvent\(new Event\("input"/);
});
