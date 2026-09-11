import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./mitigation-table.tsx", import.meta.url),
  "utf8",
);

test("mitigation plans use the editable five-column table", () => {
  assert.match(source, /<Table className="w-full table-fixed">/);
  assert.match(source, />\s*Rencana Penanganan\s*</);
  assert.match(source, />PIC</);
  assert.match(source, />Tipe</);
  assert.match(source, />Detail</);
  assert.match(source, />\s*Aksi\s*</);
  assert.match(source, /setExpandedRows/);
  assert.match(source, /Tambah Rencana Penanganan/);
  assert.doesNotMatch(source, /<ul className=/);
});
