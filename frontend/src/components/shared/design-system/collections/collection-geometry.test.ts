import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(name: string) {
  return readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
}

test("collection search and filter controls use the compact 32px geometry", () => {
  assert.match(source("collection-filter-input.tsx"), /h-8/);
  assert.match(source("collection-filter-trigger.tsx"), /h-8/);
  assert.match(source("collection-search-field.tsx"), /h-8/);
  assert.match(source("expandable-search-field.tsx"), /h-8/);
});

test("collection density does not change shared form primitives", () => {
  assert.match(source("../../../ui/input.tsx"), /h-10/);
  assert.match(source("../../../ui/search-input.tsx"), /h-10/);
  assert.match(source("../../../ui/select.tsx"), /data-\[size=default\]:h-10/);
});
