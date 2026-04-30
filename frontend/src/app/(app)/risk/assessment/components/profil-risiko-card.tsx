import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Risk } from "@/types/risk";
import {
  PROBABILITY_LABELS,
  IMPACT_LABELS,
  getRiskLevelFromNilai,
  levelToColor,
  getRiskLevelLabel,
} from "@/lib/risk";

interface ProfilRisikoCardProps {
  risk: Risk;
  detailHref?: string;
}

export function ProfilRisikoCard({ risk, detailHref }: ProfilRisikoCardProps) {
  const code = risk.riskCode || risk.code || "-";
  const inherentScore = risk.inherentScore ?? risk.nilai;
  const targetScore = risk.targetScore ?? 0;
  const level = inherentScore !== undefined && inherentScore !== null ? getRiskLevelFromNilai(inherentScore) : undefined;
  
  return (
    <Card data-testid="profil-risiko-card">
      <CardHeader className="gap-3">
        <CardTitle className="flex justify-between items-center">
          Profil Risiko Saat Ini
          <Badge variant="outline" className="font-mono">{code}</Badge>
        </CardTitle>
        {detailHref ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary"
          >
            <Link href={detailHref}>
              <ArrowUpRight className="size-3.5" />
              Lihat detail risiko
            </Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Judul Risiko</p>
          <p className="text-base font-medium">{risk.title || "-"}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Probabilitas</p>
            <p className="text-sm">{risk.probability || "-"} — {PROBABILITY_LABELS[risk.probability] || "-"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Dampak</p>
            <p className="text-sm">{risk.impact || "-"} — {IMPACT_LABELS[risk.impact] || "-"}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Bobot</p>
            <p className="text-sm font-mono">{risk.weight || "-"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Skor</p>
            <p className="text-sm font-mono">{inherentScore}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Level</p>
            {level ? (
              <Badge variant="outline" className={levelToColor(level)}>
                {getRiskLevelLabel(level)}
              </Badge>
            ) : (
              <span className="text-sm">-</span>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Prioritas Risiko</p>
            <p className="text-sm">{risk.riskPriority || "-"}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-border/50">
          <p className="text-sm font-medium text-muted-foreground mb-3">Rencana Penanganan</p>
          {(() => {
            const mitigations = risk.mitigations?.length ? risk.mitigations : (risk.mitigation ? [risk.mitigation] : []);
            const validMitigations = mitigations.filter(m => m && m.action);
            return validMitigations.length > 0 ? (
              <div className="bg-background rounded-md border border-border/50 overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border/50">
                    <tr>
                      <th className="text-left text-muted-foreground font-medium px-4 py-3 w-12">No</th>
                      <th className="text-left text-muted-foreground font-medium px-4 py-3">Tindakan</th>
                      <th className="text-left text-muted-foreground font-medium px-4 py-3">PIC</th>
                      <th className="text-left text-muted-foreground font-medium px-4 py-3">Tenggat Waktu</th>
                      <th className="text-left text-muted-foreground font-medium px-4 py-3">Frekuensi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {validMitigations.map((m, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3">{m.action}</td>
                        <td className="px-4 py-3">{m.owner || "-"}</td>
                        <td className="px-4 py-3">{m.dueDate || "-"}</td>
                        <td className="px-4 py-3">{m.frequency || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Belum ada rencana penanganan</p>
            );
          })()}
        </div>

        <div className="pt-4 border-t border-border/50">
          <p className="text-sm font-medium text-muted-foreground mb-3">Target Penurunan</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Probabilitas</p>
              <p className="text-sm font-mono">{risk.targetProbability || "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Dampak</p>
              <p className="text-sm font-mono">{risk.targetImpact || "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Bobot</p>
              <p className="text-sm font-mono">{risk.targetWeight || "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Target Score</p>
              <p className="text-sm font-mono">{targetScore}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
