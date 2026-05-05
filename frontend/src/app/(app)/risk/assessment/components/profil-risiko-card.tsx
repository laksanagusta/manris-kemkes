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
  const level =
    inherentScore !== undefined && inherentScore !== null
      ? getRiskLevelFromNilai(inherentScore)
      : undefined;
  const mitigationCount = (
    risk.mitigations?.length ? risk.mitigations : risk.mitigation ? [risk.mitigation] : []
  ).filter((item) => item?.action).length;

  return (
    <Card
      data-testid="profil-risiko-card"
      className="border-border/40 shadow-sm overflow-hidden"
    >
      <CardHeader className="gap-3 border-b border-border/40 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Profil Risiko Saat Ini</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              Ringkasan versi terakhir yang menjadi acuan pemantauan saat ini.
            </p>
          </div>
          <Badge variant="outline" className="font-mono">
            {code}
          </Badge>
        </div>
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
          <p className="mb-1 text-sm font-medium text-muted-foreground">Judul Risiko</p>
          <p className="text-base font-medium">{risk.title || "-"}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Probabilitas</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-mono">{risk.probability || "-"}</span>
              {risk.probability ? (
                <Badge
                  variant="outline"
                  className="border-border/50 bg-muted/30 text-foreground"
                >
                  {PROBABILITY_LABELS[risk.probability]}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Dampak</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-mono">{risk.impact || "-"}</span>
              {risk.impact ? (
                <Badge
                  variant="outline"
                  className="border-border/50 bg-muted/30 text-foreground"
                >
                  {IMPACT_LABELS[risk.impact]}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Skor Saat Ini</p>
            <p className="text-sm font-mono">{inherentScore ?? "-"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Level Risiko</p>
            {level ? (
              <Badge variant="outline" className={levelToColor(level)}>
                {getRiskLevelLabel(level)}
              </Badge>
            ) : (
              <span className="text-sm">-</span>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Prioritas Risiko</p>
            <p className="text-sm">{risk.riskPriority || "-"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Bobot</p>
            <p className="text-sm font-mono">{risk.weight || "-"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Aksi Penanganan</p>
            <p className="text-sm">{mitigationCount > 0 ? `${mitigationCount} tindakan` : "Belum ada"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Target Skor</p>
            <p className="text-sm font-mono">{targetScore}</p>
          </div>
        </div>

        <div className="border-t border-border/50 pt-4">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Target Penurunan</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
              <p className="text-xs font-medium text-muted-foreground">Skor Target</p>
              <p className="text-sm font-mono">{targetScore}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
