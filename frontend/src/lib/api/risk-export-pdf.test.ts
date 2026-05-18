import test from "node:test";
import assert from "node:assert/strict";

import { buildRiskDetailPDFFilename } from "../risk-export-pdf-utils";

test("buildRiskDetailPDFFilename prefers risk code", () => {
  assert.equal(
    buildRiskDetailPDFFilename({ code: "RISK-001", id: "abc" }),
    "lampiran-risiko-RISK-001.pdf",
  );
});

test("buildRiskDetailPDFFilename falls back to id", () => {
  assert.equal(
    buildRiskDetailPDFFilename({ id: "1234-5678" }),
    "lampiran-risiko-1234-5678.pdf",
  );
});
