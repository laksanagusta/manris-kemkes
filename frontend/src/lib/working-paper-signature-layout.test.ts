import assert from "node:assert/strict";
import test from "node:test";

import { buildWorkingPaperSignatureLayout } from "./working-paper-signature-layout";

const profileColumnWidths = [5, 40, 40, 14, 6, 6, 10, 10, 18, 14, 45, 18, 22, 6, 6, 10, 10, 18];

test("signatures start at the left edge and use the same spacing regardless of count", () => {
  const two = buildWorkingPaperSignatureLayout(2, profileColumnWidths, 2);
  const four = buildWorkingPaperSignatureLayout(2, profileColumnWidths, 4);

  assert.deepEqual(two, four.slice(0, 2));
  assert.deepEqual(two, [
    { startCol: 2, endCol: 3, band: 0 },
    { startCol: 4, endCol: 4, band: 0 },
  ]);

  const offsets = four.map(({ startCol }) =>
    profileColumnWidths.slice(0, startCol - 2).reduce((total, width) => total + width, 0),
  );
  assert.ok(offsets.every((offset, index) => Math.abs(offset - index * 45) <= 5));
});

test("additional signatures continue from the left on the next row", () => {
  assert.deepEqual(buildWorkingPaperSignatureLayout(2, [5, 40, 40, 14], 5), [
    { startCol: 2, endCol: 3, band: 0 },
    { startCol: 4, endCol: 5, band: 0 },
    { startCol: 2, endCol: 3, band: 1 },
    { startCol: 4, endCol: 5, band: 1 },
    { startCol: 2, endCol: 3, band: 2 },
  ]);
  assert.deepEqual(buildWorkingPaperSignatureLayout(2, [5], 1), [
    { startCol: 2, endCol: 2, band: 0 },
  ]);
  assert.deepEqual(buildWorkingPaperSignatureLayout(2, profileColumnWidths, 0), []);
});
