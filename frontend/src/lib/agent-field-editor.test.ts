import assert from "node:assert/strict";
import test from "node:test";
import { agentFieldValueError } from "./agent-field-editor.ts";

test("typed nested risk edits preserve numeric types and reject blank or invalid scores", () => {
  const original = { probability: 3, mitigations: [{ id: "stored-id", action: "Koordinasi", targetCost: 15.25 }] };
  const edited = structuredClone(original);
  edited.mitigations[0].action = "Koordinasi ulang";
  assert.equal(agentFieldValueError(edited, original), null);
  assert.equal(original.mitigations[0].action, "Koordinasi");
  assert.equal(edited.mitigations[0].id, "stored-id");
  for (const probability of ["", "3", NaN, Infinity, 0, 6, 2.5]) {
    assert.ok(agentFieldValueError({ probability }, original));
  }
  assert.ok(agentFieldValueError({ values: { mitigations: [{ reportDate: 32 }] } }, {}));
  assert.ok(agentFieldValueError({ mitigations: [{ targetCost: "" }] }, {}));
  assert.equal(agentFieldValueError({ cause: ["Cuaca", "Jadwal"], values: { impact: 4 } }, {}), null);
});
