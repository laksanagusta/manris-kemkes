import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
}

export function ProfilRisikoCard({ risk }: ProfilRisikoCardProps) {
  const code = risk.riskCode || risk.code || "-";
  const inherentScore = risk.inherentScore ?? risk.nilai;
  const targetNilai = risk.targetNilai ?? risk.targetScore;
  const level = inherentScore !== undefined && inherentScore !== null ? getRiskLevelFromNilai(inherentScore) : undefined;
  
  return (
    <Card data-testid="profil-risiko-card">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Profil Risiko Saat Ini
          <Badge variant="outline" className="font-mono">{code}</Badge>
        </CardTitle>
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
            <p className="text-sm font-medium text-muted-foreground">Inherent Score</p>
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
          {risk.mitigation && risk.mitigation.action ? (
            <div className="bg-background rounded-md p-3 text-sm space-y-2 border border-border/50">
              <p><span className="font-medium text-muted-foreground">Tindakan:</span> {risk.mitigation.action}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                <p><span className="text-muted-foreground">PIC:</span> {risk.mitigation.owner || "-"}</p>
                <p><span className="text-muted-foreground">Tenggat Waktu:</span> {risk.mitigation.dueDate || "-"}</p>
                <p><span className="text-muted-foreground">Frekuensi:</span> {risk.mitigation.frequency || "-"}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Belum ada rencana penanganan</p>
          )}
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
              <p className="text-sm font-mono">{targetNilai ?? "-"}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
