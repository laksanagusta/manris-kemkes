"use client";

import { TextLoadingSkeleton } from "@/components/shared/design-system/feedback/loading-skeleton";
import Link from "next/link";
import { createDisplayDateFormatter } from "@/lib/display-date";
import { getMitigationReportLabel } from "@/lib/mitigation-report-status";
import type { RiskEventNote } from "@/types/risk-event";
import { ActionButton } from "../actions/action-button";

export type MonitoringEvidenceResult = {
  final: boolean;
  evidence: null | {
    capturedAt: string;
    title: string;
    sourceScore: number;
    targetScore: number;
    reports: {
      id: string;
      action: string;
      status: string;
      notes: string;
      evidenceUrl: string;
      reportedAt?: string;
    }[];
    events: {
      id: string;
      code: string;
      description: string;
      occurredAt: string;
      notes: RiskEventNote[];
    }[];
  };
};

const captureDate = createDisplayDateFormatter("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});
const eventDate = createDisplayDateFormatter("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });

export function MonitoringEvidence({ result, loading, error, onRefresh }: {
  result: MonitoringEvidenceResult | null;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
}) {
  if (loading) {
    return <TextLoadingSkeleton rows={2} message="Memuat laporan penanganan…" />;
  }
  if (error) {
    return <div role="alert" className="space-y-2 text-sm">
      <p>{error}</p>
      <ActionButton onClick={onRefresh}>Coba lagi</ActionButton>
    </div>;
  }
  const evidence = result?.evidence;
  if (!evidence) {
    return <p className="text-sm text-muted-foreground">Bukti saat finalisasi belum tersedia.</p>;
  }

  return <div className="space-y-4 text-sm">
    <p className="text-xs text-muted-foreground">
      Bukti saat finalisasi · <span data-date-time="">{captureDate.format(new Date(evidence.capturedAt))}</span>
    </p>
    {evidence.reports.length ? (
      <ul aria-label="Pelaksanaan mitigasi" className="divide-y divide-border rounded-lg border border-border">
        {evidence.reports.map((report) => (
          <li key={report.id} className="space-y-1 px-4 py-3">
            <p className="font-medium">{report.action}</p>
            <p className="text-xs text-muted-foreground">{getMitigationReportLabel(report)}</p>
            <p className="whitespace-pre-wrap break-words">{report.notes || "Belum ada catatan pelaksanaan."}</p>
            {report.evidenceUrl.split(/\r?\n/).map(url => url.trim()).filter(url => /^https?:\/\//i.test(url)).map(url => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block underline">Buka bukti</a>
            ))}
          </li>
        ))}
      </ul>
    ) : <p className="text-muted-foreground">Tidak ada laporan mitigasi pada periode ini.</p>}
    {evidence.events.length > 0 && (
      <section className="space-y-2">
        <h3 className="font-medium">Kejadian terkait</h3>
        <ul className="space-y-3">
          {evidence.events.map((event) => (
            <li key={event.id} className="space-y-1">
              <Link className="font-medium underline" href={`/risk-events/${encodeURIComponent(event.id)}`}>{event.code} · {event.description}</Link>
              <p className="text-xs text-muted-foreground"><span data-date-time="">{eventDate.format(new Date(event.occurredAt))}</span></p>
              {event.notes.map(note => <p key={note.id} className="whitespace-pre-wrap break-words text-muted-foreground">{note.body}</p>)}
            </li>
          ))}
        </ul>
      </section>
    )}
  </div>;
}
