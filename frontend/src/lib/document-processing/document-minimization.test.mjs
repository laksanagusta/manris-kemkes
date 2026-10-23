import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Run the production modules with an in-memory fetch stub. No request leaves the process.
const modules = new Map();
function moduleUrl(relativePath) {
  if (modules.has(relativePath)) return modules.get(relativePath);
  const source = readFileSync(new URL(`../../${relativePath}.ts`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/from "@\/([^"]+)"/g, (_, dependency) => `from "${moduleUrl(dependency)}"`);
  const url = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
  modules.set(relativePath, url);
  return url;
}

const { DOCUMENT_ANALYSIS_MODES, isDocumentAnalysisMode } = await import(moduleUrl("types/document-intelligence"));
const { analyzeDocumentIntelligence } = await import(moduleUrl("lib/api/document-intelligence"));
const { createDocumentProcessingApiAdapter } = await import(moduleUrl("lib/document-processing/api-adapter"));

test("only the three retained modes are accepted", () => {
  assert.deepEqual(DOCUMENT_ANALYSIS_MODES, ["risk_event_extraction", "sop_risk_universe", "mitigation_report_mapper"]);
  for (const mode of DOCUMENT_ANALYSIS_MODES) assert.equal(isDocumentAnalysisMode(mode), true);
  for (const mode of ["audit_finding_mapper", "strategic_objective_risk", undefined, "", 42]) assert.equal(isDocumentAnalysisMode(mode), false);
});

test("document API never sends manual period or risk-code filters", async (t) => {
  const originalFetch = globalThis.fetch;
  let submitted;
  globalThis.fetch = async (_url, options) => {
    submitted = options.body;
    return new Response(JSON.stringify({ data: {} }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  for (const mode of DOCUMENT_ANALYSIS_MODES) {
    await analyzeDocumentIntelligence("dummy-token", {
      file: new File(["dokumen"], "private-local-name.pdf"), mode,
      organizationId: "selected-org", period: "2026-Q4", riskCode: " R-001 ",
    });
    assert.equal(submitted.get("organizationId"), "selected-org");
    assert.equal(submitted.get("period"), null);
    assert.equal(submitted.get("riskCode"), null);
    assert.deepEqual([...submitted.keys()].sort(), ["file", "mode", "organizationId"].sort());
  }
});

const sourceDocument = {
  id: "source", name: "private-local-name.pdf", extension: "pdf", mimeType: "application/pdf", size: 7,
  pages: 0, status: "ready", file: new File(["dokumen"], "private-local-name.pdf"),
};

test("adapter rejects removed modes without making an API request", (t) => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("unexpected API call"); };
  t.after(() => { globalThis.fetch = originalFetch; });
  const adapter = createDocumentProcessingApiAdapter({ token: "dummy-token" });
  for (const mode of ["audit_finding_mapper", "strategic_objective_risk"]) {
    const updates = [];
    adapter.run(adapter.createJob({ mode, documents: [sourceDocument] }), (job) => updates.push(job));
    assert.equal(updates.at(-1).status, "failed");
    assert.match(updates.at(-1).error, /Mode analisis dokumen tidak tersedia/);
  }
  assert.equal(calls, 0);
});

test("mitigation adapter preserves each job's scope through the API call", async (t) => {
  const originalFetch = globalThis.fetch;
  let submitted;
  globalThis.fetch = async (_url, options) => {
    submitted = options.body;
    return new Response(JSON.stringify({ data: {
      mode: "mitigation_report_mapper", document: { filename: "private-local-name.pdf", textLength: 7, warnings: [] },
      result: { mode: "mitigation_report_mapper", mitigation: { taskMatches: [] } },
    } }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const adapter = createDocumentProcessingApiAdapter({ token: "dummy-token", organizationId: "selected-org" });
  const job = adapter.createJob({ mode: "mitigation_report_mapper", documents: [sourceDocument], period: "2026-Q3", riskCode: "R-007" });
  const anotherScopeAdapter = createDocumentProcessingApiAdapter({ token: "dummy-token", organizationId: "another-org" });
  const final = await new Promise((resolve) => {
    anotherScopeAdapter.run(job, (update) => { if (["completed", "partial", "failed"].includes(update.status)) resolve(update); });
  });
  assert.equal(final.status, "completed");
  assert.equal(submitted.get("organizationId"), "selected-org");
  assert.equal(submitted.get("period"), null);
  assert.equal(submitted.get("riskCode"), null);
});

test("sensitive-data rejection appears as a failed job with a safe error", async (t) => {
  const originalFetch = globalThis.fetch;
  const safeError = "Dokumen terindikasi memuat data sensitif (email). Hapus data tersebut dari dokumen, lalu unggah kembali.";
  globalThis.fetch = async () => new Response(JSON.stringify({
    type: "https://api.manris.com/errors/validation-error", status: 422, detail: safeError,
  }), { status: 422, headers: { "Content-Type": "application/problem+json" } });
  t.after(() => { globalThis.fetch = originalFetch; });
  const adapter = createDocumentProcessingApiAdapter({ token: "dummy-token" });
  const job = adapter.createJob({ mode: "sop_risk_universe", documents: [sourceDocument] });
  const final = await new Promise((resolve) => {
    adapter.run(job, (update) => { if (["completed", "partial", "failed"].includes(update.status)) resolve(update); });
  });
  assert.equal(final.status, "failed");
  assert.equal(final.error, safeError);
  assert.deepEqual(final.findings, []);
});
