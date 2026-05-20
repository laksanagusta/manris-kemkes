import assert from "node:assert/strict";
import test from "node:test";

const payloadModule = await import(new URL("./risk-register-payload.ts", import.meta.url).href);

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
