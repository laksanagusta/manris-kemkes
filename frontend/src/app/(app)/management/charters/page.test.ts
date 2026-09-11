import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

test("charter collection follows the shared design-system grammar", () => {
  assert.match(source, /<PageStack>/);
  assert.match(source, /<CollectionToolbar/);
  assert.match(source, /<CollectionSearchField/);
  assert.match(source, /<CollectionTableCard>/);
  assert.match(source, /<CollectionTableHeader density="compact">/);
  assert.match(source, /<CollectionStatusBadge/);
  assert.match(source, /h-10 border-0 hover:bg-transparent hover:\[&>td\]:bg-muted\/50/);
  assert.match(source, /sticky right-0 bg-card px-3 py-2/);
  assert.match(source, /sticky right-0 z-10/);
  assert.match(source, /<CollectionLoadingState/);
  assert.match(source, /<CollectionErrorState/);
  assert.match(source, /<CollectionEmptyState/);
  assert.doesNotMatch(source, /getCharterStatusBadgeClass/);
});
