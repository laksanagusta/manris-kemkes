"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StandardCard } from "../layout/standard-card";
import { OverviewPanelState } from "./overview-panel-state";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "@/components/shared/icons";

import { RegisterMotionNumber } from "../motion/register-motion";

export interface MonitoringInsightCardProps {
  motion?: boolean;
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

export function MonitoringInsightCard({ motion = true, cycle, total, finalized, highPending, increased, overdue, loading, error, onRetry }: MonitoringInsightCardProps) {
  const percent = total ? Math.round((finalized / total) * 100) : 0;
  const metric = (value: string | number) => motion ? <RegisterMotionNumber value={value} /> : value;
  const circumference = 2 * Math.PI * 78;

  return (
    <StandardCard title={<span className="text-sm">Pemantauan Kuartal Sebelumnya</span>} action={<Badge variant="outline">{cycle}</Badge>}>
      {loading ? (
        <OverviewPanelState state="loading" message="Memuat ringkasan pemantauan..." />
      ) : error ? (
        <OverviewPanelState state="error" message="Ringkasan pemantauan tidak dapat dimuat." onRetry={onRetry} />
      ) : (
        <div className="grid items-center gap-6 md:grid-cols-[13rem_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col items-center gap-1 text-center">
            <div className="relative size-40" role="progressbar" aria-label={`Pemantauan final ${cycle}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={total ? percent : undefined} aria-valuetext={total ? `${finalized} dari ${total} risiko sudah dipantau final pada ${cycle}` : `Belum ada risiko aktif berprofil final pada ${cycle}`}>
              <svg viewBox="0 0 192 192" className="size-full -rotate-90" aria-hidden="true">
                <circle cx="96" cy="96" r="78" fill="none" stroke="var(--sunken)" strokeWidth="18" />
                {total > 0 && <circle cx="96" cy="96" r="78" fill="none" stroke="var(--risk-low)" strokeWidth="18" strokeLinecap={percent > 0 ? "round" : "butt"} className={motion ? "register-motion-ring" : undefined} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - finalized / total)} />}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-semibold tracking-tight tabular-nums">{metric(total ? `${percent}%` : "—")}</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <p className="text-pretty text-sm text-muted-foreground">{total ? <><span className="font-medium text-foreground tabular-nums">{metric(finalized)}/{metric(total)}</span> risiko dipantau</> : "Belum ada risiko"}</p>
              <Tooltip>
                <TooltipTrigger asChild><button type="button" aria-label="Cara menghitung persentase pemantauan" className="-ml-2 flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"><Info className="size-4" strokeWidth={1.5} /></button></TooltipTrigger>
                <TooltipContent className={motion ? "register-motion-tooltip" : undefined}>Persentase profil risiko final yang masih aktif dengan hasil pemantauan final pada {cycle}. Setiap risiko dihitung sekali. Ini mengukur penyelesaian pemantauan.</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-3 rounded-xl bg-card-subtle-surface p-5 text-sm leading-6 sm:p-6">
            <p className="text-pretty"><span className="font-semibold tabular-nums">{metric(highPending)}</span> risiko tinggi & ekstrem belum dipantau</p>
            <p className="text-pretty"><span className="font-semibold tabular-nums">{metric(total - finalized)}</span> risiko belum memiliki pemantauan final pada {cycle}.</p>
            <p className="text-pretty"><span className="font-semibold tabular-nums">{metric(increased)}</span> risiko naik level dibandingkan profil awal {cycle}.</p>
            <div>
              <p className="text-pretty">{overdue === null ? "Data tenggat mitigasi tidak dapat dimuat." : <><span className="font-semibold tabular-nums">{metric(overdue)}</span> tugas mitigasi melewati tenggat.<span className="sr-only"> Mencakup semua periode tugas mitigasi.</span></>}</p>
              {overdue === null && onRetry ? <Button type="button" variant="outline" className="mt-2" onClick={onRetry}>Coba lagi</Button> : null}
            </div>
          </div>
        </div>
      )}
    </StandardCard>
  );
}
