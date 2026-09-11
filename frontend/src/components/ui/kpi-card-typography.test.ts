import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const kpiCard = readFileSync(new URL("./kpi-card.tsx", import.meta.url), "utf8");

test("KPI card labels use zero letter spacing across all tones", () => {
  assert.strictEqual((kpiCard.match(/tracking-normal/g) ?? []).length, 4);
  assert.doesNotMatch(kpiCard, /tracking-\[0\.6px\]/);
  assert.doesNotMatch(kpiCard, /tracking-\[0\.14em\]/);
});

test("KPI cards use the updated dashboard type scale and height", () => {
  assert.strictEqual((kpiCard.match(/text-\[13px\]/g) ?? []).length, 4);
  assert.strictEqual((kpiCard.match(/text-\[28px\]/g) ?? []).length, 4);
  assert.strictEqual((kpiCard.match(/min-h-\[100px\]/g) ?? []).length, 4);
  assert.strictEqual((kpiCard.match(/px-5 py-5/g) ?? []).length, 4);
  assert.doesNotMatch(kpiCard, /uppercase/);
});
