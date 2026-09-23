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
import { ArrowExpand } from "@/components/ui/icons";
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
      <div className="relative xl:h-full">
        <StandardCard
          title="Peta Risiko Saat Ini"
          className="rounded-lg xl:h-full"
          contentClassName="px-5 pb-6 pt-3 xl:flex xl:flex-1 xl:flex-col xl:pb-3 xl:pt-2"
          headerClassName="px-5 pb-3 pt-5 xl:!pb-2 xl:pt-4"
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
            <div>
              <RiskHeatmapGrid
                matrix={matrix}
                label="Peta risiko kuartal berjalan"
                className="mx-auto w-full max-w-72 xl:max-w-[287px]"
              />
              <div
                role="list"
                aria-label="Legenda level risiko"
                className="mt-5 flex flex-wrap justify-center gap-x-3 gap-y-2 text-[10px] text-muted-foreground xl:mt-2"
              >
                {riskLevelLegend.map((item) => (
                  <span
                    key={item.label}
                    role="listitem"
                    className="inline-flex items-center gap-1.5"
                  >
                    <span
                      aria-hidden="true"
                      className={`size-2 rounded-sm ${item.className}`}
                    />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </StandardCard>

        <DialogTrigger asChild>
          <button
            type="button"
            aria-label="Buka perbandingan heatmap multi-fase"
            title="Buka perbandingan heatmap multi-fase"
            className="absolute bottom-0 left-1/2 inline-flex size-9 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm outline-none transition-[color,background-color,box-shadow,transform] duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 motion-reduce:transition-none"
          >
            <ArrowExpand aria-hidden="true" className="size-4" />
          </button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-[min(96vw,1180px)] gap-4">
        <DialogHeader>
          <DialogTitle>Perbandingan Heatmap Multi-Fase</DialogTitle>
          <DialogDescription className="sr-only">
            Perbandingan distribusi risiko dari skor awal, setiap kuartal,
            hingga target skor.
          </DialogDescription>
        </DialogHeader>
        <MultiPhaseHeatmapCompareCard surface="plain" />
      </DialogContent>
    </Dialog>
  );
}
