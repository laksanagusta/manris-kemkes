"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, RefreshCw } from "@/components/shared/icons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { agentValue, safeAgentHref } from "@/lib/agent-helpers";
import type { AgentWidget as Widget, AgentWidgetAction } from "@/types/agent";
import { AgentComparison, AgentPriorities, AgentResponseActions, AgentRiskCard } from "./agent-response-components";

interface Props { widget: Widget; onRefresh?: (widget: Widget) => void; onClarify?: (value: string) => void; onAction?: (action: AgentWidgetAction) => void; disabled?: boolean }
const supportedTypes = new Set(["table", "metrics", "bar_chart", "document", "clarification", "risk_detail", "priority_list", "period_comparison"]);
export function AgentWidget({ widget, onRefresh, onClarify, onAction, disabled }: Props) {
  const rows = widget.rows ?? [];
  const columns = (widget.columns ?? []).filter((column) => column.key !== "href");
  const bars = rows.map((row) => ({ label: agentValue(row.label ?? row.name ?? row[columns[0]?.key]), value: Number(row.value ?? row.count ?? row[columns[1]?.key]) })).filter((bar) => Number.isFinite(bar.value) && bar.value >= 0);
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  const missingPayload = (widget.type === "risk_detail" && !widget.risk) || (widget.type === "priority_list" && !widget.priorities) || (widget.type === "period_comparison" && !widget.comparison);
  return <section className="agent-widget" aria-label={widget.title}>
    <div className="agent-widget-heading"><div className="min-w-0"><h3>{widget.title}</h3>{widget.type !== "clarification" && widget.description && <p>{widget.description}</p>}</div>{onRefresh && widget.type !== "clarification" && <Button variant="ghost" size="icon-sm" disabled={disabled} onClick={() => onRefresh(widget)} aria-label={`Perbarui ${widget.title}`} title="Perbarui dengan permintaan baru"><RefreshCw aria-hidden="true" /></Button>}</div>
    {widget.type === "risk_detail" && widget.risk && <AgentRiskCard risk={widget.risk} onAction={onAction} disabled={disabled} />}
    {widget.type === "priority_list" && widget.priorities && <AgentPriorities priorities={widget.priorities} onAction={onAction} disabled={disabled} />}
    {widget.type === "period_comparison" && widget.comparison && <AgentComparison comparison={widget.comparison} />}
    {missingPayload && <p className="agent-widget-empty">Rincian hasil ini belum tersedia. Perbarui hasil untuk membacanya kembali.</p>}
    {!!widget.warnings?.length && <ul className="agent-response-warnings">{widget.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
    <AgentResponseActions actions={widget.actions} onAction={onAction} disabled={disabled} />
    {widget.type === "table" && <div className="agent-table"><Table><TableHeader><TableRow>{columns.map((column) => <TableHead key={column.key}>{column.label}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((row, index) => <TableRow key={`${widget.id}-${index}`}>{columns.map((column, columnIndex) => <TableCell key={column.key}>{columnIndex === 0 && safeAgentHref(row.href) ? <Link href={safeAgentHref(row.href)!} className="agent-source-link">{agentValue(row[column.key])}</Link> : agentValue(row[column.key])}</TableCell>)}</TableRow>)}</TableBody></Table>{!rows.length && <p className="agent-widget-empty">Tidak ada data pada cakupan ini.</p>}</div>}
    {widget.type === "metrics" && <dl className="agent-metrics">{(widget.metrics ?? []).map((metric, index) => <div key={`${metric.label}-${index}`}><dt>{metric.label}</dt><dd>{agentValue(metric.value)}</dd>{metric.description && <p>{metric.description}</p>}</div>)}{!widget.metrics?.length && <p className="agent-widget-empty">Metrik belum tersedia.</p>}</dl>}
    {widget.type === "bar_chart" && <div className="agent-bars">{bars.map((bar, index) => <div key={`${bar.label}-${index}`} className="agent-bar-row"><span>{bar.label}</span><div className="agent-bar-track" aria-hidden="true"><div style={{ width: `${bar.value / max * 100}%` }} /></div><span className="tabular-nums">{bar.value.toLocaleString("id-ID")}</span></div>)}{!bars.length && <p className="agent-widget-empty">Data grafik belum tersedia.</p>}</div>}
    {widget.type === "document" && <div className="agent-document"><FileText className="size-5 shrink-0" aria-hidden="true" /><div className="min-w-0 space-y-3">{rows.map((row, index) => <div key={`${widget.id}-${index}`} className="space-y-1">{Object.entries(row).filter(([key]) => key !== "href").map(([key, value]) => <p key={key}><span className="text-muted-foreground">{columns.find((column) => column.key === key)?.label ?? key}: </span>{agentValue(value)}</p>)}{safeAgentHref(row.href) && <Link href={safeAgentHref(row.href)!} className="agent-source-link">Buka sumber</Link>}</div>)}{!rows.length && <p>Rincian dokumen tersedia pada ringkasan di atas.</p>}</div></div>}
    {widget.type === "clarification" && <div className="agent-clarification"><div className="flex flex-wrap gap-2">{rows.map((row, index) => { const label = agentValue(row.label ?? row.value ?? Object.values(row)[0]); return <Button key={`${widget.id}-${index}`} variant="outline" disabled={disabled || !onClarify} onClick={() => onClarify?.(label)}>{label}</Button>; })}</div></div>}
    {!supportedTypes.has(widget.type) && <div className="agent-widget-fallback"><p>Jenis hasil ini belum didukung oleh versi aplikasi Anda. Data yang tersedia ditampilkan di bawah.</p>{rows.map((row, index) => <dl key={`${widget.id}-${index}`} className="mt-3 space-y-2">{Object.entries(row).filter(([key]) => key !== "href").map(([key, value]) => <div key={key}><dt className="text-muted-foreground">{columns.find((column) => column.key === key)?.label ?? key}</dt><dd className="whitespace-pre-wrap break-words">{agentValue(value)}</dd></div>)}{safeAgentHref(row.href) && <div><dt className="sr-only">Sumber</dt><dd><Link href={safeAgentHref(row.href)!} className="agent-source-link">Buka sumber</Link></dd></div>}</dl>)}{(widget.metrics ?? []).map((metric, index) => <p key={`${metric.label}-${index}`} className="mt-2">{metric.label}: {agentValue(metric.value)}{metric.description ? ` · ${metric.description}` : ""}</p>)}</div>}
  </section>;
}
