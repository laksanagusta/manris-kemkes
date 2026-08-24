import assert from "node:assert/strict";
import test from "node:test";

import {
  filterKRIReviewQueueByState,
  formatKRIValue,
  formatSemesterSummary,
  getMitigationSubmissionActionState,
  getKRIStatus,
  getKRIStatusFromReport,
  isKRIReviewAttentionOverdue,
  isReportOverdue,
  validateKRIRevisionReviewNote,
  validateEvidenceURL,
} from "./kri-reporting.mjs";
import {
  normalizeKRIReportPayload,
  validateKRIReportForm,
  validateKRISkipForm,
  validateMitigationReportForm,
} from "./validation/reporting.mjs";

test("getKRIStatus evaluates explicit amber thresholds for higher-worse KRIs", () => {
  const thresholds = { thresholdMin: 10, thresholdMax: 90, amberThresholdMax: 70 };

  assert.equal(getKRIStatus(69, "higher_worse", thresholds), "safe");
  assert.equal(getKRIStatus(70, "higher_worse", thresholds), "warning");
  assert.equal(getKRIStatus(91, "higher_worse", thresholds), "breach");
});

test("getKRIStatus evaluates explicit amber thresholds for lower-worse KRIs", () => {
  const thresholds = { thresholdMin: 10, thresholdMax: 90, amberThresholdMin: 30 };

  assert.equal(getKRIStatus(31, "lower_worse", thresholds), "safe");
  assert.equal(getKRIStatus(30, "lower_worse", thresholds), "warning");
  assert.equal(getKRIStatus(9, "lower_worse", thresholds), "breach");
});

test("isReportOverdue only labels active draft states as overdue", () => {
  const now = new Date("2026-04-03T10:00:00.000Z");

  assert.equal(isReportOverdue("2026-04-02", "pending", now), true);
  assert.equal(isReportOverdue("2026-04-02", "submitted", now), false);
  assert.equal(isReportOverdue("2026-04-04", "revision_requested", now), false);
});

test("formatKRIValue keeps the metric suffix deterministic", () => {
  assert.equal(formatKRIValue(72.9, "%"), "72.9 %");
  assert.equal(formatKRIValue(12, "hari"), "12 hari");
});

test("getKRIStatusFromReport accepts canonical accepted reports only", () => {
  const thresholds = { thresholdMin: 10, thresholdMax: 90, amberThresholdMax: 70 };

  assert.equal(
    getKRIStatusFromReport({ status: "accepted", value: 72, direction: "higher_worse", thresholds }),
    "warning"
  );
  assert.equal(
    getKRIStatusFromReport({ status: "submitted", value: 72, direction: "higher_worse", thresholds }),
    null
  );
});

test("formatSemesterSummary formats accepted-only summary data", () => {
  const summary = formatSemesterSummary({
    sourceCycle: "2025-H2",
    kris: [
      {
        kriName: "KRI Lead Time",
        latestAcceptedValue: 72.9,
        metric: "%",
        acceptedCount: 2,
        overdueCount: 1,
        skippedCount: 1,
        revisionCount: 1,
        trend: "up",
      },
      {
        kriName: "KRI SLA",
        latestAcceptedValue: null,
        acceptedCount: 0,
        overdueCount: 0,
        skippedCount: 0,
        revisionCount: 0,
      },
    ],
  });

  assert.equal(summary.heading, "Semester 2025-H2");
  assert.equal(summary.totals, "2 KRI • 2 accepted • 1 overdue • 1 revision requested • 1 skipped");
  assert.deepEqual(summary.items[0], {
    kriName: "KRI Lead Time",
    value: "72.9 %",
    trend: "up",
    counts: "2 accepted • 1 overdue • 1 revision requested • 1 skipped",
    isArchived: false,
  });
  assert.equal(summary.items[1].value, "—");
});

test("validateEvidenceURL and validateKRIReportForm enforce optional URL rules", () => {
  assert.equal(validateEvidenceURL("https://example.com/evidence"), true);
  assert.equal(validateEvidenceURL("ftp://example.com/evidence"), false);

  assert.deepEqual(
    validateKRIReportForm({ value: "12", notes: "OK", evidenceUrl: "https://example.com/evidence" }),
    {}
  );
  assert.deepEqual(
    validateKRIReportForm({ value: "12", notes: "OK", evidenceUrl: "ftp://example.com/evidence" }),
    { evidenceUrl: "Link bukti harus berupa URL http:// atau https:// yang valid." }
  );
});

test("validateMitigationReportForm requires a valid evidence URL and notes", () => {
  assert.deepEqual(
    validateMitigationReportForm({ evidenceUrl: "", notes: "Catatan progress" }),
    { evidenceUrl: "Link bukti wajib diisi." },
  );
  assert.deepEqual(
    validateMitigationReportForm({ evidenceUrl: "ftp://example.com/evidence", notes: "Catatan progress" }),
    { evidenceUrl: "Link bukti harus berupa URL http:// atau https:// yang valid." },
  );
  assert.deepEqual(
    validateMitigationReportForm({ evidenceUrl: "https://example.com/evidence", notes: "Catatan progress" }),
    {},
  );
});

test("normalizeKRIReportPayload trims report fields and carries evidence url", () => {
  assert.deepEqual(
    normalizeKRIReportPayload({ value: " 12.5 ", notes: " note ", evidenceUrl: " https://example.com " }),
    { value: 12.5, notes: "note", evidenceUrl: "https://example.com" }
  );
});

test("validateKRISkipForm requires reason text", () => {
  assert.deepEqual(validateKRISkipForm({ reason: "" }), { reason: "Alasan skip wajib diisi." });
  assert.deepEqual(validateKRISkipForm({ reason: "abc" }), { reason: "Alasan skip minimal 5 karakter." });
  assert.deepEqual(validateKRISkipForm({ reason: "Tidak ada data sumber" }), {});
});

test("isKRIReviewAttentionOverdue maps overdue attention for submitted/revision states", () => {
  const now = new Date("2026-04-03T08:00:00.000Z");

  assert.equal(isKRIReviewAttentionOverdue("2026-04-02", "submitted", now), true);
  assert.equal(isKRIReviewAttentionOverdue("2026-04-02", "revision_requested", now), true);
  assert.equal(isKRIReviewAttentionOverdue("2026-04-02", "accepted", now), false);
  assert.equal(isKRIReviewAttentionOverdue("2026-04-04", "submitted", now), false);
});

test("getMitigationSubmissionActionState keeps overdue mitigation reports actionable", () => {
  const lateNow = new Date("2026-04-05T08:00:00.000Z");
  const openNow = new Date("2026-04-04T08:00:00.000Z");
  const earlyNow = new Date("2026-04-02T08:00:00.000Z");

  assert.deepEqual(
    getMitigationSubmissionActionState("2026-04-03", "2026-04-04", openNow),
    {
      allowed: true,
      message: "Siap lapor progres",
      isOverdue: false,
    }
  );
  assert.deepEqual(
    getMitigationSubmissionActionState("2026-04-03", "2026-04-02", lateNow),
    {
      allowed: true,
      message: "Terlambat, tetap bisa lapor progres",
      isOverdue: true,
    }
  );
  assert.deepEqual(
    getMitigationSubmissionActionState("2026-04-03", "2026-04-04", earlyNow),
    {
      allowed: false,
      message: "Laporan dapat dikirim mulai 4 Apr 2026 (H+1 setelah periode berakhir)",
      isOverdue: false,
    }
  );
});

test("filterKRIReviewQueueByState separates submitted, revision_requested, and overdue", () => {
  const now = new Date("2026-04-03T08:00:00.000Z");
  const items = [
    { id: "1", status: "submitted", dueDate: "2026-04-01" },
    { id: "2", status: "revision_requested", dueDate: "2026-04-02" },
    { id: "3", status: "submitted", dueDate: "2026-04-05" },
    { id: "4", status: "accepted", dueDate: "2026-03-30" },
    { id: "5", status: "skipped", dueDate: "2026-03-30" },
  ];

  assert.deepEqual(
    filterKRIReviewQueueByState(items, "submitted", now).map((item) => item.id),
    ["1", "3"]
  );

  assert.deepEqual(
    filterKRIReviewQueueByState(items, "revision_requested", now).map((item) => item.id),
    ["2"]
  );

  assert.deepEqual(
    filterKRIReviewQueueByState(items, "overdue", now).map((item) => item.id),
    ["1", "2"]
  );
});

test("validateKRIRevisionReviewNote requires non-empty reviewer note", () => {
  assert.equal(validateKRIRevisionReviewNote("   "), "Catatan revisi wajib diisi.");
  assert.equal(validateKRIRevisionReviewNote("Perbaiki bukti data dan catatan periodenya"), null);
});
