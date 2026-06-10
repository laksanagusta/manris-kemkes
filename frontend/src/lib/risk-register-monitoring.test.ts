import assert from "node:assert/strict";
import test from "node:test";

const monitoringLib = await import(
  new URL("./risk-register-monitoring", import.meta.url).href,
);

const {
  formatMonitoringNilai,
  formatMonitoringReviewNext,
  formatMonitoringScoreChange,
  getRiskRegisterMonitoringStatusLabel,
  getRiskRegisterMonitoringStatusTone,
  getMonitoringTransactionActionLabel,
  getMonitoringTransactionHref,
  getMonitoringTransactionStatusLabel,
} = monitoringLib as typeof import("./risk-register-monitoring");

test("formatMonitoringNilai returns dash for nullish values", () => {
  assert.equal(formatMonitoringNilai(undefined), "-");
  assert.equal(formatMonitoringNilai(null), "-");
});

test("formatMonitoringNilai formats monitoring values", () => {
  assert.equal(formatMonitoringNilai(12), "12");
  assert.equal(formatMonitoringNilai(9.75), "9,75");
});

test("formatMonitoringScoreChange combines source and observed values", () => {
  assert.equal(formatMonitoringScoreChange(12, 15), "12 -> 15");
  assert.equal(formatMonitoringScoreChange(9.5, undefined), "9,5");
  assert.equal(formatMonitoringScoreChange(undefined, undefined), "-");
});

test("formatMonitoringReviewNext prefers schedule text then fallback date", () => {
  assert.equal(
    formatMonitoringReviewNext("Semester berikutnya", "2026-06-09"),
    "Semester berikutnya",
  );
  assert.equal(
    formatMonitoringReviewNext(undefined, "2026-06-09"),
    "09 Jun 2026",
  );
  assert.equal(formatMonitoringReviewNext(undefined, undefined), "-");
});

test("getMonitoringTransactionHref routes all rows to monitoring", () => {
  assert.equal(
    getMonitoringTransactionHref({ id: "risk-v2" }),
    "/risk/monitoring/risk-v2",
  );
});

test("getMonitoringTransactionActionLabel reflects monitoring status", () => {
  assert.equal(
    getMonitoringTransactionActionLabel("draft"),
    "Lanjutkan Pemantauan",
  );
  assert.equal(
    getMonitoringTransactionActionLabel("finalized"),
    "Lihat Hasil Pemantauan",
  );
});

test("getMonitoringTransactionStatusLabel normalizes monitoring statuses", () => {
  assert.equal(getMonitoringTransactionStatusLabel("draft"), "Draft");
  assert.equal(getMonitoringTransactionStatusLabel("finalized"), "Final");
  assert.equal(getMonitoringTransactionStatusLabel("void"), "Void");
});

test("getRiskRegisterMonitoringStatusLabel reflects risk register semantics", () => {
  assert.equal(getRiskRegisterMonitoringStatusLabel(undefined, false), "-");
  assert.equal(getRiskRegisterMonitoringStatusLabel(undefined, true), "Belum Dimulai");
  assert.equal(getRiskRegisterMonitoringStatusLabel("draft"), "Draf");
  assert.equal(getRiskRegisterMonitoringStatusLabel("finalized"), "Selesai");
  assert.equal(getRiskRegisterMonitoringStatusLabel("void"), "Dibatalkan");
});

test("getRiskRegisterMonitoringStatusTone maps monitoring state to tone", () => {
  assert.equal(getRiskRegisterMonitoringStatusTone(undefined, false), "neutral");
  assert.equal(getRiskRegisterMonitoringStatusTone(undefined, true), "neutral");
  assert.equal(getRiskRegisterMonitoringStatusTone("draft"), "warning");
  assert.equal(getRiskRegisterMonitoringStatusTone("finalized"), "success");
  assert.equal(getRiskRegisterMonitoringStatusTone("void"), "danger");
});
