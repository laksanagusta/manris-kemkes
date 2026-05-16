export type SignatureImageTopLeft = {
  nativeCol: number;
  nativeColOff: number;
};

export type WorkingPaperSignatureLayoutSlot = {
  laneStartCol: number;
  laneEndCol: number;
  textStartCol: number;
  textEndCol: number;
  qrTopLeft: SignatureImageTopLeft;
  centerUnits: number;
};

type BuildWorkingPaperSignatureLayoutParams = {
  startCol: number;
  endCol: number;
  signatureCount: number;
  columnWidths: Map<number, number>;
  qrSizePx: number;
  pxPerColumnWidthUnit: number;
  maxTextColumnSpan?: number;
};

const DEFAULT_COLUMN_WIDTH = 8.43;
const DEFAULT_MAX_TEXT_COLUMN_SPAN = 5;

function getColumnWidth(columnWidths: Map<number, number>, col: number): number {
  return columnWidths.get(col) ?? DEFAULT_COLUMN_WIDTH;
}

function getUnitsBeforeColumn(columnWidths: Map<number, number>, col: number): number {
  let units = 0;
  for (let c = 1; c < col; c++) {
    units += getColumnWidth(columnWidths, c);
  }
  return units;
}

function getRangeUnits(columnWidths: Map<number, number>, startCol: number, endCol: number): number {
  let units = 0;
  for (let c = startCol; c <= endCol; c++) {
    units += getColumnWidth(columnWidths, c);
  }
  return units;
}

function toNativeColumnTopLeft(
  columnWidths: Map<number, number>,
  leftUnits: number,
  maxCol: number,
): SignatureImageTopLeft {
  let remainingUnits = Math.max(0, leftUnits);

  for (let col = 1; col <= maxCol; col++) {
    const width = getColumnWidth(columnWidths, col);
    if (remainingUnits < width) {
      return {
        nativeCol: col - 1,
        nativeColOff: Math.round(remainingUnits * 10000),
      };
    }
    remainingUnits -= width;
  }

  return {
    nativeCol: Math.max(0, maxCol - 1),
    nativeColOff: Math.round(getColumnWidth(columnWidths, maxCol) * 10000),
  };
}

export function buildWorkingPaperSignatureLayout({
  startCol,
  endCol,
  signatureCount,
  columnWidths,
  qrSizePx,
  pxPerColumnWidthUnit,
  maxTextColumnSpan = DEFAULT_MAX_TEXT_COLUMN_SPAN,
}: BuildWorkingPaperSignatureLayoutParams): WorkingPaperSignatureLayoutSlot[] {
  if (signatureCount <= 0 || endCol < startCol) {
    return [];
  }

  const totalColumns = endCol - startCol + 1;
  const columnsPerSignature = Math.max(1, Math.floor(totalColumns / signatureCount));
  const qrHalfWidthUnits = (qrSizePx / pxPerColumnWidthUnit) / 2;

  return Array.from({ length: signatureCount }, (_, index) => {
    const laneStartCol = startCol + (index * columnsPerSignature);
    const laneEndCol = index === signatureCount - 1
      ? endCol
      : Math.min(endCol, laneStartCol + columnsPerSignature - 1);
    const laneColumnCount = laneEndCol - laneStartCol + 1;
    const textColumnSpan = Math.min(maxTextColumnSpan, laneColumnCount);
    const laneMidCol = (laneStartCol + laneEndCol) / 2;
    const textStartCol = Math.max(
      laneStartCol,
      Math.min(
        laneEndCol - textColumnSpan + 1,
        Math.round(laneMidCol - ((textColumnSpan - 1) / 2)),
      ),
    );
    const textEndCol = textStartCol + textColumnSpan - 1;
    const centerUnits = getUnitsBeforeColumn(columnWidths, textStartCol) +
      (getRangeUnits(columnWidths, textStartCol, textEndCol) / 2);

    return {
      laneStartCol,
      laneEndCol,
      textStartCol,
      textEndCol,
      qrTopLeft: toNativeColumnTopLeft(
        columnWidths,
        centerUnits - qrHalfWidthUnits,
        endCol,
      ),
      centerUnits,
    };
  });
}
