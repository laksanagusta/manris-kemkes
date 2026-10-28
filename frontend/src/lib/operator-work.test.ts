import assert from "node:assert/strict";
import test from "node:test";
const { deadlineLabel, sectionHref, isWorkSection, readWorkUIState, continueMonitoringNavigation, getWorkReturnLink } = await import(new URL("./operator-work.ts", import.meta.url).href);

test("deadline labels use calendar dates, including year rollover", () => {
 assert.equal(deadlineLabel("2027-01-01","2026-12-31"),"Tersisa 1 hari");
 assert.equal(deadlineLabel("2026-10-28","2026-10-28"),"Jatuh tempo hari ini");
 assert.equal(deadlineLabel("2026-10-26","2026-10-28"),"Terlambat 2 hari");
 assert.equal(deadlineLabel("","2026-10-28"),"");
});
test("full list routes use native entity filters",()=>{
 assert.equal(sectionHref("reports"),"/compliance/penanganan?status=needs_reporting");
 assert.equal(sectionHref("monitoring",new Date("2026-10-15T00:00:00Z")),"/risk/register?assessment_cycle=2026-Q3&monitoring_status=not_monitored");
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
 assert.deepEqual(routes,["/risk/monitoring/current-id?returnTo=%2Fwork"]);
});


test("monitoring started from its native table preserves filters and safe return links",async()=>{
 const returnTo="/compliance/monitoring?status=needs_monitoring&q=distribution&cycle=2026-Q3&page=2";
 const routes:string[]=[];
 await continueMonitoringNavigation(Promise.resolve({monitoring:{id:"next"}}),()=>true,(path:string)=>routes.push(path),returnTo);
 assert.equal(new URL(routes[0],"http://local").searchParams.get("returnTo"),returnTo);
 assert.deepEqual(getWorkReturnLink(returnTo),{href:returnTo,label:"Kembali ke pemantauan"});
 assert.deepEqual(getWorkReturnLink("/work"),{href:"/work",label:"Kembali ke pekerjaan"});
 assert.deepEqual(getWorkReturnLink("/risk/register?assessment_cycle=2026-Q3&monitoring_status=not_monitored"),{href:"/risk/register?assessment_cycle=2026-Q3&monitoring_status=not_monitored",label:"Kembali ke risiko"});
 for(const value of ["https://evil.test","//evil.test","/login","/work/other"])assert.equal(getWorkReturnLink(value),null);
});
