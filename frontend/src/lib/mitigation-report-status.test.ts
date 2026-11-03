import assert from "node:assert/strict";
import test from "node:test";
const {getMitigationReportLabel}=await import(new URL("./mitigation-report-status.ts",import.meta.url).href);
test("report completion means reported, not activity completion",()=>{
 assert.equal(getMitigationReportLabel({status:"done",reportedAt:"2026-10-01",notes:"Kegiatan belum dapat terlaksana."}),"Sudah dilaporkan");
 assert.equal(getMitigationReportLabel({status:"done",notes:""}),"Laporan belum lengkap");
});
test("unreported outcomes remain distinct",()=>{
 for(const [status,label] of [["pending","Belum dilaporkan"],["overdue","Terlambat"],["not_reported","Tidak dilaporkan"],["skipped","Dilewati"]])assert.equal(getMitigationReportLabel({status}),label);
});
