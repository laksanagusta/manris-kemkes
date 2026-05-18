import assert from "node:assert/strict";
import test from "node:test";

import {
  consumeDocumentIntelligencePrefill,
  consumeLatestMitigationReportPrefill,
  createDocumentIntelligencePrefillToken,
  saveLatestMitigationReportPrefill,
  saveDocumentIntelligencePrefill,
} from "./document-intelligence-prefill";

function withMockWindow<T>(fn: () => T): T {
  const originalWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
  const store = new Map<string, string>();

  (globalThis as typeof globalThis & { window: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  } as Window & typeof globalThis;

  try {
    return fn();
  } finally {
    if (originalWindow === undefined) {
      delete (globalThis as typeof globalThis & { window?: unknown }).window;
    } else {
      (globalThis as typeof globalThis & { window: unknown }).window = originalWindow;
    }
  }
}

test("document intelligence prefill saves and consumes once", () => {
  withMockWindow(() => {
    const token = createDocumentIntelligencePrefillToken();
    saveDocumentIntelligencePrefill(token, {
      kind: "risk",
      title: "Risiko A",
      description: "Deskripsi A",
      quote: "Kutipan sumber",
    });

    const first = consumeDocumentIntelligencePrefill(token);
    assert.equal(first?.kind, "risk");
    assert.equal(first?.title, "Risiko A");
    assert.equal(first?.description, "Deskripsi A");
    assert.equal(first?.quote, "Kutipan sumber");

    const second = consumeDocumentIntelligencePrefill(token);
    assert.equal(second, null);
  });
});

test("document intelligence prefill supports objective payloads", () => {
  withMockWindow(() => {
    const token = "objective-token";
    saveDocumentIntelligencePrefill(token, {
      kind: "objective",
      organizationId: "org-1",
      period: "2026-H1",
      tujuan: "Tujuan",
      sasaran: "Sasaran",
      indikatorKinerjaUtama: "IKU",
      target: "90%",
      program: "Program",
      kegiatan: "Kegiatan",
      processBusiness: "Proses bisnis",
      quote: "Kutipan sasaran",
    });

    const value = consumeDocumentIntelligencePrefill(token);
    assert.equal(value?.kind, "objective");
    assert.equal(value?.organizationId, "org-1");
    assert.equal(value?.indikatorKinerjaUtama, "IKU");
    assert.equal(value?.quote, "Kutipan sasaran");
  });
});

test("document intelligence prefill supports mitigation report payloads", () => {
  withMockWindow(() => {
    const token = "mitigation-token";
    saveDocumentIntelligencePrefill(token, {
      kind: "mitigation-report",
      taskId: "task-1",
      progressPct: 75,
      actualCost: 1250000,
      notes: "Draft laporan",
      quote: "Bukti laporan",
    });

    const value = consumeDocumentIntelligencePrefill(token);
    assert.equal(value?.kind, "mitigation-report");
    assert.equal(value?.taskId, "task-1");
    assert.equal(value?.progressPct, 75);
    assert.equal(value?.actualCost, 1250000);
    assert.equal(value?.notes, "Draft laporan");
  });
});

test("document intelligence latest mitigation prefill can be consumed once", () => {
  withMockWindow(() => {
    saveLatestMitigationReportPrefill({
      kind: "mitigation-report",
      taskId: "task-2",
      progressPct: 50,
      actualCost: 500000,
      notes: "Catatan mitigasi",
      quote: "Kutipan mitigasi",
    });

    const first = consumeLatestMitigationReportPrefill();
    assert.equal(first?.kind, "mitigation-report");
    assert.equal(first?.taskId, "task-2");
    assert.equal(first?.progressPct, 50);
    assert.equal(first?.notes, "Catatan mitigasi");

    const second = consumeLatestMitigationReportPrefill();
    assert.equal(second, null);
  });
});

test("document intelligence prefill ignores blank stored payloads", () => {
  withMockWindow(() => {
    const token = "blank-token";
    window.localStorage.setItem(
      `manris:document-intelligence-prefill:${token}`,
      "   ",
    );

    const value = consumeDocumentIntelligencePrefill(token);
    assert.equal(value, null);
  });
});
