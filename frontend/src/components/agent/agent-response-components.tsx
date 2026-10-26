"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "@/components/shared/icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { safeAgentHref } from "@/lib/agent-helpers";
import { getLinearRiskLevelBadgeTone } from "@/lib/linear-status-badge";
import type { AgentPeriodComparison, AgentPriorityList, AgentRiskDetail, AgentWidgetAction } from "@/types/agent";

interface ActionProps { onAction?: (action: AgentWidgetAction) => void; disabled?: boolean }
const levels: Record<string, string> = { sangat_rendah: "Sangat rendah", rendah: "Rendah", sedang: "Sedang", tinggi: "Tinggi", sangat_tinggi: "Sangat tinggi" };
const statuses: Record<string, string> = { draft: "Draf", final: "Final", archived: "Arsip", pending_review: "Menunggu tinjauan", submitted: "Diajukan" };
const number = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? "—" : value.toLocaleString("id-ID");
const dueDate = (value: string) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+07:00`) : new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(date) : "Tanggal belum tersedia";
};

export function AgentResponseActions({ actions, context, onAction, disabled }: ActionProps & { actions?: AgentWidgetAction[]; context?: string }) {
  if (!actions?.length) return null;
  const buttons = actions.map((action, index) => <Button key={`${action.label}-${index}`} type="button" variant="outline" size="sm" disabled={disabled || !onAction} aria-label={context ? `${action.label} untuk ${context}` : action.label} onClick={() => onAction?.(action)}>{action.label}</Button>);
  if (actions.length <= 2) return <div className="agent-response-actions">{buttons}</div>;
  return <div className="agent-response-actions">{buttons[0]}<DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-sm" disabled={disabled || !onAction} aria-label={context ? `Tindakan lainnya untuk ${context}` : "Tindakan lainnya"} title="Tindakan lainnya"><MoreHorizontal aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent align="start">{actions.slice(1).map((action, index) => <DropdownMenuItem key={`${action.label}-${index}`} disabled={disabled || !onAction} onSelect={() => onAction?.(action)}>{action.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></div>;
}

function RiskHeading({ risk }: { risk: AgentRiskDetail }) {
  const href = safeAgentHref(risk.href);
  const level = levels[risk.level];
  return <div className="agent-risk-heading"><div className="min-w-0"><div className="agent-risk-code">{href ? <Link href={href} className="agent-response-link">{risk.code || "Buka risiko"}</Link> : <span>{risk.code}</span>}{risk.cycle && <span>{risk.cycle}</span>}</div><h4>{risk.title}</h4></div><div className="agent-risk-badges"><span className="agent-risk-score" aria-label={`Nilai risiko: ${risk.score == null ? "belum tersedia" : risk.score}`}>{number(risk.score)}</span>{level && <Badge variant={getLinearRiskLevelBadgeTone(level)}>{level}</Badge>}<Badge variant="secondary">{statuses[risk.status] || risk.status || "Status belum tersedia"}</Badge></div></div>;
}

function DetailList({ label, values }: { label: string; values?: string[] }) {
  const available = values?.filter((value) => value.trim());
  return <div><dt>{label}</dt><dd>{available?.length ? <ul>{available.map((value, index) => <li key={index}>{value}</li>)}</ul> : "Belum tersedia."}</dd></div>;
}

export function AgentRiskCard({ risk, onAction, disabled }: ActionProps & { risk: AgentRiskDetail }) {
  return <div className="agent-risk-card"><RiskHeading risk={risk} />
    {risk.score == null && <p className="agent-response-note">Nilai risiko belum tersedia.</p>}
    <AgentResponseActions actions={risk.actions} context={risk.code} onAction={onAction} disabled={disabled} />
    <details className="agent-risk-details"><summary>Lihat rincian<span className="sr-only"> {risk.code}</span></summary><dl className="agent-risk-details-content"><DetailList label="Penyebab" values={risk.causes} /><DetailList label="Dampak" values={risk.impacts} /><div><dt>Pengendalian</dt><dd>{risk.control?.trim() || "Belum tersedia."}</dd></div><div><dt>Rencana mitigasi</dt><dd>{risk.mitigations?.length ? <ul>{risk.mitigations.map((mitigation, index) => <li key={index}><p>{mitigation.action}</p><p className="agent-response-note">{mitigation.owner || "PIC belum tersedia"} · {mitigation.dueDate ? dueDate(mitigation.dueDate) : "Tenggat belum tersedia"}</p></li>)}</ul> : "Belum ada rencana mitigasi tersimpan."}</dd></div></dl></details>
  </div>;
}

export function AgentPriorities({ priorities, onAction, disabled }: ActionProps & { priorities: AgentPriorityList }) {
  if (!priorities.items.length) return <p className="agent-widget-empty">{priorities.total > 0 ? "Tidak ada hasil pada halaman ini." : "Tidak ada risiko tinggi atau sangat tinggi maupun tugas mitigasi terlambat pada cakupan dan periode ini."}</p>;
  return <ol className="agent-priority-list" start={(priorities.page - 1) * priorities.limit + 1} aria-label="Risiko menurut prioritas">{priorities.items.map((item) => <li key={item.risk.id}>
    <RiskHeading risk={item.risk} />
    <p className="agent-response-note">{item.risk.score == null ? "Nilai risiko belum tersedia. " : ""}{item.overdueCount > 0 ? `${number(item.overdueCount)} tugas terlambat · paling lama ${number(item.overdueDays)} hari` : "Tidak ada tugas terlambat."}</p>
    {item.tasks.length > 0 && <ul className="agent-priority-tasks">{item.tasks.map((task) => <li key={task.id}><p>{safeAgentHref(task.href) ? <Link className="agent-response-link" href={safeAgentHref(task.href)!}>{task.action || "Buka tugas mitigasi"}</Link> : task.action}</p><p className="agent-response-note">{task.owner || "PIC belum tersedia"} · Tenggat {dueDate(task.dueDate)}</p></li>)}</ul>}
    {item.overdueCount > item.tasks.length && <p className="agent-response-note">Menampilkan {item.tasks.length} dari {number(item.overdueCount)} tugas terlambat. Lihat mitigasi untuk rincian lainnya.</p>}
    <AgentResponseActions actions={item.risk.actions} context={item.risk.code} onAction={onAction} disabled={disabled} />
  </li>)}</ol>;
}

export function AgentComparison({ comparison }: { comparison: AgentPeriodComparison }) {
  const missing = comparison.rows.some((row) => row.current == null || row.previous == null);
  return <div className="agent-comparison"><div className="agent-table"><Table><TableHeader><TableRow><TableHead scope="col">Metrik</TableHead><TableHead scope="col" className="text-right">{comparison.comparisonCycle}</TableHead><TableHead scope="col" className="text-right">{comparison.cycle}</TableHead><TableHead scope="col" className="text-right">Perubahan</TableHead></TableRow></TableHeader><TableBody>{comparison.rows.map((row, index) => <TableRow key={`${row.label}-${index}`}><TableCell className="font-medium">{row.label}</TableCell><TableCell className="text-right tabular-nums">{number(row.previous)}</TableCell><TableCell className="text-right tabular-nums">{number(row.current)}</TableCell><TableCell className="text-right tabular-nums">{row.delta == null ? "—" : `${row.delta > 0 ? "+" : ""}${number(row.delta)}`}</TableCell></TableRow>)}</TableBody></Table></div>
    {missing && <p className="agent-response-note">— berarti data belum tersedia lengkap. Selisih dihitung hanya saat kedua nilai tersedia.</p>}
    {!!comparison.warnings?.length && <ul className="agent-response-warnings">{comparison.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
    {safeAgentHref(comparison.href) && <Link className="agent-source-link agent-report-source" href={safeAgentHref(comparison.href)!}>Buka laporan periode ini</Link>}
  </div>;
}
