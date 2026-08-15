"use client";

import { useEffect, useState } from "react";
import { StandardCard } from "@/components/shared/design-system";
import { OverviewPanelState } from "@/components/shared/design-system";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import {
  calculateNilai,
  getBobot,
  getRiskLevelFromNilai,
  getRiskLevelLabel,
} from "@/lib/risk";

import { getHeatmapCellClass, type HeatmapMode } from "@/lib/heatmap-utils";

type PhaseKey = "initial" | "quarter1" | "quarter2" | "quarter3" | "quarter4" | "target";

// NOTE: `api.get` auto-unwraps the `{ data: ... }` envelope,
// so the helper returns the inner object directly.
type MultiPhaseHeatmapResponse = Record<PhaseKey, number[][]> & {
  semester1?: number[][];
  semester2?: number[][];
};

const labelMap: Record<PhaseKey, string> = {
  initial: "Skor Awal",
  quarter1: "Kuartal 1",
  quarter2: "Kuartal 2",
  quarter3: "Kuartal 3",
  quarter4: "Kuartal 4",
  target: "Target Skor",
};

const emptyHeatmap = Array(5).fill(Array(5).fill(0));

const riskLevelLegend = [
  { label: "Sangat Rendah", className: "heatmap-sangat-rendah" },
  { label: "Rendah", className: "heatmap-rendah" },
  { label: "Sedang", className: "heatmap-sedang" },
  { label: "Tinggi", className: "heatmap-tinggi" },
  { label: "Sangat Tinggi", className: "heatmap-sangat-tinggi" },
] as const;

export function MultiPhaseHeatmapCompareCard() {
  const { token } = useAuth();

  const currentYear = new Date().getFullYear();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const heatmapMode: HeatmapMode = "riskLevel";

  const [data, setData] = useState<Record<PhaseKey, number[][]>>({
    initial: emptyHeatmap,
    quarter1: emptyHeatmap,
    quarter2: emptyHeatmap,
    quarter3: emptyHeatmap,
    quarter4: emptyHeatmap,
    target: emptyHeatmap,
  });

  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<MultiPhaseHeatmapResponse>(
          `/dashboard/heatmap-multi?year=${currentYear}`,
          token,
        );

        setData({
          initial: response?.initial ?? emptyHeatmap,
          quarter1: response?.quarter1 ?? emptyHeatmap,
          quarter2: response?.quarter2 ?? response?.semester1 ?? emptyHeatmap,
          quarter3: response?.quarter3 ?? emptyHeatmap,
          quarter4: response?.quarter4 ?? response?.semester2 ?? emptyHeatmap,
          target: response?.target ?? emptyHeatmap,
        });
      } catch (err) {
        console.error("Failed to load multi-phase heatmap", err);
        setError("Gagal memuat data heatmap.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, currentYear]);

  return (
    <StandardCard
      title="Perbandingan Heatmap Multi-Fase"
      className="w-full"
      contentClassName="p-4 pt-2"
    >
      {error ? (
        <OverviewPanelState
          state="error"
          message="Perbandingan heatmap tidak dapat dimuat."
          className="min-h-64"
        />
      ) : (
        <>
          <div
            aria-busy={loading}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4"
          >
        {loading ? <span className="sr-only">Memuat data heatmap.</span> : null}
        {(Object.keys(labelMap) as PhaseKey[]).map((phase) => {
          const gridData = data[phase];
          return (
            <div
              key={phase}
              role="group"
              aria-label={`Heatmap ${labelMap[phase]}`}
              className={cn(
                "space-y-2",
                loading && "opacity-50 transition-opacity motion-reduce:transition-none",
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {labelMap[phase]}
              </p>
              <div className="relative grid grid-cols-5 gap-1">
                {[...gridData].reverse().flatMap((row, rowIndex) =>
                  row.map((count, colIndex) => {
                    const probability = 5 - rowIndex;
                    const impact = colIndex + 1;
                    const level = getRiskLevelLabel(
                      getRiskLevelFromNilai(
                        calculateNilai(
                          probability,
                          impact,
                          getBobot(probability, impact),
                        ),
                      ),
                    );

                    return (
                      <div
                        key={`${phase}-${rowIndex}-${colIndex}`}
                        role="img"
                        aria-label={`Probabilitas ${probability}, dampak ${impact}, level ${level}, ${count} risiko`}
                        className={cn(
                          "flex aspect-square items-center justify-center rounded-md border text-xs font-semibold",
                          getHeatmapCellClass(
                            count,
                            probability,
                            impact,
                            heatmapMode,
                          ),
                        )}
                      >
                        <span aria-hidden="true">
                          {heatmapMode === "riskLevel" && count === 0 ? "" : count}
                        </span>
                      </div>
                    );
                  }),
                )}
              </div>
            </div>
          );
        })}
          </div>
          <div
            role="list"
            aria-label="Legenda level risiko"
            className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border/40 pt-3 text-[11px] text-muted-foreground"
          >
            {riskLevelLegend.map((item) => (
              <span
                key={item.label}
                role="listitem"
                className="inline-flex items-center gap-1.5"
              >
                <span
                  aria-hidden="true"
                  className={cn("size-2.5 rounded-sm", item.className)}
                />
                {item.label}
              </span>
            ))}
          </div>
        </>
      )}
    </StandardCard>
  );
}
