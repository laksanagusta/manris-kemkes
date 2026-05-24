import assert from "node:assert/strict";
import test from "node:test";

const substanceLib = await import(
  new URL("./risk-assessment-substance.ts", import.meta.url).href
);

const {
  buildSubstanceDefaults,
  buildSubstancePayload,
  diffRiskSubstance,
  needsSubstanceChangeReason,
} = substanceLib;

const sourceRisk = {
  title: "Risiko lama",
  description: "Deskripsi lama",
  category: "operasional",
  cause: ["Penyebab lama"],
  riskSource: "internal",
  controllability: "C",
  impactDesc: ["Dampak lama"],
  existingControl: "Kontrol lama",
  controlEffectiveness: "tidak_efektif",
  treatmentOption: "mitigate",
  mitigations: [
    {
      action: "Aksi lama",
      owner: "PIC lama",
      dueDate: "2026-06-30",
      mitigationType: "reduce_probability",
      activityStage: "",
      expectedOutput: "",
      quantitativeTarget: "",
      supportingUnit: "",
      resourcesRequired: "",
      contingencyPlan: "",
      potentialObstacle: "",
      costBenefitNote: "",
      isBreakthroughActivity: false,
      isExistingControl: false,
    },
  ],
};

test("diffRiskSubstance ignores score-only changes", () => {
  const draft = { ...sourceRisk, probability: 4, impact: 5, nilai: 30 };
  assert.deepEqual(diffRiskSubstance(sourceRisk, draft), []);
});

test("diffRiskSubstance reports changed substance fields", () => {
  const draft = {
    ...sourceRisk,
    description: "Deskripsi baru",
    cause: ["Penyebab lama", "Penyebab baru"],
  };
  const fields = diffRiskSubstance(sourceRisk, draft).map(
    (item: { field: string }) => item.field,
  );
  assert.deepEqual(fields, ["description", "cause"]);
});

test("buildSubstanceDefaults hydrates mitigation rows", () => {
  const defaults = buildSubstanceDefaults(sourceRisk);
  assert.equal(defaults.title, sourceRisk.title);
  assert.equal(defaults.mitigations.length, 1);
  assert.equal(defaults.mitigations[0].action, "Aksi lama");
});

test("needsSubstanceChangeReason only requires reason when enabled and changed", () => {
  const defaults = buildSubstanceDefaults(sourceRisk);
  assert.equal(needsSubstanceChangeReason(sourceRisk, defaults, false), false);
  assert.equal(needsSubstanceChangeReason(sourceRisk, defaults, true), false);
  assert.equal(
    needsSubstanceChangeReason(
      sourceRisk,
      { ...defaults, existingControl: "Kontrol baru" },
      true,
    ),
    true,
  );
});

test("buildSubstancePayload merges edited substance only when enabled", () => {
  const defaults = buildSubstanceDefaults(sourceRisk);
  const disabledPayload = buildSubstancePayload(sourceRisk, {
    enabled: false,
    values: { ...defaults, description: "Deskripsi baru" },
  });
  assert.equal(disabledPayload.description, "Deskripsi lama");

  const enabledPayload = buildSubstancePayload(sourceRisk, {
    enabled: true,
    values: { ...defaults, description: "Deskripsi baru" },
  });
  assert.equal(enabledPayload.description, "Deskripsi baru");
});

test("buildSubstancePayload strips non-uuid mitigation ids", () => {
  const defaults = buildSubstanceDefaults(sourceRisk);
  const payload = buildSubstancePayload(sourceRisk, {
    enabled: true,
    values: {
      ...defaults,
      mitigations: [
        {
          ...defaults.mitigations[0],
          id: "mitigation-1",
        },
      ],
    },
  });

  assert.equal(payload.mitigations?.[0]?.id, undefined);
});
