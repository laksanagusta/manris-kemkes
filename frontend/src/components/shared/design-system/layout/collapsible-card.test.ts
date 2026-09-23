import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const componentSource = read("./collapsible-card.tsx");
const designSystemBarrel = read("../index.ts");
const workingPaperProgressSource = read(
  "../../../../app/(app)/risk/working-papers/_components/working-paper-progress-collapsible.tsx",
);
const overviewSource = read(
  "../../../../app/(app)/compliance/_components/monitoring-read-only-workspace.tsx",
);
const assessmentSource = read(
  "../../../../app/(app)/risk/assessment/[id]/page.tsx",
);

test("CollapsibleCard exposes an explicit compound component API", () => {
  for (const part of [
    "Root",
    "Trigger",
    "Header",
    "Icon",
    "Text",
    "Title",
    "Description",
    "Actions",
    "Content",
    "Body",
  ]) {
    assert.match(componentSource, new RegExp(`${part}: CollapsibleCard`));
  }

  assert.match(
    designSystemBarrel,
    /export \{ CollapsibleCard \} from "\.\/layout\/collapsible-card"/,
  );
  assert.doesNotMatch(componentSource, /renderHeader|renderActions|renderContent/);
});

test("collection disclosures and monitoring form consume the same collapsible composition", () => {
  for (const source of [workingPaperProgressSource, overviewSource, assessmentSource]) {
    assert.match(source, /CollapsibleCard\.Root/);
    assert.match(source, /CollapsibleCard\.Trigger/);
    assert.match(source, /CollapsibleCard\.Content/);
    assert.doesNotMatch(source, /@\/components\/ui\/collapsible/);
  }
});

test("collapsible card chevron uses the outline button perimeter", () => {
  assert.match(
    componentSource,
    /size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-\[0_1px_1px_rgba\(0,0,0,0\.04\)\]/,
  );
  assert.match(componentSource, /className="size-5 transition-transform/);
  assert.doesNotMatch(componentSource, /rounded-full bg-muted text-muted-foreground/);
});

test("working paper progress exposes a row-level download action", () => {
  assert.match(workingPaperProgressSource, /onExport: \(workingPaper: WorkingPaper\) => void/);
  assert.match(workingPaperProgressSource, /<CollectionTableHead className="px-3 text-right">\s*Aksi/);
  assert.match(workingPaperProgressSource, /variant="outline"\s*\n\s*size="icon-xs"/);
  assert.match(workingPaperProgressSource, /Download kertas kerja/);
  assert.match(workingPaperProgressSource, /<Download className="size-3\.5" aria-hidden="true" \/>/);
  assert.match(workingPaperProgressSource, /onClick=\{\(\) => \{\s*if \(workingPaper\) onExport\(workingPaper\);/);
});
