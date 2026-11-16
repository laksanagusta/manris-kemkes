import assert from "node:assert/strict";
import test from "node:test";
import { getVerificationResendFeedback } from "./verification-resend-feedback.ts";

test("only a scheduled request says that a new delivery was scheduled", () => {
  assert.equal(getVerificationResendFeedback("scheduled").title, "Pengiriman baru dijadwalkan");
  assert.equal(getVerificationResendFeedback("existing").title, "Permintaan digabung dengan pengiriman aktif");
  assert.equal(getVerificationResendFeedback("unavailable").title, "Pengiriman baru belum tersedia");
});

test("cooldown uses the precise server deadline in WIB, including a date change", () => {
  const retryAt = "2026-11-16T17:00:03Z";
  const feedback = getVerificationResendFeedback("cooldown", retryAt);

  assert.equal(feedback.title, "Belum bisa kirim ulang");
  assert.equal(feedback.retryTime?.value, retryAt);
  assert.match(feedback.retryTime?.label ?? "", /17 Nov 2026.*00[.:]00[.:]03 WIB/);
});

test("cooldown without a usable server deadline does not display an invalid time", () => {
  assert.equal(getVerificationResendFeedback("cooldown").retryTime, undefined);
  assert.equal(getVerificationResendFeedback("cooldown", "invalid").description, "Coba lagi nanti.");
});
