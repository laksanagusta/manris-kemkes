import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRiskSource } from "./risk-source.ts";

const payloadModule = await import(new URL("./risk-register-payload.ts", import.meta.url).href);

test("editing a legacy risk preserves its combined or external source", () => {
  for (const source of [" External & Internal ", "internal & external", "Eksternal & Internal", "Internal & Eksternal"]) {
    assert.equal(normalizeRiskSource(source), "internal_eksternal");
  }
  assert.equal(normalizeRiskSource(" External "), "eksternal");
});

test("buildRiskRegisterPayload carries roId and omits objectiveId", () => {
  const { buildRiskRegisterPayload } = payloadModule as {
    buildRiskRegisterPayload: (
      data: {
        title: string;
        description: string;
        category?: string;
        organizationId: string;
        roId?: string;
        causes?: Array<{ text: string }>;
        impacts?: Array<{ text: string }>;
        mitigations?: Array<{ action: string; owner: string }>;
        riskSource: string;
        controllability: string;
        existingControl: string;
        controlEffectiveness: string;
        probability: number;
        impact: number;
        weight: number;
        riskPriority: number;
        riskAppetite: string;
        treatmentOption?: string;
        nextReviewDate?: string;
        targetProbability: number;
        targetImpact: number;
        targetWeight: number;
      },
      status: string,
      context: {
        assessmentCycle: string;
        organizationId?: string | null;
        userRole?: string;
        reviewerId?: string;
        reviewerName?: string;
        approvalLine?: Array<{ id: string; name: string; role?: string }>;
      },
    ) => Record<string, unknown>;
  };

  const payload = buildRiskRegisterPayload(
    {
      title: "Risiko keterlambatan",
      description: "Deskripsi risiko",
      category: "operasional",
      organizationId: "org-1",
      roId: "ro-1",
      causes: [{ text: "A" }],
      impacts: [{ text: "B" }],
      mitigations: [{ action: "Mitigasi", owner: "Owner" }],
      riskSource: "internal",
      controllability: "C",
      existingControl: "",
      controlEffectiveness: "",
      probability: 3,
      impact: 4,
      weight: 1,
      riskPriority: 12,
      riskAppetite: "dalam_batas",
      targetProbability: 1,
      targetImpact: 1,
      targetWeight: 1,
    },
    "assessment_draft",
    {
      assessmentCycle: "2027-H1",
      organizationId: "org-1",
      reviewerId: "user-1",
      reviewerName: "Reviewer",
      approvalLine: [{ id: "user-2", name: "Approver", role: "approval" }],
    },
  );

  assert.equal(payload.roId, "ro-1");
  assert.ok(!("objectiveId" in payload));
  assert.equal(payload.assessmentCycle, "2027-H1");
});

test("profile edits preserve mitigation identity, cost and execution schedule", () => {
 const plan = { id: "plan-1", action: "Periksa stok", owner: "Unit", frequency: "rutin", recurringInterval: "bulanan", reportDay: null, reportDate: 25, executionScheduleText: "Setiap akhir bulan", targetCost: 150000 };
 const payload = payloadModule.buildRiskRegisterPayload({ title: "Revisi risiko", description: "Koreksi pengendalian distribusi", probability: 3, impact: 3, weight: 1, riskPriority: 1, targetProbability: 1, targetImpact: 1, targetWeight: 1, mitigations: [plan] }, "draft", { assessmentCycle: "2026-Q4" });
 assert.equal(payload.mitigations[0].id, plan.id);
 assert.equal(payload.mitigations[0].executionScheduleText, plan.executionScheduleText);
 assert.equal(payload.mitigations[0].frequency, plan.frequency);
 assert.equal(payload.mitigations[0].reportDay, plan.reportDay);
 assert.equal(payload.mitigations[0].recurringInterval, "bulanan");
 assert.equal(payload.mitigations[0].reportDate, 25);
 assert.equal(payload.mitigations[0].targetCost, plan.targetCost);
});

test("the form payload saves the owner and combined source and can clear the owner", () => {
  const risk = {
    title: "Risiko distribusi",
    description: "Pasokan terlambat",
    organizationId: "unit-1",
    riskSource: "internal_eksternal",
    probability: 3,
    impact: 3,
    weight: 1,
    riskPriority: 1,
    targetProbability: 1,
    targetImpact: 1,
    targetWeight: 1,
  };
  const context = { assessmentCycle: "2026-Q4" };
  const selected = payloadModule.buildRiskRegisterPayload({ ...risk, riskOwnerId: "user-1" }, "draft", context);
  const cleared = payloadModule.buildRiskRegisterPayload({ ...risk, riskOwnerId: "" }, "draft", context);
  assert.equal(selected.organizationId, "unit-1");
  assert.equal(selected.riskOwnerId, "user-1");
  assert.equal(selected.riskSource, "internal_eksternal");
  assert.equal(cleared.riskOwnerId, "");
});
