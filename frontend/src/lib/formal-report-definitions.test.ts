import test from "node:test";
import assert from "node:assert/strict";

import {
  formalReportDefinitions,
  formalReportTypeLabels,
} from "./formal-report-definitions";

test("formal report definitions include monitoring evaluation", () => {
  const item = formalReportDefinitions.find(
    (definition) => definition.reportType === "monitoring_evaluation_report",
  );

  assert.ok(item, "expected monitoring evaluation definition to exist");
  assert.equal(item?.title, "Laporan Monitoring & Evaluasi MR");
  assert.equal(
    formalReportTypeLabels.monitoring_evaluation_report,
    "Laporan Monitoring & Evaluasi MR",
  );
});
