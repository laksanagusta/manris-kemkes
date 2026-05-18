import assert from "node:assert/strict";
import test from "node:test";

let signatureLayoutLib: unknown = null;
let signatureLayoutImportError: unknown = null;

try {
  signatureLayoutLib = await import(
    new URL("./working-paper-signature-layout", import.meta.url).href,
  );
} catch (error) {
  signatureLayoutImportError = error;
}

type SignatureLayoutSlot = {
  laneStartCol: number;
  laneEndCol: number;
  textStartCol: number;
  textEndCol: number;
  qrTopLeft: {
    nativeCol: number;
    nativeColOff: number;
  };
  centerUnits: number;
};

function getBuildWorkingPaperSignatureLayout(): (params: {
  startCol: number;
  endCol: number;
  signatureCount: number;
  columnWidths: Map<number, number>;
  qrSizePx: number;
  pxPerColumnWidthUnit: number;
}) => SignatureLayoutSlot[] {
  assert.equal(
    signatureLayoutImportError,
    null,
    "Expected working-paper-signature-layout.ts to exist",
  );

  const buildWorkingPaperSignatureLayout = (
    signatureLayoutLib as {
      buildWorkingPaperSignatureLayout?: unknown;
    }
  ).buildWorkingPaperSignatureLayout;

  assert.equal(
    typeof buildWorkingPaperSignatureLayout,
    "function",
    "Expected working-paper-signature-layout.ts to export buildWorkingPaperSignatureLayout",
  );

  return buildWorkingPaperSignatureLayout as ReturnType<
    typeof getBuildWorkingPaperSignatureLayout
  >;
}

const profileColumnWidths = new Map<number, number>(
  [
    3,
    5,
    40,
    40,
    14,
    6,
    6,
    10,
    10,
    18,
    14,
    45,
    18,
    22,
    6,
    6,
    10,
    10,
    18,
  ].map((width, index) => [index + 1, width]),
);

test("working paper signature layout keeps QR centered under compact signer text", () => {
  const slots = getBuildWorkingPaperSignatureLayout()({
    startCol: 2,
    endCol: 19,
    signatureCount: 2,
    columnWidths: profileColumnWidths,
    qrSizePx: 75,
    pxPerColumnWidthUnit: 7.5,
  });

  assert.equal(slots.length, 2);
  assert.deepEqual(
    slots.map((slot) => [slot.laneStartCol, slot.laneEndCol]),
    [
      [2, 10],
      [11, 19],
    ],
  );
  assert.deepEqual(
    slots.map((slot) => [slot.textStartCol, slot.textEndCol]),
    [
      [4, 8],
      [13, 17],
    ],
  );

  for (const slot of slots) {
    const qrLeftUnits = (
      Array.from({ length: slot.qrTopLeft.nativeCol }, (_, index) => index + 1)
        .reduce((sum, col) => sum + (profileColumnWidths.get(col) ?? 8.43), 0)
    ) + (slot.qrTopLeft.nativeColOff / 10000);
    const qrCenterUnits = qrLeftUnits + (75 / 7.5 / 2);

    assert.ok(
      Math.abs(qrCenterUnits - slot.centerUnits) < 0.01,
      `expected QR center ${qrCenterUnits} to match text center ${slot.centerUnits}`,
    );
  }
});

test("working paper signature layout stays inside narrow signer lanes", () => {
  const slots = getBuildWorkingPaperSignatureLayout()({
    startCol: 2,
    endCol: 17,
    signatureCount: 4,
    columnWidths: profileColumnWidths,
    qrSizePx: 75,
    pxPerColumnWidthUnit: 7.5,
  });

  assert.deepEqual(
    slots.map((slot) => [slot.textStartCol, slot.textEndCol]),
    [
      [2, 5],
      [6, 9],
      [10, 13],
      [14, 17],
    ],
  );
  assert.ok(
    slots.every(
      (slot) =>
        slot.textStartCol >= slot.laneStartCol &&
        slot.textEndCol <= slot.laneEndCol,
    ),
  );
});
