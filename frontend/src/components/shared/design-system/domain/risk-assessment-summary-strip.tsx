"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "@/components/shared/icons";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";
import { getLinearRiskLevelBadgeTone } from "@/lib/linear-status-badge";
import { formatRiskScore, getRiskLevelLabel } from "@/lib/risk";
import type { RiskLevel } from "@/types/risk";

type StatusTone = "neutral" | "success" | "warning";
type NoteTone = "neutral" | "warning";

export interface RiskAssessmentSummaryMetric {
  label: string;
  value: ReactNode;
}

export interface RiskAssessmentSummaryStripProps {
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
  surface?: "elevated" | "flat";
  className?: string;
}

const statusIconMap: Record<StatusTone, ReactNode> = {
  neutral: <Info />,
  success: <CheckCircle2 />,
  warning: <AlertTriangle />,
};

function SummaryMetricTile({ label, value }: RiskAssessmentSummaryMetric) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant="outline">{value}</Badge>
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
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {helperText ? <CardDescription>{helperText}</CardDescription> : null}
        {statusLabel ? (
          <Badge variant={toBadgeVariant(statusTone)} className={getStatusBadgeClassName(statusTone)}>
            {statusIconMap[statusTone]}
            {statusLabel}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4">
        {metrics.map((metric) => <SummaryMetricTile key={metric.label} {...metric} />)}
        <SummaryMetricTile label={scoreLabel} value={<span className="tabular-nums">{formatRiskScore(score)}</span>} />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Level</span>
          <Badge variant={getLinearRiskLevelBadgeTone(getRiskLevelLabel(level))}>{getRiskLevelLabel(level)}</Badge>
        </div>
      </CardContent>
      {note ? (
        <CardContent>
          <Alert variant={noteTone === "warning" ? "destructive" : "default"}>
            {noteTone === "warning" ? <AlertTriangle /> : <Info />}
            <AlertDescription>{note}</AlertDescription>
          </Alert>
        </CardContent>
      ) : null}
    </Card>
  );
}
