import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportWidget } from "@/components/shared/design-system/reports/report-widget";

export const metricLabels = ["Total risiko", "Risiko tinggi & sangat tinggi", "Total unit"];
export const metricsLayout = "grid grid-cols-2 gap-4 @min-[36rem]/report:grid-cols-3";
export const widgetsLayout = "grid min-w-0 gap-4 @min-[48rem]/report:grid-cols-2";
export const unitRankingTitle = "Risiko tinggi dan sangat tinggi per unit";

export function RiskSummarySkeleton({ comparison = false }: { comparison?: boolean }) {
  const titles = comparison
    ? ["Komposisi", "Perubahan", "Indikator"]
    : ["Distribusi tingkat risiko", "Kesenjangan terhadap target", unitRankingTitle, "Pelaporan mitigasi"];
  return (
    <div className="@container/report space-y-4">
      <span role="status" className="sr-only">{comparison ? "Memuat perbandingan risiko…" : "Memuat ringkasan risiko…"}</span>
      {!comparison && (
        <div className={metricsLayout}>
          {metricLabels.map(label => (
            <Card key={label} className="min-h-28 gap-2 p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <Skeleton className="h-8 w-20" />
            </Card>
          ))}
        </div>
      )}
      <div className={widgetsLayout}>
        {titles.map((title, index) => (
          <ReportWidget key={title} title={title} chart={comparison || index === 1}
            className={comparison && index === 2 ? "@min-[48rem]/report:col-span-2" : undefined}>
            <Skeleton className={comparison || index < 2 ? "h-64 w-full" : "h-28 w-full"} />
          </ReportWidget>
        ))}
      </div>
    </div>
  );
}
