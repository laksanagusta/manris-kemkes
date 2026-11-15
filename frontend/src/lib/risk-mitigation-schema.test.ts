import assert from "node:assert/strict";
import test from "node:test";
import { mitigationSchema } from "./risk-mitigation-schema.ts";
import { buildRiskRegisterPayload } from "./risk-register-payload.ts";

test("existing API recurring schedules pass validation and preserve payload types", () => {
  const plan = mitigationSchema.parse({ id:"plan-1", action:"Periksa stok", owner:"Unit", frequency:"rutin", recurringInterval:"bulanan", reportDate:25, reportDay:null });
  const payload = buildRiskRegisterPayload({title:"Risiko diubah",description:"Perubahan judul tanpa perubahan jadwal",probability:3,impact:3,weight:1,riskPriority:1,targetProbability:1,targetImpact:1,targetWeight:1,mitigations:[plan]},"draft",{assessmentCycle:"2026-Q4"});
  assert.equal(payload.mitigations[0].recurringInterval,"bulanan");
  assert.equal(payload.mitigations[0].reportDate,25);
  assert.equal(mitigationSchema.safeParse({...plan,recurringInterval:1}).success,false);
  assert.equal(mitigationSchema.safeParse({...plan,reportDate:"25"}).success,false);
  assert.equal(mitigationSchema.safeParse({...plan,reportDate:25.5}).success,false);
});
