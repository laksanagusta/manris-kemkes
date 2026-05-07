import assert from "node:assert/strict";
import test from "node:test";

import { resolveWorkingPaperRiskDisplay } from "./working-paper-risk-display.ts";

test("resolveWorkingPaperRiskDisplay prefers inherent score over nilai", () => {
  const resolved = resolveWorkingPaperRiskDisplay({
    id: "risk-1",
    code: "R-001",
    title: "Gangguan layanan",
    category: "operasional",
    status: "approved",
    probability: 4,
    impact: 4,
    bobot: 1,
    nilai: 12,
    inherentScore: 16,
    tingkat_risiko: "sedang",
    prioritas_risiko: 3,
  });

  assert.equal(resolved.score, 16);
  assert.equal(resolved.level, "tinggi");
  assert.equal(resolved.label, "Tinggi");
});

test("resolveWorkingPaperRiskDisplay falls back to rounded nilai when inherent score is absent", () => {
  const resolved = resolveWorkingPaperRiskDisplay({
    id: "risk-2",
    code: "R-002",
    title: "Keterlambatan proses",
    category: "operasional",
    status: "approved",
    probability: 3,
    impact: 4,
    bobot: 1,
    nilai: 9.4,
    tingkat_risiko: "rendah",
    prioritas_risiko: 4,
  });

  assert.equal(resolved.score, 9);
  assert.equal(resolved.level, "rendah");
  assert.equal(resolved.label, "Rendah");
});
