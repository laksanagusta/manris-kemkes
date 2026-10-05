import assert from "node:assert/strict";
import test from "node:test";
import { saveProcessingJob, loadLatestProcessingJob, markProcessingFindingHandled, clearProcessingJobs } from "./storage.ts";
import type { ProcessingJob } from "../../types/document-processing.ts";

test("candidate history and handled markers stay inside the account and organization scope", () => {
  const entries = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { sessionStorage: {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  } } });
  const job = (id: string, storageScope: string): ProcessingJob => ({ id, storageScope, name: id, mode: "risk_event_extraction", status: "completed", createdAt: "2026-10-04", updatedAt: "2026-10-04", documents: [], pages: [], groups: [], tasks: [], events: [], findings: [], progress: 100 });
  try {
    saveProcessingJob(job("first", "user-a:unit-a"));
    saveProcessingJob(job("second", "user-b:unit-b"));
    assert.equal(loadLatestProcessingJob("risk_event_extraction", "user-a:unit-a")?.id, "first");
    assert.equal(loadLatestProcessingJob("risk_event_extraction", "user-b:unit-b")?.id, "second");
    assert.equal(loadLatestProcessingJob("risk_event_extraction", "user-a:unit-b"), undefined);
    markProcessingFindingHandled("risk_event_extraction", "candidate-a", "user-a:unit-a");
    assert.deepEqual(loadLatestProcessingJob("risk_event_extraction", "user-a:unit-a")?.handledFindingIds, ["candidate-a"]);
    assert.equal(loadLatestProcessingJob("risk_event_extraction", "user-b:unit-b")?.handledFindingIds, undefined);
    clearProcessingJobs("risk_event_extraction", "user-a:unit-a");
    assert.equal(loadLatestProcessingJob("risk_event_extraction", "user-a:unit-a"), undefined);
    assert.equal(loadLatestProcessingJob("risk_event_extraction", "user-b:unit-b")?.id, "second");
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
