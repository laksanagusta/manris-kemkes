"use client";

import { useCallback, useEffect, useState } from "react";
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
type MultiPhaseHeatmapResponse = Partial<Record<PhaseKey, number[][]>> & {
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

type HeatmapData = Record<PhaseKey, number[][] | null>;

function readHeatmapMatrix(value: unknown): number[][] | null {
  if (
    !Array.isArray(value) ||
    value.length !== 5 ||
    !value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === 5 &&
        row.every(
          (count) => typeof count === "number" && Number.isFinite(count),
        ),
    )
  ) {
    return null;
  }

  return value as number[][];
}

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

  const [data, setData] = useState<HeatmapData | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const response = await api.get<MultiPhaseHeatmapResponse>(
        `/dashboard/heatmap-multi?year=${currentYear}`,
        token,
      );

      setData({
        initial: readHeatmapMatrix(response?.initial),
        quarter1: readHeatmapMatrix(response?.quarter1),
        quarter2: readHeatmapMatrix(response?.quarter2 ?? response?.semester1),
        quarter3: readHeatmapMatrix(response?.quarter3),
        quarter4: readHeatmapMatrix(response?.quarter4 ?? response?.semester2),
        target: readHeatmapMatrix(response?.target),
      });
    } catch (err) {
      console.error("Failed to load multi-phase heatmap", err);
      setError("Gagal memuat data heatmap.");
    } finally {
      setLoading(false);
    }
  }, [currentYear, token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <StandardCard
      title="Perbandingan Heatmap Multi-Fase"
      className="w-full"
      contentClassName="p-4 pt-2"
    >
      {loading ? (
        <OverviewPanelState
          state="loading"
          message="Memuat perbandingan heatmap..."
          className="min-h-64"
        />
      ) : error ? (
        <OverviewPanelState
          state="error"
          message="Perbandingan heatmap tidak dapat dimuat."
          className="min-h-64"
          onRetry={() => void loadData()}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-6">
            {(Object.keys(labelMap) as PhaseKey[]).map((phase) => {
              const gridData = data?.[phase];
              return (
                <div
                  key={phase}
                  role="group"
                  aria-label={`Heatmap ${labelMap[phase]}`}
                  className="space-y-2"
                >
                  <p className="text-xs font-normal uppercase tracking-[0.6px] text-muted-foreground">
                    {labelMap[phase]}
                  </p>
                  {gridData ? (
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
                                {heatmapMode === "riskLevel" && count === 0
                                  ? ""
                                  : count}
                              </span>
                            </div>
                          );
                        }),
                      )}
                    </div>
                  ) : (
                    <div
                      role="status"
                      className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-border/60 bg-muted/20 px-3 text-center text-xs text-muted-foreground"
                    >
                      Data fase belum tersedia.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div
            role="list"
            aria-label="Legenda level risiko"
            className="-mx-4 -mb-4 mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border/60 bg-table-header px-4 py-3 text-[11px] text-muted-foreground"
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
