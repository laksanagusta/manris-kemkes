import test from "node:test";import assert from "node:assert/strict";
const {isMonitoringWindowOpen,getMonitoringWindow}=await import(new URL("./monitoring-window.ts",import.meta.url).href);
test("monitoring closes after first next-quarter month in Jakarta",()=>{
 for(const [cycle,at,want] of [
 ["2026-Q3","2026-09-30T16:59:59Z",false],["2026-Q3","2026-09-30T17:00:00Z",true],
 ["2026-Q3","2026-10-31T16:59:59Z",true],["2026-Q3","2026-10-31T17:00:00Z",false],
 ["2026-Q4","2026-12-31T17:00:00Z",true],["2026-Q4","2027-01-31T17:00:00Z",false],
 ] as const)assert.equal(isMonitoringWindowOpen(cycle,new Date(at)),want);
 assert.equal(getMonitoringWindow("2026-Q5"),null);
});
