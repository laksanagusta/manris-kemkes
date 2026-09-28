import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./top-risks-panel.tsx", import.meta.url),
  "utf8",
);
const catalogueSource = readFileSync(
  new URL(
    "../../../../components/shared/design-system/domain/overview-top-risks-card.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("uses the same primary-and-metadata hierarchy as collection tables", () => {
  assert.match(
    source,
    /className="min-w-0 max-w-full truncate rounded-sm text-sm font-medium leading-5 text-foreground/,
  );
  assert.match(
    source,
    /className="font-mono text-\[11px\] leading-4 text-muted-foreground"/,
  );
  assert.match(
    source,
    /className="whitespace-normal text-muted-foreground"/,
  );
  assert.match(
    source,
    /font-mono text-sm tabular-nums text-foreground/,
  );
});

test("renders the compact attention list as a checkbox-free probability ledger", () => {
  for (const componentSource of [source, catalogueSource]) {
    assert.match(componentSource, /<Table[\s\S]*table-fixed/);
    assert.match(componentSource, /<CollectionTableHead[^>]*className="px-24"[^>]*>Risiko<\/CollectionTableHead>/);
    assert.match(componentSource, />Kategori<\/CollectionTableHead>/);
    assert.match(componentSource, />Probabilitas<\/CollectionTableHead>/);
    assert.match(componentSource, />Dampak<\/CollectionTableHead>/);
    assert.match(componentSource, /Skor[\s\S]*<\/CollectionTableHead>/);
    assert.match(componentSource, /<TableBody>/);
    assert.match(componentSource, /<TableRow/);
    assert.match(componentSource, /<TableCell/);
    assert.doesNotMatch(componentSource, /Unit kerja/);
    assert.doesNotMatch(componentSource, /Checkbox|type="checkbox"/);
    assert.doesNotMatch(componentSource, /grid-cols-|px-6 py-1\.5/);
  }
});

test("limits the ledger to five rows and uses stable table columns", () => {
  for (const componentSource of [source, catalogueSource]) {
    assert.match(componentSource, /xl:min-h-\[377px\]/);
    assert.match(componentSource, /const visibleRisks = risks\.slice\(0, 5\)/);
    assert.match(componentSource, /min-w-\[680px\] table-fixed/);
    assert.match(componentSource, /<col className="w-\[40%\]"/);
    assert.doesNotMatch(componentSource, /Array\.from\(\{ length: 5 - visibleRisks\.length \}/);
  }
});

test("keeps breathing room below the CardHeader while the table reaches the edges", () => {
  for (const componentSource of [source, catalogueSource]) {
    assert.match(
      componentSource,
      /className="-mx-\(--card-spacing\) -mb-\(--card-spacing\) min-w-0/,
    );
    assert.doesNotMatch(
      componentSource,
      /className="-m-\(--card-spacing\) min-w-0/,
    );
  }
});

test("separates the table header from the CardHeader with a top border", () => {
  for (const componentSource of [source, catalogueSource]) {
    assert.match(
      componentSource,
      /CollectionTableHeaderRow(?: data-testid="risk-list-header")?[^>]*className="border-t border-border\/60"/,
    );
  }
});

test("uses the canonical table header surface for attention table headers", () => {
  for (const componentSource of [source, catalogueSource]) {
    assert.match(componentSource, /<CollectionTableHeader>/);
    assert.doesNotMatch(componentSource, /\[&_th\]:bg-card/);
  }
});
