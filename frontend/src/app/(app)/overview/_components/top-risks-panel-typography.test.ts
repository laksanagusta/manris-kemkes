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
    /className="block truncate font-mono text-sm font-normal text-foreground"/,
  );
  assert.match(
    source,
    /className="hidden min-w-0 truncate text-sm font-normal text-muted-foreground sm:block"/,
  );
  assert.match(source, /text-sm font-normal text-muted-foreground sm:block/);
  assert.match(
    source,
    /font-mono text-sm font-normal text-foreground tabular-nums/,
  );
  assert.doesNotMatch(
    source,
    /group\/risk[\s\S]*?font-(medium|semibold|bold)/,
  );
});

test("renders the compact attention list as a checkbox-free probability ledger", () => {
  for (const componentSource of [source, catalogueSource]) {
    assert.match(componentSource, />Kode<\/span>/);
    assert.match(componentSource, />Probabilitas<\/span>/);
    assert.match(componentSource, />Dampak<\/span>/);
    assert.match(componentSource, />Kategori<\/span>/);
    assert.match(componentSource, />Skor<\/span>/);
    assert.doesNotMatch(componentSource, />Judul<\/span>/);
    assert.match(componentSource, /bg-(?:card|table-header)/);
    assert.match(
      componentSource,
      /px-6 py-1\.5 text-\[13px\] font-medium capitalize/,
    );
    assert.match(componentSource, /grid-cols-\[1fr_1fr_1fr_1fr\]/);
    assert.match(componentSource, /sm:grid-cols-\[5fr_7fr_7fr_10fr_5fr\]/);
    assert.doesNotMatch(componentSource, /justify-start/);
    assert.match(componentSource, /min-h-14/);
    assert.match(componentSource, /capitalize/);
    assert.doesNotMatch(componentSource, /Unit kerja/);
    assert.doesNotMatch(componentSource, /Checkbox|type="checkbox"/);
    assert.doesNotMatch(componentSource, /ChevronRight|translate-x/);
  }
});

test("reserves five fixed-height desktop slots without stretching risk rows", () => {
  for (const componentSource of [source, catalogueSource]) {
    assert.match(componentSource, /xl:min-h-\[377px\]/);
    assert.match(componentSource, /const visibleRisks = risks\.slice\(0, 5\)/);
    assert.match(componentSource, /Array\.from\(\{ length: 5 - visibleRisks\.length \}/);
    assert.match(componentSource, /aria-hidden="true" className="hidden h-14 xl:block"/);
    assert.doesNotMatch(componentSource, /xl:flex-1 motion-reduce:transform-none/);
  }
});
