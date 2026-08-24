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

for (const [name, source] of [
  ["registration", registrationSource],
  ["assessment", assessmentSource],
] as const) {
  test(`${name} uses the expected form shell`, () => {
    assert.match(
      source,
      /<FormPage className="risk-form-filter-controls max-w-none/,
    );
    if (name === "registration") {
      assert.match(source, /<CollectionPageHeader/);
      assert.match(source, /backAction=/);
      assert.match(source, /actionsPlacement="title"/);
      assert.doesNotMatch(source, /<FormHeader/);
      assert.match(source, /Simpan draft/);
      assert.match(source, /Finalisasi risiko/);
      assert.match(
        source,
        /smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300\/30/,
      );
    } else {
      assert.match(source, /<FormHeader/);
    }
  });

  if (name === "registration") {
    test(`${name} uses the risk register section geometry`, () => {
      assert.match(
        source,
        /not-last:border-b-0 bg-card smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300\/30/,
      );
      assert.doesNotMatch(
        source,
        /RISK_FORM_SURFACE_CLASS\s*=\s*"[^"]*\sborder(?:\s|-[^\s"]*)/,
      );
      assert.match(source, /px-5 py-4/);
      assert.match(source, /space-y-5 px-5 pb-6 pt-2/);
    });
  }
}

test("registration behavior entry points remain intact", () => {
  assert.match(registrationSource, /handleSaveDraft/);
  assert.match(registrationSource, /openSubmitReviewConfirm/);
  assert.match(registrationSource, /<CollectionPageHeader/);
  assert.match(registrationSource, /xl:sticky xl:top-24/);
  assert.match(registrationSource, /scrollToSection\(/);
  assert.doesNotMatch(
    registrationSource,
    /onClick=\{\(\) => scrollToSection\(section\.id\)\}/,
  );
  assert.match(
    registrationSource,
    /not-last:border-b-0 bg-card smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300\/30/,
  );
});

test("assessment behavior entry points remain intact", () => {
  assert.match(assessmentSource, /handleSaveDraft/);
  assert.match(assessmentSource, /openSubmitReviewConfirm/);
  assert.match(assessmentSource, /router\.push\(backTarget\)/);
});
