import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const domainFiles = [
  "./shared/design-system/domain/mitigation-progress-dialog.tsx",
  "./shared/design-system/domain/mitigation-progress-form.tsx",
  "./shared/design-system/domain/risk-assessment-summary-strip.tsx",
  "./shared/design-system/domain/overview-top-risks-card.tsx",
];

test("domain components do not own API or permission behavior", () => {
  for (const path of domainFiles) {
    const source = read(path);
    assert.doesNotMatch(source, /fetch\(|apiClient|useAuth|permission|useRouter/);
  }
});

test("production component names do not use Preview suffixes", () => {
  const barrel = read("./shared/design-system/index.ts");
  assert.doesNotMatch(barrel, /Preview/);
});
