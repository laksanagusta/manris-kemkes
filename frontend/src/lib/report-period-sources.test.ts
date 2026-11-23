import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportPeriodSources } from "../components/upr/report-period-sources";
import type { SemesterSnapshot } from "./api/upr-workflow";

const snapshot: SemesterSnapshot = {
  cutoff: "2026-06-30",
  profile: { id: "v2", version: 2, finalizedAt: "2026-07-13T10:00:00Z", finalizedBy: "owner" },
  reason: "Koreksi skor Juni",
  risks: [],
  supporting: [{
    kind: "working_paper", period: "2026-H1", sourceId: "paper-1",
    code: "KK-001", finalizedAt: "2026-07-02T10:00:00Z", profileId: "v1", profileVersion: 1,
  }],
};

test("a correction identifies its revised version and the original period documents", () => {
  const html = renderToStaticMarkup(createElement(ReportPeriodSources, {
    snapshot: {
      ...snapshot,
      periods: [{
        id: "h1", period: "2026-H1", label: "Semester I", profileId: "v1", profileVersion: 1, needsReview: true,
      }],
      corrections: [{
        groupId: "risk", riskId: "risk-v2", riskCode: "R-002", period: "2026-H1",
        profileId: "v2", profileVersion: 2, effectiveFrom: "2026-06-15", reason: "Bukti baru",
      }],
    },
  }));
  assert.match(html, /Semester I · Profil v1 · Perlu ditinjau/);
  assert.match(html, /KK-001 \(Profil v1\)/);
  assert.match(html, /R-002 [^<]*Profil v2/);
  assert.match(html, /Bukti baru/);
});

test("stored reports without period metadata keep their original layout", () => {
  const html = renderToStaticMarkup(createElement(ReportPeriodSources, { snapshot }));
  assert.equal(html, "");
});
