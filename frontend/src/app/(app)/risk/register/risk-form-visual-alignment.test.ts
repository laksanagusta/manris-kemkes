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
      assert.doesNotMatch(source, /<FormHeader/);
      assert.doesNotMatch(source, /Form registrasi risiko/);
      assert.doesNotMatch(source, /Lengkapi identifikasi, analisis, dan rencana penanganan/);
      assert.match(source, /setHeaderActions\(/);
      assert.match(source, /Simpan draft/);
      assert.match(source, /Finalisasi risiko/);
      assert.match(source, /borderColor: "rgba\(10, 10, 10, 0\.16\)"/);
      assert.match(source, /"--primary": "#00b9ad"/);
    } else {
      assert.match(source, /<FormHeader/);
    }
  });

  if (name === "registration") {
    test(`${name} uses the risk register section geometry`, () => {
      assert.match(
        source,
        /rounded-xl border border-zinc-200\/80 bg-card shadow-none/,
      );
      assert.match(source, /px-5 py-4/);
      assert.match(source, /space-y-5 px-5 pb-6 pt-2/);
    });
  }
}

test("registration behavior entry points remain intact", () => {
  assert.match(registrationSource, /handleSaveDraft/);
  assert.match(registrationSource, /openSubmitReviewConfirm/);
  assert.match(registrationSource, /setHeaderActions\(/);
  assert.match(
    registrationSource,
    /xl:grid-cols-\[minmax\(0,1\.85fr\)_340px\]/,
  );
  assert.match(registrationSource, /xl:sticky xl:top-24/);
  assert.match(registrationSource, /role="progressbar"/);
  assert.match(registrationSource, /aria-label=\{`Kesiapan finalisasi:/);
  assert.doesNotMatch(
    registrationSource,
    /onClick=\{\(\) => scrollToSection\(section\.id\)\}/,
  );
  assert.match(registrationSource, /ring-zinc-200\/80/);
});

test("assessment behavior entry points remain intact", () => {
  assert.match(assessmentSource, /handleSaveDraft/);
  assert.match(assessmentSource, /openSubmitReviewConfirm/);
  assert.match(assessmentSource, /router\.push\(backTarget\)/);
});
