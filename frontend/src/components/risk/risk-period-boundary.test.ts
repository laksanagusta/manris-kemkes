import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const riskPage = read("../../app/(app)/risk/register/new/page.tsx");
const guidance = read("../shared/design-system/domain/risk-creation-guidance.tsx");
const analysis = read("./risk-analysis-tab.tsx");
const history = read("../shared/design-system/domain/risk-version-history-list.tsx");

test("risk detail does not expose a quarterly profile period or block finalization on a quarter change", () => {
  assert.doesNotMatch(riskPage, /Periode profil|Triwulan telah berganti|setMonitoringNow/);
  assert.doesNotMatch(guidance, /Periode berlaku|Triwulan|riskPeriodLabel/);
  assert.doesNotMatch(analysis, /assessmentCycle|>\s*Periode\s*</);
  assert.doesNotMatch(history, /version\.assessmentCycle/);
});

test("monitoring still selects its period from the profile rules", () => {
  assert.match(riskPage, /<ProfilePeriodPicker/);
  assert.match(riskPage, /handleMonitoringSelectionChange/);
  assert.match(riskPage, /assessmentCycle: status === "final"/);
});
