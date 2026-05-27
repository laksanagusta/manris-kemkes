"use client";

import { ArrowUpRight, FileText, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
    <Card className="group flex h-full flex-col border-border/50 bg-card/90 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="text-[15px] font-semibold leading-5 text-balance">
              {title}
            </CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              {subtitle || description}
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
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-3">
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
            <Badge variant="outline" className="h-5 px-2 text-[10px]">
              {latestReport.status}
            </Badge>
            <span>Periode {latestReport.period}</span>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="mt-auto justify-between gap-2 border-t border-border/50 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          {title}
        </p>
        <Button
          size="sm"
          className="gap-2 shadow-sm"
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
