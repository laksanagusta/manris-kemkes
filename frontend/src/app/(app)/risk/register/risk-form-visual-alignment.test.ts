import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const registrationSource = readFileSync(
  new URL("./new/page.tsx", import.meta.url),
  "utf8",
);
const assessmentSource = readFileSync(
  new URL("../assessment/[id]/page.tsx", import.meta.url),
  "utf8",
);
const mitigationStatusSource = readFileSync(
  new URL(
    "../assessment/[id]/_components/mitigation-status-table.tsx",
    import.meta.url,
  ),
  "utf8",
);

for (const [name, source] of [
  ["registration", registrationSource],
  ["assessment", assessmentSource],
] as const) {
  test(`${name} uses the expected form shell`, () => {
    assert.match(
      source,
      /<FormPage[\s\S]{0,180}risk-form-filter-controls max-w-none/,
    );
    if (name === "registration") {
      assert.match(source, /<CollectionPageHeader/);
      assert.match(source, /backAction=/);
      assert.match(source, /actionsPlacement="title"/);
      assert.doesNotMatch(source, /<FormHeader/);
      assert.match(source, /Simpan draft/);
      assert.match(source, /Finalisasi risiko/);
      assert.doesNotMatch(source, /Accordion/);
      for (const sectionId of [
        "identifikasi",
        "analisis",
        "evaluasi",
        "penanganan",
        "target",
        "approval-line",
      ]) {
        assert.match(source, new RegExp(`<Card\\s+id="${sectionId}"`));
      }
    } else {
      assert.match(source, /<FormHeader/);
      assert.match(source, /<CollapsibleCard\.Root/);
      assert.match(source, /<CollapsibleCard\.Trigger/);
      assert.doesNotMatch(source, /<AccordionItem/);
    }
  });

  if (name === "registration") {
    test(`${name} uses the risk register section geometry`, () => {
      assert.match(
        source,
        /const RISK_FORM_CARD_CLASS[\s\S]{0,140}gap-0 p-0/,
      );
      assert.doesNotMatch(
        source,
        /RISK_FORM_SURFACE_CLASS/,
      );
      assert.doesNotMatch(source, /Accordion/);
      assert.match(source, /px-5 py-4/);
      assert.match(source, /space-y-5 px-5 pb-6 pt-2/);
    });
  }
}

test("registration behavior entry points remain intact", () => {
  assert.match(registrationSource, /handleSaveDraft/);
  assert.match(registrationSource, /openSubmitReviewConfirm/);
  assert.match(registrationSource, /<CollectionPageHeader/);
  assert.match(
    registrationSource,
    /<div className="mx-auto w-full max-w-\[1400px\] min-w-0">\s*<CollectionPageHeader/,
  );
  assert.match(
    registrationSource,
    /<aside className="min-w-0 self-start">\s*<div className="space-y-6 xl:sticky xl:top-20">/,
  );
  assert.doesNotMatch(registrationSource, /xl:-translate-y-6/);
  assert.match(registrationSource, /xl:grid-cols-\[minmax\(0,1fr\)_360px\] xl:items-start/);
  assert.match(registrationSource, /scrollToSection\(/);
  assert.doesNotMatch(registrationSource, /Accordion/);
  assert.doesNotMatch(
    registrationSource,
    /onClick=\{\(\) => scrollToSection\(section\.id\)\}/,
  );
});

test("assessment behavior entry points remain intact", () => {
  assert.match(assessmentSource, /handleSaveDraft/);
  assert.match(assessmentSource, /openSubmitReviewConfirm/);
  assert.match(assessmentSource, /router\.push\(backTarget\)/);
});

test("monitoring mitigation status lives in the compact right panel", () => {
  const rightPanelIndex = assessmentSource.indexOf(
    "{/* Right Column / Side Panel */}",
  );
  const mitigationStatusIndex = assessmentSource.indexOf(
    "<MitigationStatusTable",
  );

  assert.ok(rightPanelIndex >= 0);
  assert.ok(mitigationStatusIndex > rightPanelIndex);
  assert.match(assessmentSource, /Pelaksanaan Mitigasi/);
  assert.doesNotMatch(mitigationStatusSource, /<Table/);
  assert.match(mitigationStatusSource, /Total mitigasi/);
  assert.match(mitigationStatusSource, /Sudah dilaporkan/);
  assert.match(mitigationStatusSource, /Pending/);
  assert.match(mitigationStatusSource, /aria-expanded=\{isExpanded\}/);
  assert.match(mitigationStatusSource, /MitigationProgressDialog/);
  assert.match(mitigationStatusSource, /updateTaskReport/);
  assert.doesNotMatch(mitigationStatusSource, /from "next\/link"/);
  assert.doesNotMatch(mitigationStatusSource, /compliance\/monitoring/);
});
