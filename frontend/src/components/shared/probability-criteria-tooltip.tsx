"use client";

import { Info } from "@/components/ui/icons";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const criteriaRows = [
  {
    level: "Jarang (1)",
    probability: "P ≤ 1%",
    nonLowFrequency: "< 2 kali dalam 12 bulan terakhir",
    lowFrequency: "≤ 1 kejadian dalam 60 bulan terakhir",
  },
  {
    level: "Kemungkinan Kecil (2)",
    probability: "1% < P ≤ 10%",
    nonLowFrequency: "2 kali s.d 5 kali dalam 12 bulan terakhir",
    lowFrequency: "Minimal 1 kejadian dalam 60 bulan terakhir",
  },
  {
    level: "Kemungkinan Sedang (3)",
    probability: "10% < P ≤ 20%",
    nonLowFrequency: "6 s.d 9 kali dalam 12 bulan terakhir",
    lowFrequency: "Minimal 1 kejadian dalam 36 bulan terakhir",
  },
  {
    level: "Kemungkinan Besar (4)",
    probability: "20% < P ≤ 50%",
    nonLowFrequency: "10 kali s.d 12 kali dalam 12 bulan terakhir",
    lowFrequency: "Minimal 1 kejadian dalam 24 bulan terakhir",
  },
  {
    level: "Hampir Pasti Terjadi (5)",
    probability: "P > 50%",
    nonLowFrequency: "> 12 kali dalam 12 bulan terakhir",
    lowFrequency: "Minimal 1 kejadian dalam 12 bulan terakhir",
  },
] as const;

export function ProbabilityCriteriaTooltip({
  label = "Probabilitas",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex h-6 items-center gap-2", className)}>
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex size-5 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Lihat kriteria probabilitas"
          >
            <Info className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="w-[min(92vw,44rem)] max-w-[44rem] rounded-xl bg-background p-0 text-foreground"
        >
          <div className="max-h-[70vh] overflow-auto">
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-sm font-semibold">Kriteria Kemungkinan</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Panduan nilai probabilitas untuk penilaian risiko.
              </p>
            </div>
            <Table className="w-full border-collapse text-left text-xs">
              <TableHeader className="bg-table-header text-[11px] uppercase tracking-wide text-muted-foreground">
                <TableRow className="h-auto">
                  <TableHead className="border-b border-r border-border/60 px-3 py-2 font-semibold">
                    Level Kemungkinan
                  </TableHead>
                  <TableHead className="border-b border-r border-border/60 px-3 py-2 font-semibold">
                    Probabilitas
                  </TableHead>
                  <TableHead className="border-b border-r border-border/60 px-3 py-2 font-semibold">
                    Jumlah frekuensi
                  </TableHead>
                  <TableHead className="border-b border-border/60 px-3 py-2 font-semibold">
                    Low Frequency Event
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criteriaRows.map((row) => (
                  <TableRow key={row.level} className="h-auto border-t-0 align-top">
                    <TableCell className="border-b border-r border-border/60 px-3 py-3 font-medium">
                      {row.level}
                    </TableCell>
                    <TableCell className="border-b border-r border-border/60 px-3 py-3">
                      {row.probability}
                    </TableCell>
                    <TableCell className="border-b border-r border-border/60 px-3 py-3">
                      {row.nonLowFrequency}
                    </TableCell>
                    <TableCell className="border-b border-border/60 px-3 py-3">
                      {row.lowFrequency}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
