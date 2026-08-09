"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadFormalReport } from "@/lib/api/formal-reports";
import { formalReportTypeLabels } from "@/lib/formal-report-definitions";
import { cn } from "@/lib/utils";
import { parseFormalReportSummary } from "@/types/formal-report";
import type { FormalReport } from "@/types/formal-report";

type FormalReportListProps = {
  reports: FormalReport[];
  organizationNameById: Map<string, string>;
};

const reportStatusStyles: Record<FormalReport["status"], string> = {
  draft: "border-border/60 bg-muted/40 text-muted-foreground",
  generated: "border-primary/20 bg-primary/5 text-primary",
  submitted:
    "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function FormalReportList({
  reports,
  organizationNameById,
}: FormalReportListProps) {
  const { token } = useAuth();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (report: FormalReport) => {
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }

    setDownloadingId(report.id);
    try {
      await downloadFormalReport(
        token,
        `/formal-reports/${report.id}/download`,
        `formal-report-${report.reportType}-${report.period}.pdf`,
      );
      toast.success("Laporan Monitoring & Evaluasi sedang diunduh.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal mengunduh laporan Monitoring & Evaluasi.",
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Card className="rounded-lg ring-1 ring-inset ring-border bg-card shadow-none">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-6 py-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Histori semua laporan Monitoring & Evaluasi yang sudah dibuat dari
            data sistem.
          </p>
        </div>
        <Badge
          variant="outline"
          className="gap-1.5 border-primary/20 bg-primary/[0.06] text-[10px] text-primary"
        >
          <FileText className="size-3.5" />
          PDF
        </Badge>
      </div>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="whitespace-nowrap">Periode</TableHead>
              <TableHead className="whitespace-nowrap">Organisasi</TableHead>
              <TableHead className="whitespace-nowrap">Jenis Laporan</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="whitespace-nowrap">Generated At</TableHead>
              <TableHead className="text-right whitespace-nowrap">
                Aksi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Belum ada laporan Monitoring & Evaluasi yang digenerate.
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => {
                const orgName =
                  organizationNameById.get(report.organizationId) ??
                  report.organizationId;
                const isDownloading = downloadingId === report.id;

                return (
                  <TableRow
                    key={report.id}
                    className="transition-colors hover:bg-muted/25"
                  >
                    <TableCell className="whitespace-nowrap font-medium">
                      {report.period}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate">
                      {orgName}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate">
                      {(() => {
                        const summary = parseFormalReportSummary(
                          report.metadata,
                        );
                        return (
                          summary?.headline ||
                          formalReportTypeLabels[report.reportType]
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "whitespace-nowrap",
                          reportStatusStyles[report.status],
                        )}
                      >
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(report.generatedAt ?? report.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => void handleDownload(report)}
                        disabled={isDownloading}
                      >
                        {isDownloading ? (
                          <>
                            Mengunduh
                            <Loader2 className="size-4 animate-spin" />
                          </>
                        ) : (
                          <>
                            Download
                            <Download className="size-4" />
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
