import type { QuarterlyReport } from "../types/quarterly-report";
import { buildQuarterlyRiskRows, profileNilai, reportTaskState } from "./quarterly-report";
import { getRiskLevelFromNilai } from "./risk";

const levels = [
 {key:"sangat_tinggi",label:"Sangat tinggi",color:"var(--color-red-500)"},
 {key:"tinggi",label:"Tinggi",color:"var(--color-orange-500)"},
 {key:"sedang",label:"Sedang",color:"var(--color-yellow-400)"},
 {key:"rendah",label:"Rendah",color:"var(--color-green-500)"},
 {key:"sangat_rendah",label:"Sangat rendah",color:"var(--color-green-400)"},
 {key:"unknown",label:"Belum dinilai",color:"var(--muted-foreground)"},
] as const;

/** Counts effective profiles only; observations and incident severity are separate evidence. */
export function buildRiskSummaryWidgets(report: QuarterlyReport) {
 const distribution = levels.map(level=>({...level,count:0}));
 const units = report.organizations.map(unit=>({...unit,highCount:0}));
 const byUnit = new Map(units.map(unit=>[unit.id,unit]));
 let highCount=0;
 for (const risk of report.risks) {
  const score=profileNilai(risk);
  const key=score===null ? "unknown" : getRiskLevelFromNilai(score);
  distribution.find(level=>level.key===key)!.count++;
  if(key==="tinggi" || key==="sangat_tinggi") {
   highCount++;
   const unit=byUnit.get(risk.organizationId);
   if(unit) unit.highCount++;
  }
 }
 units.sort((a,b)=>b.highCount-a.highCount || a.name.localeCompare(b.name,"id") || a.id.localeCompare(b.id));
 const counts={reported:0,overdue:0,pending:0,not_reported:0,skipped:0};
 for(const task of report.tasks) counts[reportTaskState(task,report.cycle,report.generatedAt)]++;
 return {total:report.risks.length,highCount,distribution,units,reporting:{
  total:report.tasks.length,reported:counts.reported,overdue:counts.overdue,pending:counts.pending,
  notReported:counts.not_reported,skipped:counts.skipped,
  rate:report.tasks.length ? counts.reported/report.tasks.length*100 : null,
 }};
}

/** Compare each Final observation with its own valid target in the selected cycle. */
export function buildRiskTargetGap(report: QuarterlyReport) {
 const categories = [
  { key: "above", label: "Di atas target", count: 0, fill: "var(--color-orange-500)" },
  { key: "equal", label: "Tepat target", count: 0, fill: "var(--color-violet-400)" },
  { key: "below", label: "Di bawah target", count: 0, fill: "var(--color-green-500)" },
  { key: "unavailable", label: "Belum dapat dibandingkan", count: 0, fill: "var(--muted-foreground)" },
 ];
 for (const row of buildQuarterlyRiskRows(report)) {
  const gap = row.observed === null || row.target === null
   ? null : Math.round((row.observed - row.target) * 100);
  const key = gap === null ? "unavailable" : gap > 0 ? "above" : gap < 0 ? "below" : "equal";
  categories.find(category => category.key === key)!.count++;
 }
 const unavailable = categories[3].count;
 return { categories, total: report.risks.length, comparable: report.risks.length - unavailable };
}
