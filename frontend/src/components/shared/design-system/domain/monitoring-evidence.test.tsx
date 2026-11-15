import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MonitoringEvidence } from "./monitoring-evidence";

test("the final result shows the captured reason without an evidence URL or a collapsed disclosure", () => {
  const reason = "Jadwal pengiriman belum tersedia.";
  const html = renderToStaticMarkup(createElement(MonitoringEvidence, {
    result: {
      final: true,
      evidence: {
        capturedAt: "2027-12-01T00:00:00+07:00",
        title: "Risiko distribusi",
        sourceScore: 6,
        targetScore: 4,
        events: [],
        reports: [{
          id: "action-1", action: "Jadwalkan distribusi", status: "skipped", notes: reason,
          evidenceUrl: "", reportedAt: "2027-12-01T00:00:00+07:00",
        }],
      },
    },
  }));

  assert.ok(html.includes(reason));
  assert.match(html, /Belum dilaksanakan · Dilaporkan/);
  assert.doesNotMatch(html, /<details\b|Buka bukti/);
});
