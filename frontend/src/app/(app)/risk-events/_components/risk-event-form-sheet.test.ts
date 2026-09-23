import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./risk-event-form-sheet.tsx", import.meta.url), "utf8");

test("risk event drawer keeps its review step as the only confirmation surface", () => {
  assert.doesNotMatch(source, /<p className="mb-1 text-xs font-medium uppercase tracking-\[0\.6px\] text-muted-foreground">Catat Kejadian Risiko<\/p>/);
  assert.doesNotMatch(source, /<div className="rounded-lg bg-muted\/40 p-4 text-sm text-secondary-foreground">\s*Setelah disimpan,/);
  assert.match(source, /onClick=\{onConfirm\}>Simpan<\/AccentButton>/);
  assert.doesNotMatch(source, /AlertDialog/);
  assert.doesNotMatch(source, /Periksa sebelum disimpan/);
  assert.doesNotMatch(source, /Simpan permanen/);
  assert.match(source, /onConfirm=\{\(\) => \{ void submit\(\); \}\}/);
});

test("risk event steps use separate content inside a stable drawer shell", () => {
  assert.match(source, /function RiskEventStepDrawer\(/);
  assert.doesNotMatch(source, /<RiskEventStepDrawer\s+key=\{step\}/);
  assert.match(source, /const stepContent = step === 0/);
  assert.doesNotMatch(source, /step === 0 \? "block" : "hidden"/);
});

test("review summary stays borderless inside the drawer", () => {
  assert.match(source, /<section className="space-y-4" aria-labelledby="risk-event-review">[\s\S]*<div className="rounded-lg bg-card p-4">/);
  assert.doesNotMatch(source, /rounded-lg border border-border\/70 bg-card p-4/);
});

test("risk and additional details are separate steps in the stable drawer", () => {
  assert.doesNotMatch(source, /function RiskEventContextDrawer\(/);
  assert.doesNotMatch(source, /contextDrawer/);
  assert.match(source, /title: "Risiko terkait"/);
  assert.match(source, /title: "Detail tambahan"/);
  assert.match(source, /step === 3 \? \(/);
  assert.match(source, /risk-event-details/);
});

test("risk event drawer checks the supplied initial risk", () => {
  assert.match(
    source,
    /useState<string\[\]>\(initialRiskId \? \[initialRiskId\] : \[\]\)/,
  );
  assert.match(
    source,
    /useEffect\(\(\) => \{ if \(initialRiskId\) setRiskIds\(\[initialRiskId\]\); \}, \[initialRiskId\]\)/,
  );
});
