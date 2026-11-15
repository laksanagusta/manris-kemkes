import assert from 'node:assert/strict';
import test from 'node:test';
const { riskTransactionKind, riskTransactionLabel }=await import(new URL('./risk-transaction-kind.ts',import.meta.url).href);
test('explicit transaction kind wins and legacy modes remain recognizable',()=>{
 assert.equal(riskTransactionKind({transactionKind:'revision',mode:'score_only'}),'revision');
 assert.equal(riskTransactionKind({mode:'with_profile_revision'}),'revision');
 assert.equal(riskTransactionKind({mode:'score_only'}),'monitoring');
 assert.equal(riskTransactionLabel({transactionKind:'initial'}),'Penilaian awal');
});
