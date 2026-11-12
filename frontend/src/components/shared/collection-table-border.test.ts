import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const collectionStyles = readFileSync(
  new URL("./design-system/collections/collection-table-card.module.css", import.meta.url),
  "utf8",
);
const catalog = readFileSync(new URL("../../app/(app)/design-system/page.tsx", import.meta.url), "utf8");

test("shared tables use the Wonder header and body geometry", () => {
  assert.match(styles, /\[data-slot="table"\] \{[^}]*font-size: var\(--text-sm\);/);
  assert.match(styles, /--table-header: #fbfbfb;/);
  assert.match(styles, /\[data-slot="table-head"\] \{[^}]*height: 2\.75rem;/);
  assert.doesNotMatch(styles, /\[data-slot="table-head"\] \{[^}]*text-transform:/);
  assert.match(styles, /\[data-slot="table-body"\] > \[data-slot="table-row"\] \{[^}]*height: 2\.75rem;/);
  assert.match(styles, /\[data-slot="table-container"\]\[data-framed\] \{[^}]*box-shadow: var\(--table-frame-shadow\);/);
  assert.match(styles, /\[data-slot="card"\]\[data-collection-table\] \{[^}]*box-shadow: var\(--table-frame-shadow\);/);
  assert.match(catalog, /<TableExample \/>/);
});

test("dividers are painted on cells so they continue beneath sticky actions", () => {
  assert.match(styles, /\[data-slot="table-head"\] \{[^}]*border-block-end: 1px solid var\(--table-divider\);/);
  assert.match(styles, /\[data-slot="table-row"\]:not\(:last-child\) > \[data-slot="table-cell"\] \{[^}]*border-block-end: 1px solid var\(--table-divider\);/);
  assert.match(collectionStyles, /position: sticky;/);
  assert.doesNotMatch(collectionStyles, /border-block-end|opacity: 0/);
});
