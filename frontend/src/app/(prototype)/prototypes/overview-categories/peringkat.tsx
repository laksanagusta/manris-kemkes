import { useState } from "react";
import { Button } from "@/components/ui/button";
import { categories, formatShare, totalRisks } from "./data";

export function Peringkat() {
  const [mode, setMode] = useState<"count" | "share">("count");

  return (
    <div className="flex flex-1 flex-col justify-between gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Terbanyak ke tersedikit</p>
        <div role="group" aria-label="Satuan peringkat" className="flex gap-1">
          <Button
            size="sm"
            variant={mode === "count" ? "secondary" : "ghost"}
            aria-pressed={mode === "count"}
            onClick={() => setMode("count")}
          >
            Jumlah
          </Button>
          <Button
            size="sm"
            variant={mode === "share" ? "secondary" : "ghost"}
            aria-pressed={mode === "share"}
            onClick={() => setMode("share")}
          >
            Persentase
          </Button>
        </div>
      </div>
      <ol aria-label="Peringkat kategori" className="grid gap-3.5">
        {categories.map((category) => (
          <li key={category.key} className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span>{category.label}</span>
              <span className="font-semibold tabular-nums">
                {mode === "count" ? category.total : formatShare(category.total)}
              </span>
            </div>
            <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${category.total / totalRisks * 100}%`, backgroundColor: category.color }}
              />
            </div>
          </li>
        ))}
      </ol>
      <p className="border-t border-border pt-3 text-xs text-muted-foreground">
        {totalRisks} risiko dalam {categories.length} kategori
      </p>
    </div>
  );
}
