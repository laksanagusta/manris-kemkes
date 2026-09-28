import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";
// Transpile the production module for Node; browser bundlers resolve extensionless imports.
const source = await readFile(
  new URL("./quarterly-report-export.ts", import.meta.url),
  "utf8",
);
const require = createRequire(import.meta.url);
const compiled = ts
  .transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  })
  .outputText.replace(
    '"./quarterly-report"',
    JSON.stringify(new URL("./quarterly-report.ts", import.meta.url).href),
  )
  .replace(
    '"exceljs"',
    JSON.stringify(pathToFileURL(require.resolve("exceljs")).href),
  );
const { createQuarterlyReportWorkbook } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

test("XLSX keeps all five scoped sheets, empty-unit blanks and plain-text formulas", async () => {
  const report = {
    cycle: "2026-Q1",
    comparisonCycle: "2025-Q4",
    generatedAt: "2026-04-02T00:00:00Z",
    warnings: ["Riwayat belum lengkap"],
    organizations: [
      { id: "u1", name: "=SUM(A1:A2)" },
      { id: "u2", name: "Tanpa data" },
    ],
    risks: [{ id: "r1", title: "=1+1", organizationId: "u1", nilai: 12 }],
    previousRisks: [],
    tasks: [],
    events: [],
  };
  const workbook = await createQuarterlyReportWorkbook(report);
  assert.deepEqual(
    workbook.worksheets.map((sheet) => sheet.name),
    ["Ringkasan", "Perbandingan unit", "Risiko", "Tugas mitigasi", "Kejadian"],
  );
  const buffer = await workbook.xlsx.writeBuffer();
  const { default: ExcelJS } = await import("exceljs");
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(buffer);
  assert.equal(loaded.getWorksheet("Risiko").getCell("A2").value, "=1+1");
  assert.equal(
    loaded.getWorksheet("Perbandingan unit").getCell("C3").value,
    null,
  );
  assert.equal(loaded.getWorksheet("Risiko").getCell("J2").value, null);
  assert.equal(loaded.getWorksheet("Ringkasan").getCell("B2").value, "2026-Q1");
});
