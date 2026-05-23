"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getRiskLevelLabel, levelToColor } from "@/lib/risk";
import type { RiskLevel } from "@/types/risk";

type StatusTone = "neutral" | "success" | "warning";
type NoteTone = "neutral" | "warning";

export interface RiskAssessmentSummaryMetric {
  label: string;
  value: ReactNode;
}

interface RiskAssessmentSummaryStripProps {
  title: string;
  score: number;
  level: RiskLevel;
  scoreLabel?: string;
  statusLabel?: string;
  statusTone?: StatusTone;
  helperText?: string;
  metrics?: RiskAssessmentSummaryMetric[];
  note?: string;
  noteTone?: NoteTone;
  className?: string;
}

const statusToneClassName: Record<StatusTone, string> = {
  neutral: "border-zinc-200 bg-zinc-50 text-zinc-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
};

const noteToneClassName: Record<NoteTone, string> = {
  neutral: "border-border/60 bg-muted/20 text-muted-foreground",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
};

const statusIconMap: Record<StatusTone, ReactNode> = {
  neutral: <Info />,
  success: <CheckCircle2 />,
  warning: <AlertTriangle />,
};

function SummaryMetricTile({ label, value }: RiskAssessmentSummaryMetric) {
  return (
    <div className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border/60 bg-background/85 px-2.5 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset]">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className="text-[11px] font-semibold leading-none text-foreground">
        {value}
      </span>
    </div>
  );
}

export function RiskAssessmentSummaryStrip({
  title,
  score,
  level,
  scoreLabel = "Skor risiko",
  statusLabel,
  statusTone = "neutral",
  helperText,
  metrics = [],
  note,
  noteTone = "neutral",
  className,
}: RiskAssessmentSummaryStripProps) {
  const hasMetrics = metrics.length > 0;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm",
        className,
      )}
    >
      <div className="border-b border-border/60 px-3 py-2.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {title}
            </p>
            {helperText ? (
              <p className="mt-1.5 max-w-2xl text-[11px] leading-5 text-muted-foreground">
                {helperText}
              </p>
            ) : null}
          </div>
          {statusLabel ? (
            <Badge
              variant="outline"
              className={cn(
                "h-5 rounded-full px-2 text-[10px] font-medium",
                statusToneClassName[statusTone],
              )}
            >
              {statusIconMap[statusTone]}
              {statusLabel}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 px-3 py-2.5">
        {hasMetrics
          ? metrics.map((metric) => (
              <SummaryMetricTile key={metric.label} {...metric} />
            ))
          : null}
        <SummaryMetricTile
          label={scoreLabel}
          value={<span className="tabular-nums">{score}</span>}
        />
        <SummaryMetricTile
          label="Level"
          value={
            <Badge
              variant="outline"
              className={cn(
                "h-5 rounded-full px-2.5 text-[10px] font-semibold tracking-[0.12em]",
                levelToColor(level),
              )}
            >
              {getRiskLevelLabel(level)}
            </Badge>
          }
        />
      </div>

      {note ? (
        <div
          className={cn(
            "flex items-start gap-2 border-t px-3 py-1.5 text-[11px] leading-4",
            noteToneClassName[noteTone],
          )}
        >
          {noteTone === "warning" ? (
            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          ) : (
            <Info className="mt-0.5 size-3 shrink-0" />
          )}
          <p>{note}</p>
        </div>
      ) : null}
    </section>
  );
}
