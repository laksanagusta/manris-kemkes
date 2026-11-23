"use client";

import { TextLoadingSkeleton } from "@/components/shared/design-system/feedback/loading-skeleton";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FileText } from "@/components/shared/icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createDisplayDateFormatter } from "@/lib/display-date";
import { getMitigationExecutionLabel, getMitigationReportLabel, hasReportedMitigation } from "@/lib/mitigation-report-status";
import type { RiskEventNote } from "@/types/risk-event";
import { ActionButton } from "../actions/action-button";
import styles from "./monitoring-evidence.module.css";

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

const eventDate = createDisplayDateFormatter("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });

type EvidenceReport = NonNullable<MonitoringEvidenceResult["evidence"]>["reports"][number];

function ReportCards({ reports }: { reports: EvidenceReport[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [hasMoreBefore, setHasMoreBefore] = useState(false);
  const [hasMoreAfter, setHasMoreAfter] = useState(false);
  const count = reports.length;

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;

    const update = () => {
      const position = Math.abs(element.scrollLeft);
      const remaining = element.scrollWidth - element.clientWidth - position;
      setHasMoreBefore(position > 1);
      setHasMoreAfter(remaining > 1);
    };

    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", update);
    };
  }, [count]);

  return (
    <div className={styles.rail} data-more-start={hasMoreBefore || undefined} data-more-end={hasMoreAfter || undefined}>
      <div ref={viewport} className={styles.viewport} role="region" aria-label="Laporan pelaksanaan mitigasi" tabIndex={hasMoreBefore || hasMoreAfter ? 0 : undefined}>
        <ul className={styles.cards} aria-label="Pelaksanaan mitigasi">
          {reports.map((report) => {
            const links = [...new Set(report.evidenceUrl.split(/\r?\n/).map(url => url.trim()).filter(url => /^https?:\/\//i.test(url)))];
            const reported = hasReportedMitigation(report);
            const execution = getMitigationExecutionLabel(report.status);
            return (
              <li key={report.id} className="min-w-0">
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col gap-3">
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold wrap-anywhere">{report.action}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-secondary-foreground">
                        {execution && <span>{execution}</span>}
                        <Badge variant="secondary" className={reported ? "bg-success/15" : undefined}>
                          {reported ? "Dilaporkan" : getMitigationReportLabel(report)}
                        </Badge>
                      </div>
                    </div>
                    <p className="flex-1 text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap text-secondary-foreground">{report.notes || "Belum ada catatan pelaksanaan."}</p>
                    <div className="flex min-h-8 flex-wrap items-center gap-2 border-t border-dashed border-border pt-3">
                      {links.length ? links.map((url, index) => (
                        <ActionButton key={url} asChild size="sm" variant="outline" icon={<FileText aria-hidden="true" className="size-3.5" />}>
                          <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Buka bukti${links.length > 1 ? ` ${index + 1}` : ""}: ${report.action}`}>
                            Buka bukti{links.length > 1 ? ` ${index + 1}` : ""}
                          </a>
                        </ActionButton>
                      )) : <span className="text-xs text-muted-foreground">Tanpa lampiran</span>}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

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
    {evidence.reports.length ? (
      <ReportCards reports={evidence.reports} />
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
