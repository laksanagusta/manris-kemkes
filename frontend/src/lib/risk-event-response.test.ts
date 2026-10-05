import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRiskEvent, type RiskEventResponse } from "./risk-event-response.ts";

test("unmapped risk events support detail rendering and available-risk filtering", () => {
  for (const linkedRisks of [null, undefined, []]) {
    const event = normalizeRiskEvent({ id: "event-1", linkedRisks } as RiskEventResponse);
    assert.equal(event.linkedRisks.length, 0);
    assert.deepEqual(event.linkedRisks.map((risk) => risk.id), []);
    assert.equal(event.id, "event-1");
  }
});

test("existing risk links survive response normalization", () => {
  const linkedRisks = [{ id: "risk-1", code: "R-001", title: "Existing risk" }];
  const event = normalizeRiskEvent({ linkedRisks } as RiskEventResponse);
  assert.equal(event.linkedRisks, linkedRisks);
});
