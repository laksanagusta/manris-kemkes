"use client";

import { Info } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";

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
          <Button type="button" variant="ghost" size="icon-xs" aria-label="Lihat kriteria probabilitas">
            <Info />
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="w-[min(92vw,44rem)] max-w-[44rem]"
        >
          <div className="max-h-[70vh] overflow-auto">
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-sm font-semibold">Kriteria Kemungkinan</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Panduan nilai probabilitas untuk penilaian risiko.
              </p>
            </div>
            <Table className="w-full text-left">
              <TableHeader>
                <TableRow className="h-auto">
                  <TableHead className="">
                    Level Kemungkinan
                  </TableHead>
                  <TableHead className="">
                    Probabilitas
                  </TableHead>
                  <TableHead className="">
                    Jumlah frekuensi
                  </TableHead>
                  <TableHead className="">
                    Low Frequency Event
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criteriaRows.map((row) => (
                  <TableRow key={row.level} className="h-auto align-top">
                    <TableCell className="">
                      {row.level}
                    </TableCell>
                    <TableCell className="">
                      {row.probability}
                    </TableCell>
                    <TableCell className="">
                      {row.nonLowFrequency}
                    </TableCell>
                    <TableCell className="">
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
