import { StandardCard } from "../layout/standard-card";
import { OverviewPanelState } from "./overview-panel-state";
import {
  buildRiskManagementCondition,
  formatReportPercent,
  percentage,
} from "@/lib/quarterly-report";
import type { QuarterlyReport, QuarterlyRisk } from "@/types/quarterly-report";

type Props = {
  report: QuarterlyReport | null;
  activeProfiles: QuarterlyRisk[];
  previousProfiles: QuarterlyRisk[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
};

export function RiskManagementCondition({ report, activeProfiles, previousProfiles, loading, error, onRetry }: Props) {
  const data = report ? buildRiskManagementCondition(report, activeProfiles, previousProfiles) : null;
  return (
    <StandardCard title="Ringkasan">
      {loading ? <OverviewPanelState state="loading" message="Memuat kondisi pengelolaan risiko…" />
        : error ? <OverviewPanelState state="error" message="Kondisi pengelolaan risiko belum dapat dimuat." onRetry={onRetry} />
        : !report || !data || data.status === "empty" ? <OverviewPanelState state="empty" message="Belum ada profil risiko aktif Final pada periode ini. Lengkapi dan finalkan profil risiko untuk melihat kondisi pengelolaan." />
        : <dl className="grid grid-cols-2 gap-x-5 gap-y-6 xl:grid-cols-5">
            {data.metrics.map((metric) => <div key={metric.label} className="space-y-2">
              <dt className="min-h-10 text-sm font-medium xl:min-h-0">{metric.label}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{formatReportPercent(percentage(metric.numerator, metric.denominator))}</dd>
              <dd className="text-xs leading-5 text-muted-foreground">
                {metric.numerator}/{metric.denominator}
                {!metric.detail.startsWith("0 ") && <> · {metric.detail}</>}
              </dd>
            </div>)}
          </dl>}
    </StandardCard>
  );
}
