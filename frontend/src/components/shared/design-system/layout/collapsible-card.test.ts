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
