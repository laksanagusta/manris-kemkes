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

test("uses normal typography throughout each top-risk row", () => {
  assert.match(
    source,
    /<div className="min-w-0 font-normal">[\s\S]*?<span[\s\S]*?className="block truncate font-mono text-sm font-normal/,
  );
  assert.match(source, /className=\{cn\([\s\S]*?"[^"]*font-normal[^"]*",/);
  assert.match(
    source,
    /className="min-w-0 truncate text-sm font-normal text-foreground"/,
  );
  assert.match(source, /text-sm font-normal text-muted-foreground sm:block/);
  assert.match(source, /text-sm font-normal text-muted-foreground sm:hidden/);
  assert.doesNotMatch(source, /className="[^"]*font-(medium|semibold|bold)[^"]*"/);
});

test("renders the compact attention list as a checkbox-free category ledger", () => {
  for (const componentSource of [source, catalogueSource]) {
    assert.match(componentSource, />Kode<\/span>/);
    assert.match(componentSource, />Judul<\/span>/);
    assert.match(componentSource, />Kategori<\/span>/);
    assert.match(componentSource, />Skor<\/span>/);
    assert.match(componentSource, /bg-table-header/);
    assert.match(componentSource, /text-xs font-normal capitalize/);
    assert.match(componentSource, /grid-cols-\[1fr_8fr_1fr\]/);
    assert.match(componentSource, /sm:grid-cols-\[5fr_32fr_8fr_5fr\]/);
    assert.doesNotMatch(componentSource, /justify-start/);
    assert.match(componentSource, /min-h-14/);
    assert.match(componentSource, /capitalize/);
    assert.doesNotMatch(componentSource, /Unit kerja/);
    assert.doesNotMatch(componentSource, /Checkbox|type="checkbox"/);
    assert.doesNotMatch(componentSource, /ChevronRight|translate-x/);
  }
});
