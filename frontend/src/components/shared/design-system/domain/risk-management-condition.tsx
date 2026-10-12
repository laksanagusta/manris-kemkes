import { StandardCard } from "../layout/standard-card";
import { OverviewPanelState } from "./overview-panel-state";
import {
  buildRiskManagementCondition,
  currentReportCycle,
  formatReportPercent,
  percentage,
  riskPopulationLabel,
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
  const title = data?.status === "attention" ? "Perlu perhatian"
    : data?.status === "within" ? "Dalam area penerimaan"
    : "Data belum cukup";
  const attention = data ? [
    data.above > 0 ? `${data.above} risiko di atas selera${data.extreme > 0 ? ` (${data.extreme} sangat tinggi)` : data.high > 0 ? ` (${data.high} tinggi)` : ""}` : "",
    data.overdue > 0 ? `${data.overdue} laporan mitigasi terlambat` : "",
    data.missingPlans > 0 ? `${data.missingPlans} risiko utama tanpa rencana mitigasi` : "",
    data.missedTargets > 0 ? `${data.missedTargets} target residual belum tercapai` : "",
    data.movement.up > 0 ? `${data.movement.up} profil risiko meningkat` : "",
  ].filter(Boolean).join("; ") : "";
  return (
    <StandardCard title="Ringkasan">
      {loading ? <OverviewPanelState state="loading" message="Memuat kondisi pengelolaan risiko…" />
        : error ? <OverviewPanelState state="error" message="Kondisi pengelolaan risiko belum dapat dimuat." onRetry={onRetry} />
        : !report || !data || data.status === "empty" ? <OverviewPanelState state="empty" message="Belum ada profil risiko aktif Final pada periode ini. Lengkapi dan finalkan profil risiko untuk melihat kondisi pengelolaan." />
        : <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-2xl font-medium leading-tight tracking-tight">{title}</h2>
            <p className="max-w-[75ch] text-sm leading-6 text-muted-foreground">
              {data.status === "attention"
                ? `${attention}.`
                : data.status === "within"
                  ? "Pertahankan pemantauan dan tinjau perubahan kondisi. Kesimpulan ini berlaku untuk risiko yang sudah teridentifikasi."
                  : "Lengkapi penilaian, target, dan pemantauan Final sebelum menarik kesimpulan menyeluruh."}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              {data.total} · {riskPopulationLabel(report.cycle)}.
              {report.cycle === currentReportCycle() ? " Kuartal berjalan; capaian masih sementara." : ""}
            </p>
            {report.warnings.length > 0 && <ul aria-label="Keterbatasan data" className="list-disc space-y-1 ps-4 text-xs text-muted-foreground">
              {report.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
            </ul>}
          </div>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-6 xl:grid-cols-5">
            {data.metrics.map((metric) => <div key={metric.label} className="space-y-2">
              <dt className="min-h-10 text-sm font-medium xl:min-h-0">{metric.label}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{formatReportPercent(percentage(metric.numerator, metric.denominator))}</dd>
              <dd className="text-xs leading-5 text-muted-foreground">
                {metric.numerator}/{metric.denominator}
                {!metric.detail.startsWith("0 ") && <> · {metric.detail}</>}
              </dd>
            </div>)}
          </dl>

        </div>}
    </StandardCard>
  );
}
