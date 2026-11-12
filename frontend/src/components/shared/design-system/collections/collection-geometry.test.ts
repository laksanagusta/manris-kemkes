import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(name: string) {
  return readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
}

test("table toolbar uses Wonder geometry and compact picker controls keep 32px", () => {
  assert.match(source("collection-filter-input.tsx"), /h-8/);
  assert.match(source("collection-filter-trigger.tsx"), /h-8/);
  assert.match(source("collection-search-field.tsx"), /sm:w-\[340px\]/);
  assert.match(source("collection-search-field.tsx"), /h-9/);
  const filters = source("dynamic-table-filters.tsx");
  const styles = source("filtered-table-toolbar.module.css");
  assert.match(filters, /<Filter aria-hidden="true" className="size-4"/);
  assert.match(filters, /aria-label="Tambah filter"/);
  assert.match(styles, /width: min\(100%, 17\.5rem\)/);
  assert.match(styles, /\[data-size="icon"\]\) \{\s*width: 2rem;/);
  assert.match(source("expandable-search-field.tsx"), /h-8/);
});

test("collection density does not change shared form primitives", () => {
  assert.match(source("../../../ui/input.tsx"), /h-8/);
  assert.match(source("../../search-input.tsx"), /<Input type=\{type\}/);
  assert.match(source("../../../ui/select.tsx"), /data-\[size=default\]:h-8/);
});
