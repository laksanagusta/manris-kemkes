import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const toModule = (source) => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`;
const apiUrl = toModule(readFileSync(new URL("./api.ts", import.meta.url), "utf8"));
const errorSource = readFileSync(new URL("./ai-error.ts", import.meta.url), "utf8").replace('"@/lib/api"', JSON.stringify(apiUrl));
const { getAIErrorMessage } = await import(toModule(errorSource));
const { api, ApiError } = await import(apiUrl);
const message = "Permintaan AI terindikasi memuat data sensitif (email). Periksa masukan dan data konteks yang digunakan, hapus data sensitif, lalu coba lagi.";

test("sensitive-data HTTP error becomes an actionable UI message", async (t) => {
 const originalFetch = globalThis.fetch;
 globalThis.fetch = async () => new Response(JSON.stringify({ detail: message }), { status: 422, headers: { "Content-Type": "application/problem+json" } });
 t.after(() => { globalThis.fetch = originalFetch; });
 await assert.rejects(api.post("/ai/causes", { title: "Risiko" }, "dummy-token"), (error) => getAIErrorMessage(error, "Gagal") === message);
});

test("unrelated and raw provider errors keep a generic UI message", () => {
 for (const error of [undefined, "private-provider-content", new Error(message), new ApiError(message, 500), new ApiError("private-provider-content", 422), new ApiError("private-provider-content", 502)]) {
  assert.equal(getAIErrorMessage(error, "Gagal memproses"), "Gagal memproses");
 }
});
