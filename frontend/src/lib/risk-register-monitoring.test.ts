import assert from "node:assert/strict";
import test from "node:test";

const monitoringLib = await import(
  new URL("./risk-register-monitoring.ts", import.meta.url).href,
);

const {
  formatMonitoringNilai,
  getMonitoringTransactionActionLabel,
  getMonitoringTransactionHref,
} = monitoringLib as typeof import("./risk-register-monitoring");

test("formatMonitoringNilai returns dash for nullish values", () => {
  assert.equal(formatMonitoringNilai(undefined), "-");
  assert.equal(formatMonitoringNilai(null), "-");
});

test("formatMonitoringNilai formats monitoring values", () => {
  assert.equal(formatMonitoringNilai(12), "12");
  assert.equal(formatMonitoringNilai(9.75), "9,75");
});

test("getMonitoringTransactionHref routes all rows to assessment", () => {
  assert.equal(
    getMonitoringTransactionHref({ id: "risk-v2" }),
    "/risk/assessment/risk-v2",
  );
});

test("getMonitoringTransactionActionLabel reflects monitoring status", () => {
  assert.equal(
    getMonitoringTransactionActionLabel("assessment_draft"),
    "Lanjutkan Pemantauan",
  );
  assert.equal(
    getMonitoringTransactionActionLabel("approved"),
    "Lihat Hasil",
  );
});
