import assert from "node:assert/strict";
import test from "node:test";
import { motionDurationMs } from "./motion-timing.ts";

test("motion orchestration preserves duration after CSS minification", () => {
  for (const [css, expected] of [["150ms", 150], [".15s", 150], [" 0.3s ", 300], ["80ms", 80], [".08s", 80], ["0s", 0]] as const) {
    assert.equal(motionDurationMs(css, 200), expected);
  }
});

test("unresolved or malformed motion tokens use the fallback", () => {
  for (const css of ["", "var(--duration)", "NaN", "-20ms", "20", "200ms junk"]) {
    assert.equal(motionDurationMs(css, 200), 200);
  }
});
