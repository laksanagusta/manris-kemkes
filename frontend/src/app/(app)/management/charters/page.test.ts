import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

test("charter overview uses one card per current record and opens details", () => {
  assert.match(source, /<PageStack>/);
  assert.match(source, /items\.map/);
  assert.match(source, /<Card key=\{item\.id\}>/);
  assert.match(source, /v\{item\.versionNumber\}/);
  assert.match(source, /<Badge/);
  assert.match(source, /Lanjutkan draf/);
  assert.match(source, /Buka Piagam/);
  assert.match(source, /<CollectionLoadingState/);
  assert.match(source, /<CollectionErrorState/);
  assert.match(source, /<CollectionEmptyState/);
  assert.match(source, /action=\{createAction\}/);
  assert.doesNotMatch(source, /<Table|CollectionPagination|CollectionSearchField/);
});
