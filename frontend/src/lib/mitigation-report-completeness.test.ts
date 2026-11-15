import assert from 'node:assert/strict';import test from 'node:test';
const {hasReportedMitigation,getMitigationReportLabel}=await import(new URL('./mitigation-report-status.ts',import.meta.url).href);
test('not executed with a substantive reason is a complete report',()=>{
 assert.equal(hasReportedMitigation({status:'skipped',reportedAt:'2026-11-14',notes:'Pelaksanaan menunggu alokasi anggaran.'}),true);
 assert.equal(getMitigationReportLabel({status:'skipped',reportedAt:'2026-11-14',notes:'Pelaksanaan menunggu alokasi anggaran.'}),'Belum dilaksanakan · Dilaporkan');
 assert.equal(hasReportedMitigation({status:'skipped',reportedAt:'2026-11-14',notes:''}),false);
});
