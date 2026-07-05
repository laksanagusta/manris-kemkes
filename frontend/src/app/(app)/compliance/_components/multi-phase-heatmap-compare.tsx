"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getHeatmapCellClass, type HeatmapMode } from "@/lib/heatmap-utils";

interface Props {
  defaultYear?: number;
}

type PhaseKey = "initial" | "semester1" | "semester2" | "target";

// NOTE: `api.get` auto-unwraps the `{ data: ... }` envelope,
// so the helper returns the inner object directly.
type MultiPhaseHeatmapResponse = Record<PhaseKey, number[][]>;

const labelMap: Record<PhaseKey, string> = {
  initial: "Skor Awal",
  semester1: "Semester 1",
  semester2: "Semester 2",
  target: "Target Skor",
};

const emptyHeatmap = Array(5).fill(Array(5).fill(0));

export function MultiPhaseHeatmapCompareCard({ defaultYear }: Props) {
  const { token } = useAuth();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(defaultYear ?? currentYear);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const heatmapMode: HeatmapMode = "riskLevel";

  const [data, setData] = useState<Record<PhaseKey, number[][]>>({
    initial: emptyHeatmap,
    semester1: emptyHeatmap,
    semester2: emptyHeatmap,
    target: emptyHeatmap,
  });

  const uniqueYearOptions = Array.from(
    new Set([
      currentYear - 2,
      currentYear - 1,
      currentYear,
      currentYear + 1,
      year,
    ]),
  ).sort((a, b) => a - b);

  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<MultiPhaseHeatmapResponse>(
          `/dashboard/heatmap-multi?year=${year}`,
          token,
        );

        setData({
          initial: response?.initial ?? emptyHeatmap,
          semester1: response?.semester1 ?? emptyHeatmap,
          semester2: response?.semester2 ?? emptyHeatmap,
          target: response?.target ?? emptyHeatmap,
        });
      } catch (err) {
        console.error("Failed to load multi-phase heatmap", err);
        setError("Gagal memuat data heatmap.");
        setData({
          initial: emptyHeatmap,
          semester1: emptyHeatmap,
          semester2: emptyHeatmap,
          target: emptyHeatmap,
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, year]);

  return (
    <Card className="w-full gap-4 rounded-lg border-0 bg-card py-0 shadow-none ring-1 ring-inset ring-border">
      <CardHeader className="flex flex-col gap-4 space-y-0 pb-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-medium">
            Heatmap Compare Multi-Fase
          </CardTitle>
          <p className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
            Distribusi risiko lintas fase lifecycle dalam tahun {year}.
            {error && (
              <span className="ml-2 text-xs text-destructive">({error})</span>
            )}
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          <Select
            value={year.toString()}
            onValueChange={(val) => setYear(parseInt(val, 10))}
          >
            <SelectTrigger className="w-full bg-background/80 shadow-none sm:w-[120px]">
              <SelectValue placeholder="Pilih Tahun" />
            </SelectTrigger>
            <SelectContent>
              {uniqueYearOptions.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1 gap-4 pb-4 md:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(labelMap) as PhaseKey[]).map((phase) => {
          const gridData = data[phase];
          return (
            <div
              key={phase}
              className={cn(
                "space-y-2",
                loading && "opacity-50 transition-opacity",
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {labelMap[phase]}
              </p>
              <div className="relative grid grid-cols-5 gap-1">
                {[...gridData].reverse().flatMap((row, rowIndex) =>
                  row.map((count, colIndex) => (
                    <div
                      key={`${phase}-${rowIndex}-${colIndex}`}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-md border text-xs font-semibold",
                        getHeatmapCellClass(
                          count,
                          5 - rowIndex,
                          colIndex + 1,
                          heatmapMode,
                        ),
                      )}
                      title={`Probabilitas: ${5 - rowIndex}, Dampak: ${colIndex + 1}`}
                    >
                      {heatmapMode === "riskLevel" && count === 0 ? "" : count}
                    </div>
                  )),
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
