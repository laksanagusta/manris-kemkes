import assert from "node:assert/strict";
import test from "node:test";
import { buildRiskSummaryWidgets } from "./risk-summary-widgets";
import type { QuarterlyReport, QuarterlyRisk, QuarterlyTask } from "../types/quarterly-report";

const snapshot = (risks: QuarterlyRisk[] = [], tasks: QuarterlyTask[] = []): QuarterlyReport => ({
 cycle: "2026-Q3", comparisonCycle: "2026-Q2", generatedAt: "2026-10-29T02:00:00Z", warnings: [],
 organizations: [{id:"a",name:"Unit A"},{id:"b",name:"Unit B"},{id:"c",name:"Unit C"}],
 risks, previousRisks: [], tasks, events: [],
});
const risk = (id:string, organizationId:string, nilai?:number): QuarterlyRisk => ({id,title:id,organizationId,nilai});
test("classifies profile scores, retains unknowns and ranks every unit with stable ties", () => {
 const data=buildRiskSummaryWidgets(snapshot([
  {...risk("a1","a",20),monitoringObservedNilai:1},risk("a2","a",14.6),risk("b1","b",19),risk("b2","b",16),
  risk("m","a",10),risk("l","a",5),risk("vl","a",1),risk("unknown","b"),
 ]));
 assert.equal(data.total,8); assert.equal(data.highCount,4);
 assert.deepEqual(data.distribution.map(s=>s.count),[1,3,1,1,1,1]);
 assert.deepEqual(data.units.map(u=>[u.id,u.highCount]),[["a",2],["b",2],["c",0]]);
});
test("counts validated reporting, closed missing and skipped without inventing completion", () => {
 const task=(id:string,status:string,extra:object={}):QuarterlyTask=>({id,status,dueDate:"2026-10-28",...extra} as QuarterlyTask);
 const data=buildRiskSummaryWidgets(snapshot([], [
  task("valid","done",{notes:"Laporan progres valid",reportedAt:"2026-10-20T02:00:00Z"}),
  task("legacy","done"),task("missing","not_reported"),task("skip","skipped"),task("pending","pending",{dueDate:"2026-10-30"}),
 ]));
 assert.deepEqual(data.reporting,{total:5,reported:1,overdue:1,pending:1,notReported:1,skipped:1,rate:20});
});
test("zero denominators remain unknown and zero-count units remain in ranking", () => {
 const data=buildRiskSummaryWidgets(snapshot());
 assert.equal(data.reporting.rate,null); assert.equal(data.total,0); assert.equal(data.units.length,3);
 assert.equal(data.distribution.reduce((sum,s)=>sum+s.count,0),0);
});
