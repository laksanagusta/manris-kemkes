import test from "node:test";
import assert from "node:assert/strict";

const { getWorkingPaperCreateErrorMessage } = await import(
  new URL("./working-paper-create-error", import.meta.url).href,
);

test("returns a human-readable Indonesian message when a reassessment for the current cycle already exists", () => {
  const error = {
    message:
      "risk reassessment for current cycle already exists and is still in progress",
    status: 409,
  };

  assert.equal(
    getWorkingPaperCreateErrorMessage(error),
    "Kertas kerja tidak bisa dibuat karena draft pemantauan untuk siklus saat ini sudah ada dan masih berjalan.",
  );
});

test("falls back to a generic Indonesian message for other failures", () => {
  assert.equal(
    getWorkingPaperCreateErrorMessage(new Error("unexpected failure")),
    "Gagal membuat kertas kerja.",
  );
});
