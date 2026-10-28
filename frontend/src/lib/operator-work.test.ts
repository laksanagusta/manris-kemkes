import assert from "node:assert/strict";
import test from "node:test";
const { deadlineLabel, sectionHref, isWorkSection, readWorkUIState, continueMonitoringNavigation } = await import(new URL("./operator-work.ts", import.meta.url).href);

test("deadline labels use calendar dates, including year rollover", () => {
 assert.equal(deadlineLabel("2027-01-01","2026-12-31"),"Tersisa 1 hari");
 assert.equal(deadlineLabel("2026-10-28","2026-10-28"),"Jatuh tempo hari ini");
 assert.equal(deadlineLabel("2026-10-26","2026-10-28"),"Terlambat 2 hari");
 assert.equal(deadlineLabel("","2026-10-28"),"");
});
test("full list routes use native entity filters",()=>{
 assert.equal(sectionHref("reports"),"/compliance/penanganan");
 assert.equal(sectionHref("monitoring"),"/compliance/monitoring?status=in_progress");
 assert.equal(sectionHref("drafts"),"/risk/register?status=draft");
 assert.equal(isWorkSection("reports"),true);
 assert.equal(isWorkSection("other"),false);
});
test("UI restoration validates only disclosure and scroll; malformed or domain data is ignored",()=>{
 assert.deepEqual(readWorkUIState(null),{open:{reports:true,monitoring:true,drafts:true},scrollY:0});
 assert.deepEqual(readWorkUIState('{"open":{"reports":false,"drafts":false},"scrollY":120,"items":[{"title":"private"}]}'),{open:{reports:false,monitoring:true,drafts:false},scrollY:120});
 assert.equal(readWorkUIState('{"scrollY":-4}').scrollY,0);
 assert.equal(readWorkUIState("broken").open.reports,true);
});


test("an abandoned monitoring request never redirects the new page or account", async()=>{
 let finish!: (value: {monitoring:{id:string}})=>void;
 const pending = new Promise<{monitoring:{id:string}}>(resolve=>{finish=resolve;});
 let current=true;
 const routes:string[]=[];
 const completion=continueMonitoringNavigation(pending,()=>current,(path:string)=>routes.push(path));
 current=false;
 finish({monitoring:{id:"old-id"}});
 await completion;
 assert.deepEqual(routes,[]);
 await continueMonitoringNavigation(Promise.resolve({monitoring:{id:"current-id"}}),()=>true,(path:string)=>routes.push(path));
 assert.deepEqual(routes,["/risk/monitoring/current-id?returnTo=/work"]);
});
