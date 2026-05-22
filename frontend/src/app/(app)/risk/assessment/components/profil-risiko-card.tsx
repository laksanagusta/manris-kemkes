import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Risk } from "@/types/risk";
import { getRiskLevelFromNilai, getRiskLevelLabel, levelToColor } from "@/lib/risk";
import { cn } from "@/lib/utils";

interface ProfilRisikoCardProps {
  risk: Risk;
  detailHref?: string;
}

function scoreCardTone(level?: ReturnType<typeof getRiskLevelFromNilai>) {
  switch (level) {
    case "sangat_tinggi":
      return {
        shell: "bg-rose-50/70 ring-rose-200",
        label: "text-rose-700",
        metric: "text-rose-950",
        subcard: "ring-rose-200/80",
      };
    case "tinggi":
      return {
        shell: "bg-orange-50/70 ring-orange-200",
        label: "text-orange-700",
        metric: "text-orange-950",
        subcard: "ring-orange-200/80",
      };
    case "sedang":
      return {
        shell: "bg-amber-50/70 ring-amber-200",
        label: "text-amber-700",
        metric: "text-amber-950",
        subcard: "ring-amber-200/80",
      };
    case "rendah":
      return {
        shell: "bg-sky-50/70 ring-sky-200",
        label: "text-sky-700",
        metric: "text-sky-950",
        subcard: "ring-sky-200/80",
      };
    case "sangat_rendah":
      return {
        shell: "bg-emerald-50/70 ring-emerald-200",
        label: "text-emerald-700",
        metric: "text-emerald-950",
        subcard: "ring-emerald-200/80",
      };
    default:
      return {
        shell: "bg-white/70 ring-zinc-200/80",
        label: "text-zinc-500",
        metric: "text-zinc-950",
        subcard: "ring-zinc-200/80",
      };
  }
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

  const currentScoreLabel = level
    ? getRiskLevelLabel(level)
    : "Skor saat ini";
  const currentScoreTone = scoreCardTone(level);
  const targetLevel =
    targetScore && targetScore > 0
      ? getRiskLevelFromNilai(targetScore)
      : undefined;
  const targetScoreTone = scoreCardTone(targetLevel);
  const targetScoreLabel = targetLevel
    ? getRiskLevelLabel(targetLevel)
    : "Target nilai";

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

        <div className="grid gap-4 xl:grid-cols-2">
          <div
            className={cn(
              "rounded-2xl p-4 shadow-inner ring-1 ring-inset",
              currentScoreTone.shell,
            )}
          >
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.16em]",
                currentScoreTone.label,
              )}
            >
              {currentScoreLabel}
            </p>
            <div className="mt-2 flex items-end gap-3">
              <p
                className={cn(
                  "text-4xl font-semibold tabular-nums tracking-tight",
                  currentScoreTone.metric,
                )}
              >
                {inherentScore ?? "-"}
              </p>
              <p className="pb-1 text-sm text-zinc-600">
                skor aktual yang menjadi acuan pemantauan.
              </p>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
              <div
                className={cn(
                  "rounded-xl bg-white/70 px-3 py-2 ring-1 ring-inset",
                  currentScoreTone.subcard,
                )}
              >
                <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                  Probabilitas
                </span>
                <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
                  {risk.probability || "-"}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-xl bg-white/70 px-3 py-2 ring-1 ring-inset",
                  currentScoreTone.subcard,
                )}
              >
                <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                  Dampak
                </span>
                <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
                  {risk.impact || "-"}
                </p>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "rounded-2xl p-4 shadow-inner ring-1 ring-inset",
              targetScoreTone.shell,
            )}
          >
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.16em]",
                targetScoreTone.label,
              )}
            >
              {targetScoreLabel}
            </p>
            <div className="mt-2 flex items-end gap-3">
              <p
                className={cn(
                  "text-4xl font-semibold tabular-nums tracking-tight",
                  targetScoreTone.metric,
                )}
              >
                {targetScore}
              </p>
              <p className="pb-1 text-sm text-zinc-600">
                target skor yang ingin dicapai setelah penanganan.
              </p>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
              <div
                className={cn(
                  "rounded-xl bg-white/70 px-3 py-2 ring-1 ring-inset",
                  targetScoreTone.subcard,
                )}
              >
                <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                  Target probabilitas
                </span>
                <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
                  {risk.targetProbability || "-"}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-xl bg-white/70 px-3 py-2 ring-1 ring-inset",
                  targetScoreTone.subcard,
                )}
              >
                <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                  Target dampak
                </span>
                <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
                  {risk.targetImpact || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        </div>

        <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Target Penurunan</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Bobot</p>
              <p className="text-sm font-mono">{risk.targetWeight || "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Skor Target</p>
              <p className="text-sm font-mono">{targetScore}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Target Probabilitas</p>
              <p className="text-sm font-mono">{risk.targetProbability || "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Target Dampak</p>
              <p className="text-sm font-mono">{risk.targetImpact || "-"}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
