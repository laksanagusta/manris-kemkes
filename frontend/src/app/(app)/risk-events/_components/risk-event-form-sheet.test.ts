import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./risk-event-form-sheet.tsx", import.meta.url), "utf8");

test("risk event modal keeps its review step as the only confirmation surface", () => {
  assert.doesNotMatch(source, /<p className="mb-1 text-xs font-medium uppercase tracking-\[0\.6px\] text-muted-foreground">Catat Kejadian Risiko<\/p>/);
  assert.doesNotMatch(source, /<div className="rounded-lg bg-muted\/40 p-4 text-sm text-secondary-foreground">\s*Setelah disimpan,/);
  assert.match(source, /onClick=\{onConfirm\}>Simpan<\/AccentButton>/);
  assert.doesNotMatch(source, /AlertDialog/);
  assert.doesNotMatch(source, /Periksa sebelum disimpan/);
  assert.doesNotMatch(source, /Simpan permanen/);
  assert.match(source, /onConfirm=\{\(\) => \{ void submit\(\); \}\}/);
});

test("risk event steps use separate content inside a stable modal shell", () => {
  assert.match(source, /function RiskEventStepModal\(/);
  assert.doesNotMatch(source, /<RiskEventStepModal\s+key=\{step\}/);
  assert.match(source, /const stepContent = step === 0/);
  assert.match(source, /<Dialog open=\{open\} onOpenChange=\{onOpenChange\}>/);
  assert.match(source, /data-dynamic-height="true"/);
  assert.match(source, /const naturalHeight = modal\.offsetHeight/);
  assert.match(source, /modal\.style\.height = `\$\{targetHeight\}px`/);
  assert.doesNotMatch(source, /<Drawer(?:Content)?\b/);
  assert.doesNotMatch(source, /step === 0 \? "block" : "hidden"/);
});

test("review summary uses the stock card composition inside the modal", () => {
  const review = source.slice(source.indexOf('aria-labelledby="risk-event-review"'), source.indexOf("  return (\n    <RiskEventStepModal", source.indexOf('aria-labelledby="risk-event-review"')));
  assert.match(review, /<Card>\s*<CardContent>\s*<dl/);
  assert.doesNotMatch(review, /rounded-lg bg-muted\/40|rounded-lg border border-border\/70/);
});

test("risk and additional details are separate steps in the stable modal", () => {
  assert.doesNotMatch(source, /function RiskEventContextDrawer\(/);
  assert.doesNotMatch(source, /contextDrawer/);
  assert.match(source, /title: "Risiko terkait"/);
  assert.match(source, /title: "Detail tambahan"/);
  assert.match(source, /step === 3 \? \(/);
  assert.match(source, /risk-event-details/);
});

test("risk event modal checks the supplied initial risk", () => {
  assert.match(
    source,
    /useState<string\[\]>\(initialRiskId \? \[initialRiskId\] : \[\]\)/,
  );
  assert.match(
    source,
    /useEffect\(\(\) => \{ if \(initialRiskId\) setRiskIds\(\[initialRiskId\]\); \}, \[initialRiskId\]\)/,
  );
});
