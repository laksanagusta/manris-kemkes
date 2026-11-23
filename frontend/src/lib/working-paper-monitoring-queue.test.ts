import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkingPaperQueueRows } from "./working-paper-monitoring-queue.ts";
import type { WorkingPaperRiskLink, WorkingPaperRiskMonitoring } from "@/types/working-paper";

const finalMonitoring: WorkingPaperRiskMonitoring = {
  id: "observation-1",
  status: "final",
  assessmentCycle: "2026-Q2",
  observedAt: "2026-06-10",
  observedAtInferred: true,
  sourceProbability: 4,
  sourceImpact: 4,
  sourceWeight: 1,
  sourceNilai: 16,
  sourceLevel: "tinggi",
  observedProbability: 3,
  observedImpact: 4,
  observedWeight: 1,
  observedNilai: 12,
  observedLevel: "tinggi",
  mitigationCompletionPercent: 75,
  mitigationProgressSummary: "Tiga aksi selesai",
  startedAt: "2026-06-01T08:00:00Z",
  updatedAt: "2026-06-10T08:00:00Z",
};

function makeLink(monitoring?: WorkingPaperRiskMonitoring): WorkingPaperRiskLink {
  return {
    id: "link-1",
    working_paper_id: "wp-1",
    risk_id: "risk-fallback",
    source_risk_id: "risk-source",
    sort_order: 1,
    source_mode: "roster",
    created_at: "2026-06-01T00:00:00Z",
    risk: {
      id: "risk-1",
      code: "R-001",
      title: "Gangguan layanan",
      category: "operasional",
      status: "final",
      probability: 4,
      impact: 4,
      bobot: 1,
      nilai: 18,
      tingkat_risiko: "tinggi",
      prioritas_risiko: 1,
      versionNumber: 2,
      monitoring,
    },
  };
}

const paper = { id: "wp-1", status: "draft", assessment_cycle: "2026-Q2" } as const;

test("a required risk starts monitoring from its source and an unlinked legacy risk keeps the Register path", () => {
  const link = makeLink();
  const [required, legacy] = buildWorkingPaperQueueRows({
    ...paper,
    risks: [link, { ...link, id: "link-2", source_mode: "latest_approved" }],
  }, [link]);

  assert.equal(required.status, "unmonitored");
  assert.equal(required.sourceScore, 18);
  assert.equal(required.observedScore, null);
  assert.deepEqual(required.action, { label: "Mulai pemantauan", riskId: "risk-source" });
  assert.deepEqual(legacy.action, { label: "Mulai pemantauan", href: "/risk/register/risk-source" });
});

test("drafts and final results retain their dates, scores, source, and return path", () => {
  const final = { ...makeLink(finalMonitoring), monitoring_id: "persisted-final" };
  const draft = { ...makeLink({ ...finalMonitoring, status: "draft" }), id: "link-2" };
  const [finalRow, draftRow] = buildWorkingPaperQueueRows({ ...paper, risks: [final, draft] }, [draft]);

  assert.equal(finalRow.status, "final");
  assert.equal(finalRow.versionNumber, 2);
  assert.equal(finalRow.sourceScore, 16);
  assert.equal(finalRow.observedScore, 12);
  assert.equal(finalRow.observedLevelLabel, "Tinggi");
  assert.equal(finalRow.observedAt, "2026-06-10");
  assert.equal(finalRow.observedAtInferred, true);
  assert.equal(finalRow.riskHref, "/risk/register/risk-1");
  assert.equal(finalRow.sourceHref, "/risk/register/risk-source");
  assert.deepEqual(finalRow.action, { label: "Lihat hasil", href: "/risk/monitoring/persisted-final?returnTo=%2Frisk%2Fworking-papers%2Fwp-1" });
  assert.equal(draftRow.status, "draft");
  assert.deepEqual(draftRow.action, { label: "Lanjutkan draf", href: "/risk/monitoring/observation-1?returnTo=%2Frisk%2Fworking-papers%2Fwp-1" });
});

test("a legacy roster excludes observations from another cycle while a bound profile uses its attached observation", () => {
  const link = { ...makeLink(finalMonitoring), monitoring_id: "old-observation" };
  const [legacy] = buildWorkingPaperQueueRows({ ...paper, assessment_cycle: "2026-Q3", risks: [link] }, [link]);
  const [bound] = buildWorkingPaperQueueRows({ ...paper, assessment_cycle: "2026-Q3", profile_version_id: "profile-1", risks: [link] }, []);

  assert.equal(legacy.status, "unmonitored");
  assert.equal(legacy.observedScore, null);
  assert.deepEqual(legacy.action, { label: "Mulai pemantauan", riskId: "risk-source" });
  assert.equal(bound.status, "final");
});

test("an inconsistent or closed row cannot initiate monitoring from the queue", () => {
  const risk = makeLink();
  const inconsistent = { ...risk, monitoring_id: "missing-observation" };
  const [broken] = buildWorkingPaperQueueRows({ ...paper, risks: [inconsistent] }, [inconsistent]);
  const [closed] = buildWorkingPaperQueueRows({ ...paper, status: "completed", risks: [risk] }, []);

  assert.equal(broken.inconsistent, true);
  assert.equal(broken.action, undefined);
  assert.equal(closed.action, undefined);
});
