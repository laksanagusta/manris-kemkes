"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StandardCard } from "../layout/standard-card";
import { OverviewPanelState } from "./overview-panel-state";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "@/components/shared/icons";

export interface MonitoringInsightCardProps {
  cycle: string;
  total: number;
  finalized: number;
  highPending: number;
  increased: number;
  overdue: number | null;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

export function MonitoringInsightCard({ cycle, total, finalized, highPending, increased, overdue, loading, error, onRetry }: MonitoringInsightCardProps) {
  const percent = total ? Math.round((finalized / total) * 100) : 0;
  const circumference = 2 * Math.PI * 78;

  return (
    <StandardCard title={<span className="text-sm">Pemantauan Kuartal Sebelumnya</span>} action={<Badge variant="outline">{cycle}</Badge>}>
      {loading ? (
        <OverviewPanelState state="loading" message="Memuat ringkasan pemantauan..." />
      ) : error ? (
        <OverviewPanelState state="error" message="Ringkasan pemantauan tidak dapat dimuat." onRetry={onRetry} />
      ) : (
        <div className="grid items-center gap-6 md:grid-cols-[minmax(15rem,1fr)_minmax(0,2fr)] lg:gap-10">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative size-48" role="progressbar" aria-label={`Pemantauan final ${cycle}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={total ? percent : undefined} aria-valuetext={total ? `${finalized} dari ${total} risiko sudah dipantau final pada ${cycle}` : `Belum ada risiko aktif berprofil final pada ${cycle}`}>
              <svg viewBox="0 0 192 192" className="size-full -rotate-90" aria-hidden="true">
                <circle cx="96" cy="96" r="78" fill="none" stroke="var(--sunken)" strokeWidth="18" />
                {total > 0 && percent > 0 && <circle cx="96" cy="96" r="78" fill="none" stroke="var(--risk-low)" strokeWidth="18" strokeLinecap="round" strokeDasharray={`${circumference * (finalized / total)} ${circumference}`} />}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-semibold tracking-tight tabular-nums">{total ? `${percent}%` : "—"}</span>
                <span className="mt-1 text-sm text-muted-foreground">pemantauan final</span>
              </div>
            </div>
            <Badge variant={total && finalized === total ? "secondary" : "outline"}>{!total ? "Belum ada risiko" : finalized === total ? "Seluruhnya final" : "Masih berjalan"}</Badge>
            <div className="flex items-center justify-center gap-1.5">
              <p className="text-pretty text-sm text-muted-foreground"><span className="font-medium text-foreground tabular-nums">{finalized} dari {total}</span> risiko sudah dipantau pada {cycle}</p>
              <Tooltip>
                <TooltipTrigger asChild><button type="button" aria-label="Cara menghitung persentase pemantauan" className="-ml-2 flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"><Info className="size-4" strokeWidth={1.5} /></button></TooltipTrigger>
                <TooltipContent>Persentase profil risiko final yang masih aktif dengan hasil pemantauan final pada {cycle}. Setiap risiko dihitung sekali. Ini mengukur penyelesaian pemantauan.</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <div className="rounded-xl bg-card-subtle-surface p-4">
              <p className="text-xs font-medium text-muted-foreground">Prioritas pemantauan</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{highPending} <span className="text-base font-normal">risiko tinggi & ekstrem belum dipantau</span></p>
            </div>
            <p className="rounded-xl bg-card-subtle-surface p-4 text-pretty text-sm"><span className="font-semibold tabular-nums">{total - finalized}</span> risiko belum memiliki pemantauan final pada {cycle}.</p>
            <p className="rounded-xl bg-card-subtle-surface p-4 text-pretty text-sm"><span className="font-semibold tabular-nums">{increased}</span> risiko naik level dibandingkan profil awal {cycle}.</p>
            <div className="rounded-xl bg-card-subtle-surface p-4">
              <p className="text-pretty text-sm">{overdue === null ? "Data tenggat mitigasi tidak dapat dimuat." : <><span className="font-semibold tabular-nums">{overdue}</span> tugas mitigasi melewati tenggat.</>}</p>
              <p className="mt-1 text-xs text-muted-foreground">Mencakup semua periode tugas mitigasi.</p>
              {overdue === null && onRetry ? <Button type="button" variant="outline" onClick={onRetry}>Coba lagi</Button> : null}
            </div>
          </div>
        </div>
      )}
    </StandardCard>
  );
}
