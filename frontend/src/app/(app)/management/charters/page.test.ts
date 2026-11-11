import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

const cardSource = readFileSync(
  new URL("../../../../components/shared/design-system/domain/risk-charter-card.tsx", import.meta.url),
  "utf8",
);
const legacyCreatePage = readFileSync(new URL("./new/page.tsx", import.meta.url), "utf8");

test("charter overview uses one card per current record and opens details", () => {
  assert.match(source, /<PageStack>/);
  assert.match(source, /items\.map/);
  assert.match(source, /<RiskCharterCard\s+key=\{item.id\}\s+charter=\{item\}/);
  assert.match(cardSource, /v\$\{charter.versionNumber\}/);
  assert.match(cardSource, /\$\{statusLabel\}/);
  assert.match(cardSource, /href=\{\`\/management\/charters\/\$\{charter.id\}\`\}/);
  assert.match(source, /<CollectionLoadingState/);
  assert.match(source, /<CollectionErrorState/);
  assert.match(source, /<CollectionEmptyState/);
  assert.doesNotMatch(source, /<Table|CollectionPagination|CollectionSearchField/);
});

test("charter overview offers the create modal from the header and empty state", () => {
  assert.match(source, /const createAction = \(\s*<RiskCharterQuickCreate/);
  assert.match(source, /actions=\{items.length > 0 && canCreateOwn \? createAction : undefined\}/);
  assert.match(source, /action=\{createAction\}/);
  assert.doesNotMatch(source, /href="\/management\/charters\/new"/);
  assert.match(legacyCreatePage, /redirect\("\/management\/charters"\)/);
});
