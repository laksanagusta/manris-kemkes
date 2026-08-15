import { Loader2 } from "@/components/ui/icons";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusLabelForPerformanceRisk, statusToneForPerformanceRisk } from "@/lib/performance-risk";
import type { PerformanceRiskDetail } from "@/types/performance-risk";
import { RiskHeatmap } from "../../../overview/_components/risk-heatmap";

type Props = {
  detail: PerformanceRiskDetail | null;
  loading: boolean;
};

export function PerformanceRiskDetailPanel({ detail, loading }: Props) {
  if (loading) {
    return (
      <Card className="rounded-lg bg-card">
        <CardContent className="flex min-h-40 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!detail) {
    return (
      <Card className="rounded-lg bg-card">
        <CardContent className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
          Pilih RO untuk melihat detail risiko dan mitigasi.
        </CardContent>
      </Card>
    );
  }

  const { node } = detail;

  return (
    <Card className="rounded-lg bg-card">
      <CardHeader className="space-y-2 border-b border-border/60 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-sm font-semibold leading-6 md:text-base">{node.roTitle}</CardTitle>
          <Badge variant="outline" className="text-[11px] font-normal">
            {node.planningTitle || "Perjanjian Kinerja"}
          </Badge>
          <Badge variant="outline" className={statusToneForPerformanceRisk(node.attentionStatus)}>
            {statusLabelForPerformanceRisk(node.attentionStatus)}
          </Badge>
          <Badge variant="outline" className="text-[11px] font-normal">
            {node.highestLevel || "Belum ada risiko"}
          </Badge>
        </div>
        <p className="text-xs leading-5 text-muted-foreground md:text-sm">
          {node.planningTitle || node.tujuanTitle || "-"} / {node.objectiveTitle || node.sasaranTitle || "-"} / {node.ikuTitle}
        </p>
        <p className="text-[11px] text-muted-foreground md:text-xs">
          {node.programTitle}
          {node.activityTitle ? ` · ${node.activityTitle}` : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Risiko", value: node.riskCount },
            { label: "Exposure", value: node.totalExposure },
            { label: "Overdue", value: node.mitigationOverdue },
            { label: "Pending", value: node.mitigationPending },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-base font-semibold tabular-nums text-foreground">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,40%)_minmax(0,60%)]">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Heatmap Inherent
              </h3>
              <span className="text-[11px] text-muted-foreground">
                {node.riskCount > 0 ? `${node.riskCount} risiko` : "Belum ada risiko"}
              </span>
            </div>
            <div className="w-full">
              <RiskHeatmap data={node.heatmap} compact showLegend={false} />
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Risiko Terkait
                </h3>
                <span className="text-[11px] text-muted-foreground">{detail.risks.length} item</span>
              </div>
              <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-muted/10">
                {detail.risks.map((risk) => (
                  <div key={risk.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-sm font-medium text-foreground">
                        {risk.code} - {risk.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{risk.organizationName}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {risk.inherentScore}
                    </span>
                  </div>
                ))}
                {detail.risks.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground">
                    Belum ada risiko final yang terhubung ke RO ini.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Mitigasi Pending / Overdue
                </h3>
                <span className="text-[11px] text-muted-foreground">{detail.mitigations.length} item</span>
              </div>
              <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-muted/10">
                {detail.mitigations.map((mitigation) => (
                  <div key={mitigation.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-sm font-medium text-foreground">{mitigation.action}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {mitigation.riskCode} · {mitigation.owner || "Tanpa PIC"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-[11px] text-muted-foreground">
                      <p className="font-medium uppercase tracking-wide text-foreground">{mitigation.status}</p>
                      <p>{mitigation.dueDate || "Tanpa due date"}</p>
                    </div>
                  </div>
                ))}
                {detail.mitigations.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground">
                    Tidak ada mitigasi pending atau overdue untuk RO ini.
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Breakdown Unit
            </h3>
            <span className="text-[11px] text-muted-foreground">{detail.units.length} unit</span>
          </div>
          {detail.units.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {detail.units.map((unit) => (
                <div
                  key={unit.organizationId ?? unit.organizationName}
                  className="rounded-full border border-border/60 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground"
                >
                  <span className="font-medium text-foreground">{unit.organizationName}</span>
                  <span className="ml-2">
                    {unit.riskCount} risiko · {unit.totalExposure} exposure
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-3 text-sm text-muted-foreground">
              Tidak ada pembagian unit untuk RO ini.
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
