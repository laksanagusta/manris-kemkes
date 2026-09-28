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
const collectionTableHead = readFileSync(
  new URL(
    "./design-system/collections/collection-table-head.tsx",
    import.meta.url,
  ),
  "utf8",
);
const cardPatternsExample = readFileSync(
  new URL("./design-system/examples/card-patterns-example.tsx", import.meta.url),
  "utf8",
);

test("collection table uses the shared default border-shadow shell", () => {
  assert.match(
    collectionTableCard,
    /rounded-\[12px\] bg-card p-0/,
  );
});

test("shared table primitive uses the reference ledger geometry", () => {
  assert.match(tablePrimitive, /bg-table-header/);
  assert.match(
    tablePrimitive,
    /h-11[\s\S]*!px-5[\s\S]*!py-3[\s\S]*text-\[13px\][\s\S]*capitalize[\s\S]*text-secondary-foreground/,
  );
  assert.doesNotMatch(tablePrimitive, /tracking-\[0\.05em\]/);
  assert.match(tablePrimitive, /\[&_th\]:font-medium/);
  assert.match(tablePrimitive, /\[&_td\]:font-normal/);
  assert.match(tablePrimitive, /\[&_th_\*\]:font-medium/);
  assert.doesNotMatch(tablePrimitive, /\[&_td_\*\]:font-normal/);
  assert.match(tablePrimitive, /\[&_th\]:text-\[13px\]/);
  assert.match(tablePrimitive, /\[&_th_\*\]:text-\[13px\]/);
  assert.match(collectionTableHead, /text-\[13px\] font-medium/);
  assert.match(collectionTableHead, /capitalize/);
  assert.doesNotMatch(collectionTableHead, /tracking-/);
  assert.doesNotMatch(collectionTableHead, /text-\[11px\]/);
  assert.match(tablePrimitive, /text-muted-foreground/);
  assert.match(tablePrimitive, /\[&_th\]:text-secondary-foreground/);
  assert.match(tablePrimitive, /\[&_td\]:text-muted-foreground/);
  assert.match(collectionTableHead, /text-secondary-foreground/);
  assert.match(tablePrimitive, /!px-5 !py-3/);
  assert.match(tablePrimitive, /\[&_tr\]:border-border\/50/);
  assert.match(tablePrimitive, /border-border\/50/);
  assert.match(tablePrimitive, /h-\[68px\][\s\S]*border-0/);
  assert.match(tablePrimitive, /hover:\[&>td\]:bg-muted\/30/);
});

test("table body keeps an internal divider and omits the trailing divider", () => {
  assert.match(tablePrimitive, /\[&_tr\]:border-t-0/);
  assert.match(tablePrimitive, /\[&_tr:not\(:last-child\)>td\]:border-b/);
  assert.match(tablePrimitive, /\[&_tr:last-child>td\]:border-b-0/);
});

test("design-system table card documents the same shared elevation shell", () => {
  assert.match(
    cardPatternsExample,
    /Card table menggunakan shadow-custom yang sama agar boundary dan lift tetap satu lapisan\./,
  );
});
