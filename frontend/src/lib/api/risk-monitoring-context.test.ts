import assert from "node:assert/strict";
import test from "node:test";
import { startMonitoring } from "./risk-monitoring";

test("configured monitoring starts send the selected profile and period with the observation", async () => {
  const originalFetch = globalThis.fetch;
  const response = { monitoring: { id: "monitoring-1" }, existingDraft: false };
  let requests = 0;
  globalThis.fetch = async (input, init) => {
    requests++;
    assert.ok(String(input).endsWith("/risks/risk-1/monitorings"));
    assert.equal(init?.method, "POST");
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer token");
    assert.deepEqual(JSON.parse(String(init?.body)), {
      observedAt: "2026-03-31",
      profileVersionId: "profile-1",
      monitoringPeriodId: "period-1",
    });
    return new Response(JSON.stringify({ data: response }), { status: 201 });
  };
  try {
    assert.deepEqual(await startMonitoring("token", "risk-1", "2026-03-31", {
      profileVersionId: "profile-1", monitoringPeriodId: "period-1",
    }), response);
    assert.equal(requests, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("legacy monitoring starts preserve their date-only payload", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), { observedAt: "2026-03-31" });
    return new Response(JSON.stringify({ data: { monitoring: { id: "legacy" }, existingDraft: true } }));
  };
  try {
    assert.equal((await startMonitoring("token", "risk-1", "2026-03-31")).existingDraft, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a rejected period remains an error without retrying outside its configured context", async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return new Response(JSON.stringify({ detail: "Periode pengisian sudah ditutup." }), { status: 409 });
  };
  try {
    await assert.rejects(startMonitoring("token", "risk-1", "2026-03-31", {
      profileVersionId: "profile-1", monitoringPeriodId: "period-1",
    }), /Periode pengisian sudah ditutup/);
    assert.equal(requests, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
