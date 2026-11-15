import assert from 'node:assert/strict';
import test from 'node:test';
const { progressPercent, periodWindowState, periodColumns } = await import(new URL('./profile-period-progress.ts', import.meta.url).href);
test('progress clamps malformed counts, does not invent a denominator or round unfinished work to 100', () => {
  assert.equal(progressPercent({completed: 2,total:4}),50);
  assert.equal(progressPercent({completed: 0,total:0}),null);
  assert.equal(progressPercent({completed: 1,total:0}),null);
  assert.equal(progressPercent({completed: -2,total:4}),0);
  assert.equal(progressPercent({completed: 9,total:4}),100);
  assert.equal(progressPercent({completed: 999,total:1000}),99);
  assert.equal(progressPercent({completed: NaN,total:4}),null);
});
test('inclusive Jakarta dates support next year and midnight boundaries', () => {
  const p={opensOn:'2028-01-01',closesOn:'2028-01-15'};
  assert.equal(periodWindowState(p,new Date('2027-12-31T16:59:59Z')),'upcoming');
  assert.equal(periodWindowState(p,new Date('2027-12-31T17:00:00Z')),'open');
  assert.equal(periodWindowState(p,new Date('2028-01-15T16:59:59Z')),'open');
  assert.equal(periodWindowState(p,new Date('2028-01-15T17:00:00Z')),'closed');
});
test('mixed frequencies produce stable ordinal columns rather than equating different periods', () => {
 const col=(label:string,ordinal:number)=>({label,ordinal});
 assert.deepEqual(periodColumns([[col('Semester II',2),col('Semester I',1)],[col('Kuartal I',1),col('Semester I',1)]]),['Kuartal I','Semester I','Semester II']);
});
test('observation defaults to monitored period end rather than the submission month', async () => {
 const { periodObservationDate } = await import(new URL('./profile-period-progress.ts', import.meta.url).href);
 assert.equal(periodObservationDate({year:2027,frequency:'quarterly'},{ordinal:1},'2027-04-10'),'2027-03-31');
 assert.equal(periodObservationDate({year:2027,frequency:'semester'},{ordinal:2},'2028-01-10'),'2027-12-31');
 assert.equal(periodObservationDate({year:2028,frequency:'monthly'},{ordinal:2},'2028-03-10'),'2028-02-29');
 assert.equal(periodObservationDate({year:2027,frequency:'quarterly'},{ordinal:2},'2027-05-10'),'2027-05-10');
});
