"use client";

import { ArrowUpRight, FileText, Loader2 } from "@/components/shared/icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getLinearStatusBadgeClassName, getLinearStatusBadgeTone } from "@/lib/linear-status-badge";
import { parseFormalReportSummary } from "@/types/formal-report";
import type { FormalReport, FormalReportType } from "@/types/formal-report";

type FormalReportCardProps = {
  title: string;
  description: string;
  reportType: FormalReportType;
  latestReport?: FormalReport | null;
  isGenerating?: boolean;
  disabled?: boolean;
  onGenerate: (reportType: FormalReportType) => void;
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

export function FormalReportCard({
  title,
  description,
  reportType,
  latestReport,
  isGenerating = false,
  disabled = false,
  onGenerate,
}: FormalReportCardProps) {
  const latestAt = latestReport?.generatedAt || latestReport?.updatedAt;

  // Extract headline from backend metadata.summary if available
  const summary = latestReport ? parseFormalReportSummary(latestReport.metadata) : null;
  const subtitle = summary?.headline || "";

  return (
    <Card className="group flex flex-col">
      <CardHeader className="">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="text-balance">
              {title}
            </CardTitle>
            <p className="text-sm leading-6 text-secondary-foreground">
              {subtitle || description}
            </p>
          </div>
          <Badge
            variant="outline"
            className=""
          >
            <FileText className="size-3.5" />
            PDF
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Latest generated
          </p>
          <p
            className={cn(
              "mt-1 text-sm font-medium",
              latestAt ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {latestAt ? formatDateTime(latestAt) : "Belum pernah dibuat"}
          </p>
        </div>
        {latestReport ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={getLinearStatusBadgeTone(latestReport.status)} className={getLinearStatusBadgeClassName(latestReport.status)}>
              {latestReport.status}
            </Badge>
            <span>Periode {latestReport.period}</span>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="mt-auto justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {title}
        </p>
        <Button
          size="sm"
          className=""
          onClick={() => onGenerate(reportType)}
          disabled={disabled || isGenerating}
        >
          {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpRight className="size-4" />}
          {isGenerating ? "Generating" : "Generate"}
        </Button>
      </CardFooter>
    </Card>
  );
}
