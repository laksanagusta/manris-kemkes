import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const componentSource = readFileSync(
  new URL("./field-error-message.tsx", import.meta.url),
  "utf8",
);
const globalStyles = readFileSync(
  new URL("../../../../app/globals.css", import.meta.url),
  "utf8",
);
const riskRegisterForm = readFileSync(
  new URL("../../../../app/(app)/risk/register/new/page.tsx", import.meta.url),
  "utf8",
);
const monitoringForm = readFileSync(
  new URL("../../../../app/(app)/risk/assessment/[id]/page.tsx", import.meta.url),
  "utf8",
);
const mitigationForm = readFileSync(
  new URL("../domain/mitigation-progress-form.tsx", import.meta.url),
  "utf8",
);

test("field errors use the shared accessible message primitive", () => {
  assert.match(componentSource, /data-slot="field-error-message"/);
  assert.match(componentSource, /role = "alert"/);
  assert.match(componentSource, /text-xs font-medium leading-5 text-destructive/);
});

test("field errors reveal with a reduced-motion-safe layout animation", () => {
  assert.match(globalStyles, /\.field-error-message \{[\s\S]*grid-template-rows: 1fr/);
  assert.match(
    globalStyles,
    /\.field-error-message__content \{[\s\S]*opacity: 1[\s\S]*transition: opacity 160ms var\(--ease-out\)[\s\S]*transition-delay: 20ms/,
  );
  assert.match(
    globalStyles,
    /@starting-style \{[\s\S]*\.field-error-message \{[\s\S]*grid-template-rows: 0fr[\s\S]*translateY\(-4px\)/,
  );
  assert.match(
    globalStyles,
    /@starting-style \{[\s\S]*\.field-error-message__content \{[\s\S]*opacity: 0/,
  );
  assert.match(
    globalStyles,
    /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.field-error-message \{[\s\S]*transition: opacity 120ms/,
  );
  assert.match(
    globalStyles,
    /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.field-error-message__content \{[\s\S]*transition: opacity 120ms[\s\S]*transition-delay: 0ms/,
  );
  const contentBlocks = [...globalStyles.matchAll(/\.field-error-message__content \{[^}]*\}/g)].map(
    ([block]) => block,
  );
  assert.ok(contentBlocks.every((block) => !block.includes("transform")));
});

test("risk and mitigation forms consume the shared animated field error", () => {
  assert.match(riskRegisterForm, /<FieldErrorMessage/);
  assert.equal((monitoringForm.match(/<FieldErrorMessage/g) ?? []).length, 3);
  assert.equal((mitigationForm.match(/<FieldErrorMessage/g) ?? []).length, 3);
});
