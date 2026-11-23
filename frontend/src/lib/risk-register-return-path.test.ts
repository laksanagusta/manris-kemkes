import assert from "node:assert/strict";
import test from "node:test";

import { getRiskRegisterReturnPath } from "./risk-register-return-path.ts";

test("preserves supported context routes and their filters", () => {
  assert.equal(getRiskRegisterReturnPath("/work"), "/work");
  assert.equal(
    getRiskRegisterReturnPath("/risk/annual-profiles/2026?tab=monitoring"),
    "/risk/annual-profiles/2026?tab=monitoring",
  );
  assert.equal(getRiskRegisterReturnPath("/risk/register?status=draft"), "/risk/register?status=draft");
});

test("uses the register when the return destination is outside the allowlist", () => {
  assert.equal(getRiskRegisterReturnPath(null), "/risk/register");
  assert.equal(getRiskRegisterReturnPath("https://example.invalid/work"), "/risk/register");
  assert.equal(getRiskRegisterReturnPath("/login"), "/risk/register");
});
