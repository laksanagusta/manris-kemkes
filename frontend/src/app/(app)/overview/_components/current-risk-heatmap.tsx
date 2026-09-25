import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  OverviewPanelState,
  RiskHeatmapGrid,
  StandardCard,
} from "@/components/shared/design-system";
import { ArrowExpand } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { MultiPhaseHeatmapCompareCard } from "../../compliance/_components/multi-phase-heatmap-compare";

const riskLevelLegend = [
  { label: "Sangat Rendah", className: "heatmap-sangat-rendah" },
  { label: "Rendah", className: "heatmap-rendah" },
  { label: "Sedang", className: "heatmap-sedang" },
  { label: "Tinggi", className: "heatmap-tinggi" },
  { label: "Sangat Tinggi", className: "heatmap-sangat-tinggi" },
] as const;

export function CurrentRiskHeatmap({
  matrix,
  loading,
  error,
  onRetry,
}: {
  matrix: number[][];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const total = matrix.flat().reduce((sum, count) => sum + count, 0);

  return (
    <Dialog>
      <StandardCard
        title="Peta Risiko Saat Ini"
        subtitle="Distribusi probabilitas dan dampak pada kuartal berjalan."
        className="h-full"
        contentClassName="flex flex-1 flex-col"
        action={
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Buka perbandingan heatmap multi-fase"
              title="Buka perbandingan heatmap multi-fase"
            >
              <ArrowExpand aria-hidden="true" />
            </Button>
          </DialogTrigger>
        }
      >
          {loading ? (
            <OverviewPanelState
              state="loading"
              message="Memuat peta risiko..."
              className="min-h-64 xl:min-h-0 xl:flex-1"
            />
          ) : error ? (
            <OverviewPanelState
              state="error"
              message="Peta risiko tidak dapat dimuat."
              onRetry={onRetry}
              className="min-h-64 xl:min-h-0 xl:flex-1"
            />
          ) : total === 0 ? (
            <OverviewPanelState
              state="empty"
              message="Belum ada distribusi risiko untuk kuartal ini."
              className="min-h-64 xl:min-h-0 xl:flex-1"
            />
          ) : (
            <div className="flex flex-1 flex-col justify-center">
              <div className="mx-auto grid w-full max-w-[22rem] grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
                <span className="rotate-180 text-xs text-muted-foreground [writing-mode:vertical-rl]">
                  Probabilitas
                </span>
                <RiskHeatmapGrid
                  matrix={matrix}
                  label="Peta risiko kuartal berjalan"
                  className="w-full"
                />
                <span aria-hidden="true" />
                <span className="text-center text-xs text-muted-foreground">
                  Dampak
                </span>
              </div>
              <div
                role="list"
                aria-label="Legenda level risiko"
                className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground"
              >
                {riskLevelLegend.map((item) => (
                  <span
                    key={item.label}
                    role="listitem"
                    className="inline-flex items-center gap-1.5"
                  >
                    <span
                      aria-hidden="true"
                      className={`size-2.5 rounded-sm ${item.className}`}
                    />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          )}
      </StandardCard>

      <DialogContent className="max-h-[90dvh] min-w-0 overflow-y-auto sm:max-w-[min(96vw,1480px)]">
        <DialogHeader className="pe-10">
          <DialogTitle>Perbandingan Heatmap Multi-Fase</DialogTitle>
          <DialogDescription>
            Bandingkan distribusi risiko dari skor awal, setiap kuartal, hingga target skor.
          </DialogDescription>
        </DialogHeader>
        <MultiPhaseHeatmapCompareCard surface="plain" />
      </DialogContent>
    </Dialog>
  );
}
