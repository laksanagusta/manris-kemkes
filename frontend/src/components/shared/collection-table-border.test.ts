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

test("collection table uses the shared default border-shadow shell", () => {
  assert.match(
    collectionTableCard,
    /rounded-xl bg-card p-0/,
  );
});

test("shared table primitive uses the reference ledger geometry", () => {
  assert.match(tablePrimitive, /bg-table-header/);
  assert.match(
    tablePrimitive,
    /h-\[40\.5px\][\s\S]*px-6[\s\S]*uppercase[\s\S]*tracking-\[0\.05em\]/,
  );
  assert.match(tablePrimitive, /\[&_th\]:font-normal/);
  assert.match(tablePrimitive, /\[&_td\]:font-normal/);
  assert.match(tablePrimitive, /\[&_th_\*\]:font-normal/);
  assert.match(tablePrimitive, /\[&_td_\*\]:font-normal/);
  assert.match(tablePrimitive, /text-muted-foreground/);
  assert.match(tablePrimitive, /\[&_th\]:text-muted-foreground/);
  assert.match(tablePrimitive, /\[&_td\]:text-muted-foreground/);
  assert.match(tablePrimitive, /\[&_tr\]:border-border\/60/);
  assert.match(tablePrimitive, /border-t border-border\/60/);
  assert.match(tablePrimitive, /h-\[72px\][\s\S]*border-t/);
});

test("table header removes the body row top divider", () => {
  assert.match(tablePrimitive, /\[&_tr\]:border-t-0/);
});

test("design-system table card documents the same shared elevation shell", () => {
  assert.match(
    cardPatternsExample,
    /Card table menggunakan shadow-custom yang sama agar boundary dan lift tetap satu lapisan\./,
  );
});
