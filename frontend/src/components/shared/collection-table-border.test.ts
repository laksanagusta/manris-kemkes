import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const collectionTableCard = readFileSync(
  new URL(
    "./design-system/collections/collection-table-card.tsx",
    import.meta.url,
  ),
  "utf8",
);
const cardPatternsExample = readFileSync(
  new URL("./design-system/examples/card-patterns-example.tsx", import.meta.url),
  "utf8",
);

test("collection table uses the accordion single-border shell", () => {
  assert.match(
    collectionTableCard,
    /rounded-2xl border border-zinc-200\/80 bg-card p-0 shadow-none ring-0/,
  );
});

test("design-system table card documents the same single-border shell", () => {
  assert.match(
    cardPatternsExample,
    /rounded-2xl border border-zinc-200\/80 bg-card p-0 shadow-none ring-0/,
  );
});
