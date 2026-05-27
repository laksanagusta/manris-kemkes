import assert from "node:assert/strict";
import test from "node:test";

import type { Evaluation } from "@/types/evaluation";
import {
  evaluationStatusLabel,
  filterEvaluations,
  isEvaluationEditable,
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
