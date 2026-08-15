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
const tablePrimitive = readFileSync(
  new URL("../ui/table.tsx", import.meta.url),
  "utf8",
);
const cardPatternsExample = readFileSync(
  new URL("./design-system/examples/card-patterns-example.tsx", import.meta.url),
  "utf8",
);

test("collection table uses the shared smooth elevation shell", () => {
  assert.match(
    collectionTableCard,
    /rounded-2xl bg-card p-0/,
  );
});

test("shared table primitive uses the reference ledger geometry", () => {
  assert.match(tablePrimitive, /bg-table-header/);
  assert.match(
    tablePrimitive,
    /h-\[40\.5px\][\s\S]*px-6[\s\S]*uppercase[\s\S]*tracking-\[0\.05em\]/,
  );
  assert.match(tablePrimitive, /h-\[72px\][\s\S]*border-t/);
});

test("table header removes the body row top divider", () => {
  assert.match(tablePrimitive, /\[&_tr\]:border-t-0/);
});

test("design-system table card documents the same smooth elevation shell", () => {
  assert.match(
    cardPatternsExample,
    /Card table menggunakan elevation yang sama agar boundary dan shadow tetap satu lapisan\./,
  );
});
