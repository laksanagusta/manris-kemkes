"use client";
import Link from "next/link";
import type { RiskEventNote } from "@/types/risk-event";
import { getMitigationReportLabel } from "@/lib/mitigation-report-status";
import { ActionButton } from "../actions/action-button";

export type MonitoringEvidenceResult = {
  final: boolean;
  evidence: null | {
    capturedAt: string; title: string; sourceScore: number; targetScore: number;
    reports: { id: string; action: string; status: string; notes: string; evidenceUrl: string; reportedAt?: string }[];
    events: { id: string; code: string; description: string; occurredAt: string; notes: RiskEventNote[] }[];
  };
};
export function MonitoringEvidence({ result, loading, error, onRefresh }: { result: MonitoringEvidenceResult | null; loading?: boolean; error?: string; onRefresh?: () => void }) {
  const evidence = result?.evidence;
  return <details className="rounded-xl border border-border bg-card p-4">
    <summary className="cursor-pointer text-sm font-medium">Bukti periode ini</summary>
    <div className="mt-4 space-y-4 text-sm">
      {loading ? <p role="status" className="text-muted-foreground">Memuat bukti…</p> : error ? <div role="alert" className="space-y-2"><p>{error}</p><ActionButton onClick={onRefresh}>Coba lagi</ActionButton></div> : !evidence ? <p className="text-muted-foreground">Bukti saat finalisasi belum tersedia.</p> : <>
        <p className="text-xs text-muted-foreground">{result?.final ? "Bukti saat finalisasi" : "Data diambil"} · {new Intl.DateTimeFormat("id-ID", { dateStyle:"medium", timeStyle:"short", timeZone:"Asia/Jakarta" }).format(new Date(evidence.capturedAt))}</p>
        <div className="space-y-1"><h3 className="font-medium">{evidence.title}</h3><p>Skor sebelumnya {evidence.sourceScore > 0 ? Math.round(evidence.sourceScore) : "—"} · Target {evidence.targetScore > 0 ? Math.round(evidence.targetScore) : "Belum ditetapkan"}</p></div>
        <section className="space-y-2"><h3 className="font-medium">Pelaksanaan mitigasi</h3>{evidence.reports.length ? <ul className="space-y-3">{evidence.reports.map(report => <li key={report.id} className="space-y-1"><p>{report.action} · <span className="text-muted-foreground">{getMitigationReportLabel(report)}</span></p><p className="whitespace-pre-wrap break-words text-muted-foreground">{report.notes || "Belum ada catatan pelaksanaan."}</p>{report.evidenceUrl.split(/\r?\n/).filter(url => /^https?:\/\//i.test(url.trim())).map(url => <a key={url} href={url.trim()} target="_blank" rel="noopener noreferrer" className="block text-sm underline">Buka bukti</a>)}</li>)}</ul> : <p className="text-muted-foreground">Belum ada laporan mitigasi pada periode ini.</p>}</section>
        <section className="space-y-2"><h3 className="font-medium">Kejadian terkait</h3>{evidence.events.length ? <ul className="space-y-3">{evidence.events.map(event => <li key={event.id} className="space-y-1"><Link className="font-medium underline" href={`/risk-events/${encodeURIComponent(event.id)}`}>{event.code} · {event.description}</Link><p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("id-ID", {dateStyle:"medium",timeZone:"Asia/Jakarta"}).format(new Date(event.occurredAt))}</p>{event.notes.map(note => <p key={note.id} className="whitespace-pre-wrap break-words text-muted-foreground">Catatan tambahan: {note.body}</p>)}</li>)}</ul> : <p className="text-muted-foreground">Tidak ada kejadian tercatat pada periode ini.</p>}</section>
      </>}
      {!result?.final && !loading && !error ? <ActionButton onClick={onRefresh}>Perbarui bukti</ActionButton> : null}
    </div>
  </details>;
}
