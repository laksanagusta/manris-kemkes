type SignatureSlot = {
  startCol: number;
  endCol: number;
  band: number;
};

const SIGNATURE_SPACING = 45;

export function buildWorkingPaperSignatureLayout(
  startCol: number,
  columnWidths: readonly number[],
  signatureCount: number,
): SignatureSlot[] {
  if (!signatureCount || columnWidths.length === 0) return [];

  const columnOffsets = [0];
  for (const width of columnWidths) {
    columnOffsets.push(columnOffsets[columnOffsets.length - 1] + width);
  }
  const totalWidth = columnOffsets[columnWidths.length];
  const slotsPerBand = Math.max(1, Math.min(columnWidths.length, Math.floor(totalWidth / SIGNATURE_SPACING)));

  const starts = [0];
  for (let slot = 1; slot < slotsPerBand; slot++) {
    const target = slot * SIGNATURE_SPACING;
    // Use the closest cell boundary to each equally spaced target.
    let column = starts[slot - 1] + 1;
    const lastPossibleColumn = columnWidths.length - (slotsPerBand - slot);
    while (
      column < lastPossibleColumn &&
      Math.abs(columnOffsets[column + 1] - target) < Math.abs(columnOffsets[column] - target)
    ) {
      column++;
    }
    starts.push(column);
  }
  starts.push(columnWidths.length);

  return Array.from({ length: signatureCount }, (_, index) => {
    const slot = index % slotsPerBand;
    return {
      startCol: startCol + starts[slot],
      endCol: startCol + starts[slot + 1] - 1,
      band: Math.floor(index / slotsPerBand),
    };
  });
}
