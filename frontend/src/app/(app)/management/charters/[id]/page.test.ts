import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const source = readSource("./page.tsx");
const designSystemBarrel = readSource(
  "../../../../../components/shared/design-system/index.ts",
);

test("risk charter create and detail share the canonical one-column form", () => {
  assert.match(source, /const isCreateMode = id === "new"/);
  assert.match(source, /<FormPage className="max-w-5xl">/);
  assert.match(source, /<FormHeader/);
  assert.doesNotMatch(source, /xl:grid-cols-/);

  const orderedSections = [
    "Identitas Piagam",
    "Ruang Lingkup",
    "Dasar Hukum",
    "Konteks Internal",
    "Konteks Eksternal",
    "Ringkasan Stakeholder",
  ];

  let previousIndex = -1;
  for (const title of orderedSections) {
    const nextIndex = source.indexOf(title);
    assert.ok(nextIndex > previousIndex, `${title} must follow the approved order`);
    previousIndex = nextIndex;
  }

  assert.match(source, /<FormSection/);
  assert.doesNotMatch(source, /<Card(?:\s|>)/);
  assert.doesNotMatch(source, /<CardContent(?:\s|>)/);
  assert.doesNotMatch(source, /<Separator(?:\s|>)/);
});

test("risk charter form consumes shared status, state, action, and field primitives", () => {
  for (const component of [
    "CollectionErrorState",
    "CollectionLoadingState",
    "CollectionStatusBadge",
    "LoadingActionButton",
    "Textarea",
    "Label",
  ]) {
    assert.match(source, new RegExp(component));
  }

  assert.match(
    designSystemBarrel,
    /export \{ Label \} from "@\/components\/ui\/label"/,
  );
  assert.doesNotMatch(
    source,
    /from "@\/components\/ui\/(?:badge|button|card|label|textarea)"/,
  );
  assert.doesNotMatch(source, /getCharterStatusBadgeClass/);
  assert.doesNotMatch(source, /Risk Governance/);
});

test("risk charter fields and persistence contract remain intact", () => {
  for (const field of [
    "scope",
    "legalBasis",
    "internalContext",
    "externalContext",
    "stakeholderSummary",
  ]) {
    assert.match(source, new RegExp(`field: "${field}"`));
    assert.match(source, /form\.register\(section\.field/);
  }

  assert.match(source, /createRiskCharter\(activeToken, payload\)/);
  assert.match(source, /updateRiskCharter\(activeToken, id, payload\)/);
  assert.match(source, /window\.addEventListener\("beforeunload"/);
  assert.match(source, /loading=\{saving\}/);
  assert.match(source, /<CollectionLoadingState/);
  assert.match(source, /<CollectionErrorState/);
});
