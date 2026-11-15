import assert from "node:assert/strict";
import test from "node:test";

import type { Evaluation } from "@/types/evaluation";
import {
  evaluationStatusLabel,
  filterEvaluations,
  isEvaluationEditable,
  validateEvaluationFinalization,
} from "./evaluations.mjs";

const base: Evaluation = {
  id: "eval-1",
  organizationId: "org-1",
  sequenceNo: 1,
  code: "EV-0001",
  period: "2026-H1",
  templateId: "template-1",
  templateName: "Laporan Monitoring & Evaluasi - KMK",
  status: "draft",
  reportNumber: "",
  assignmentLetterNumber: "",
  monitoringDateRange: "",
  unitCode: "",
  unitLocation: "",
  unitAddress: "",
  unitEselonI: "",
  unitLeaderName: "",
  teamCoordinator: "",
  teamLead: "",
  teamMembers: "",
  problems: "",
  recommendations: "",
  sections: [],
  createdAt: "2026-05-25T00:00:00Z",
  updatedAt: "2026-05-25T00:00:00Z",
};

test("evaluation helpers label status", () => {
  assert.equal(evaluationStatusLabel.draft, "Draft");
  assert.equal(evaluationStatusLabel.final, "Final");
});

test("evaluation helpers detect editability", () => {
  assert.equal(isEvaluationEditable(base), true);
  assert.equal(isEvaluationEditable({ ...base, status: "final" }), false);
});

test("evaluation helpers filter by search, status, and period", () => {
  const result = filterEvaluations(
    [base, { ...base, id: "eval-2", period: "2026-H2", status: "final" }],
    { search: "h1", status: "draft", period: "2026-H1" },
  );
  assert.deepEqual(
    result.map((item) => item.id),
    ["eval-1"],
  );
});

function withAnswers(answers: Array<"yes" | "no" | "unset">): Evaluation {
  return {
    ...base,
    monitoringPeriodId: "period-1",
    sections: [{
      id: "section-1", evaluationId: base.id, sectionKey: "section", title: "Bagian",
      description: "", conclusion: "", sortOrder: 0, createdAt: "", updatedAt: "",
      items: answers.map((answer, index) => ({
        id: `item-${index}`, sectionId: "section-1", itemKey: `point-${index}`,
        itemNo: `${index + 1}`, label: "Pertanyaan", answer, condition: "",
        description: "", analysis: "", sortOrder: index, createdAt: "", updatedAt: "",
      })),
    }],
  };
}

test("finalization identifies all unanswered points in reading order", () => {
  const result = validateEvaluationFinalization(withAnswers(["unset", "no", "unset", "yes"]));
  assert.deepEqual(result.unansweredItemIds, ["item-0", "item-2"]);
  assert.equal(result.message, "Jawab setiap butir evaluasi sebelum finalisasi.");
});

test("both yes and no satisfy finalization without requiring optional text", () => {
  assert.deepEqual(validateEvaluationFinalization(withAnswers(["yes", "no"])), {
    unansweredItemIds: [], message: null,
  });
});

test("finalization errors clear when answers are corrected and return when unset", () => {
  const evaluation = withAnswers(["unset"]);
  assert.equal(validateEvaluationFinalization(evaluation).unansweredItemIds.length, 1);
  evaluation.sections[0].items[0].answer = "no";
  assert.equal(validateEvaluationFinalization(evaluation).message, null);
  evaluation.sections[0].items[0].answer = "unset";
  assert.equal(validateEvaluationFinalization(evaluation).unansweredItemIds.length, 1);
});

test("finalization blocks empty templates and preserves legacy answer rules", () => {
  assert.equal(validateEvaluationFinalization(base).message, "Evaluasi belum memiliki butir penilaian.");
  assert.equal(validateEvaluationFinalization(withAnswers([])).message, "Evaluasi belum memiliki butir penilaian.");
  const legacy = withAnswers(["unset"]);
  delete legacy.monitoringPeriodId;
  assert.equal(validateEvaluationFinalization(legacy).message, null);
});
