import assert from "node:assert/strict";
import test from "node:test";
import { api } from "../api";
import { startRiskRevision } from "./risk-monitoring";

test("revision always opens the shared risk form even when the response has a monitoring redirect", async () => {
 const original = api.post;
 api.post = async <T>() => ({ riskId: "draft-risk-id", existingDraft: true, redirectUrl: "/risk/monitoring/old-id" }) as T;
 try {
  const result = await startRiskRevision("test", "source-id", { changeReason: "Koreksi profil risiko" });
  assert.equal(result.redirectUrl, "/risk/register/new?id=draft-risk-id");
 } finally { api.post = original; }
});

test("old backend response cannot navigate revision to the monitoring form", async () => {
 const original = api.post;
 api.post = async <T>() => ({ monitoring: { id: "old-id" }, redirectUrl: "/risk/monitoring/old-id" }) as T;
 try {
  await assert.rejects(startRiskRevision("test", "source-id", { changeReason: "Koreksi profil risiko" }), /Draf revisi belum dapat dibuka/);
 } finally { api.post = original; }
});
