"use client";

import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getBobot,
  getRiskLevelFromNilai,
  levelToColor,
  resolveRiskScoreSemantics,
} from "@/lib/risk";
import { cn } from "@/lib/utils";
import type { TopRiskItem } from "@/types/risk";

interface TopRisksPanelProps {
  risks: TopRiskItem[];
  loading?: boolean;
}

export function TopRisksPanel({ risks, loading }: TopRisksPanelProps) {
  if (loading) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-2" data-testid="top-risks-panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px] font-semibold">Top Risks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/40" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-2" data-testid="top-risks-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-[15px] font-semibold">Top Risks</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Risiko dengan skor tertinggi pada cycle ini.</p>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {risks.length} risiko
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {risks.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Belum ada data risiko.
          </div>
        ) : (
           <div className="space-y-2">
             {risks.slice(0, 7).map((risk) => {
               const scoreSemantics = resolveRiskScoreSemantics({
                 status: risk.status,
                 probability: risk.probability,
                 impact: risk.impact,
                 weight: getBobot(risk.probability, risk.impact),
                 nilai: risk.nilai,
                 inherentScore: risk.inherentScore,
               });

               const score = scoreSemantics.primary.score;
               const level = getRiskLevelFromNilai(scoreSemantics.primary.nilai);

               return (
                 <div
                   key={risk.id}
                   data-testid="risk-row"
                   className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-3 transition-colors hover:bg-muted/30"
                 >
                   <div className="min-w-0 flex-1">
                     <div className="flex items-center gap-2">
                       <span className="shrink-0 text-xs font-mono font-semibold text-muted-foreground">
                         {risk.code}
                       </span>
                       <span
                         className={cn(
                           "inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                           levelToColor(level),
                         )}
                       >
                         {score}
                       </span>
                     </div>
                     <p className="mt-1 truncate text-sm font-medium text-foreground">{risk.title}</p>
                     {risk.orgName && (
                       <p className="mt-0.5 truncate text-xs text-muted-foreground">{risk.orgName}</p>
                     )}
                   </div>
                   <ChevronRight className="ml-2 size-4 shrink-0 text-muted-foreground" />
                 </div>
               );
             })}
           </div>
        )}
      </CardContent>
    </Card>
  );
}
