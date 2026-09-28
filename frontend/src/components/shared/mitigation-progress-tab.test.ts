import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const componentSource = readFileSync(
  new URL("./mitigation-progress-tab.tsx", import.meta.url),
  "utf8",
);

test("mitigation progress summary uses 13px for every label", () => {
  for (const label of ["Total", "Selesai", "Menunggu", "Terlambat"]) {
    assert.match(
      componentSource,
      new RegExp(`<span className="text-\\[13px\\] text-muted-foreground">${label}<\\/span>`),
    );
  }
  assert.match(
    componentSource,
    /<span className="text-\[13px\] text-muted-foreground">\s*Tidak dilaporkan\s*<\/span>/,
  );
  assert.doesNotMatch(componentSource, /<span className="text-xs text-muted-foreground">/);
});
