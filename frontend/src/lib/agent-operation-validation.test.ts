import assert from "node:assert/strict";
import test from "node:test";
import { agentOperationLabels, agentOperationReviewValues, agentOperationValidationError } from "./agent-operation-validation.ts";
import type { AgentOperation } from "../types/agent.ts";

const op = (kind: string, after: Record<string, unknown>): AgentOperation => ({ id: "op", title: "Tinjau perubahan", kind, included: true, targetId: "26c7743c-4815-4f14-a68b-40f132808184", after });
test("monitoring and incident links have explicit reviewable operation labels", () => {
  assert.equal(agentOperationLabels.patch_monitoring, "Perbarui draf pemantauan");
  assert.equal(agentOperationLabels.link_risk_event, "Hubungkan kejadian dengan risiko");
});
test("monitoring score and progress edits enforce their integer ranges", () => {
  assert.equal(agentOperationValidationError(op("patch_monitoring", { observedProbability: 1, observedImpact: 5, mitigationCompletionPercent: 100, conclusion: "Perlu ditinjau", mitigationProgressSummary: "Progres dilaporkan" })), null);
  for (const value of [0, 6, 1.5, "3", null]) assert.match(agentOperationValidationError(op("patch_monitoring", { observedProbability: value }))!, /Kemungkinan teramati/);
  for (const value of [-1, 101, 25.5, "50"]) assert.match(agentOperationValidationError(op("patch_monitoring", { mitigationCompletionPercent: value }))!, /Persentase penyelesaian/);
});
test("nested monitoring values preserve permitted profile fields and reject finalization edits", () => {
  assert.equal(agentOperationValidationError(op("patch_monitoring", { values: { category: "operasional", title: "Distribusi", cause: ["Cuaca"], mitigations: [{ id: "0d76396a-7df4-4158-acd2-151ee74b3399", action: "Koordinasi", owner: "Unit A", frequency: "rutin", mitigationType: "reduce_probability" }] } })), null);
  for (const after of [{ status: "final" }, { values: { status: "final" } }, { values: { category: "unknown" } }, { values: { mitigations: [{ frequency: "unknown" }] } }, { values: [] }]) assert.ok(agentOperationValidationError(op("patch_monitoring", after)));
});
test("new staged mitigation plans may share the zero-UUID placeholder", () => {
  const id = "00000000-0000-0000-0000-000000000000";
  assert.equal(agentOperationValidationError(op("patch_monitoring", { values: { mitigations: [{ id, action: "Tinjau jadwal", owner: "Unit A" }, { id, action: "Koordinasi unit", owner: "Unit B" }] } })), null);
  assert.ok(agentOperationValidationError(op("link_risk_event", { riskIds: [id] })));
});
test("incident-link edits require a nonempty unique list of real UUIDs only", () => {
  const id = "d509aa42-13fe-4d5f-a138-f44d188aaaba";
  assert.equal(agentOperationValidationError(op("link_risk_event", { riskIds: [id] })), null);
  for (const after of [{ riskIds: [] }, { riskIds: ["not-an-id"] }, { riskIds: [id, id] }, { riskIds: [id], description: "Edited immutable body" }]) assert.ok(agentOperationValidationError(op("link_risk_event", after)));
});
test("excluded operations do not block the rest of a package", () => {
  assert.equal(agentOperationValidationError({ ...op("patch_monitoring", { observedProbability: 8 }), included: false }), null);
});

test("agent mitigation reports use the same two fields and validation as Penanganan", () => {
  for (const evidenceUrl of ["", "https://example.org/bukti"]) {
    assert.equal(agentOperationValidationError(op("report_mitigation_task", { notes: "Penyuluhan telah dilaksanakan", evidenceUrl })), null);
  }
  for (const after of [
    { evidenceUrl: "" }, { notes: "pendek" }, { notes: "x".repeat(1001) },
    { notes: "Penyuluhan telah dilaksanakan", evidenceUrl: "tanpa bukti" },
    { notes: "Penyuluhan telah dilaksanakan", evidenceUrl: "https://example.org/a\nhttps://example.org/b" },
    ...["status", "reportOutput", "reportObstacle"].map((key) => ({ notes: "Penyuluhan telah dilaksanakan", [key]: "legacy" })),
  ]) assert.ok(agentOperationValidationError(op("report_mitigation_task", after)), JSON.stringify(after));
});


test("report review keeps the optional evidence field editable and never drops legacy fields silently", () => {
  assert.deepEqual(agentOperationReviewValues(op("report_mitigation_task", { notes: "Penyuluhan terlaksana" })), { notes: "Penyuluhan terlaksana", evidenceUrl: "" });
  const legacy = op("report_mitigation_task", { notes: "Penyuluhan terlaksana", reportObstacle: "lama" });
  assert.equal(agentOperationReviewValues(legacy).reportObstacle, "lama");
  assert.match(agentOperationValidationError(legacy)!, /menyusun ulang/);
});
