import Link from "next/link";
import { ArrowUpRight } from "@/components/ui/icons";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Risk } from "@/types/risk";
import {
  formatRiskScore,
  getRiskLevelFromNilai,
  getRiskLevelLabel,
  levelToColor,
  roundRiskScore,
} from "@/lib/risk";
import { cn } from "@/lib/utils";

interface ProfilRisikoCardProps {
  risk: Risk;
  detailHref?: string;
  compact?: boolean;
  floating?: boolean;
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
        shell: "bg-card/70 ring-border/80",
        label: "text-muted-foreground",
        metric: "text-foreground",
        subcard: "ring-border/80",
      };
  }
}

export function ProfilRisikoCard({
  risk,
  detailHref,
  compact = false,
  floating = false,
}: ProfilRisikoCardProps) {
  const code = risk.riskCode || risk.code || "-";
  const inherentScore = roundRiskScore(risk.inherentScore ?? risk.nilai);
  const targetScore = roundRiskScore(risk.targetScore) ?? 0;
  const level =
    inherentScore !== undefined && inherentScore !== null
      ? getRiskLevelFromNilai(inherentScore)
      : undefined;

  const currentScoreTitle = "Skor Saat Ini";
  const currentLevelLabel = level ? getRiskLevelLabel(level) : null;
  const currentScoreTone = scoreCardTone(level);
  const targetLevel =
    targetScore && targetScore > 0
      ? getRiskLevelFromNilai(targetScore)
      : undefined;
  const targetScoreTone = scoreCardTone(targetLevel);
  const targetScoreTitle = "Target Penurunan";
  const targetLevelLabel = targetLevel ? getRiskLevelLabel(targetLevel) : null;

  if (compact && floating) {
    return (
      <div
        data-testid="profil-risiko-card"
        data-component="monitoring-baseline-floating"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex w-full justify-center px-3 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6"
      >
        <div
          role="group"
          aria-label={`Baseline risiko ${code}, versi ${risk.versionNumber ?? "-"}. Skor sumber ${formatRiskScore(inherentScore)}, probabilitas ${risk.probability ?? "-"}, dampak ${risk.impact ?? "-"}, target ${formatRiskScore(targetScore, "-")}, level ${currentLevelLabel || "-"}.`}
          title={risk.title || undefined}
          className="surface-hairline pointer-events-auto flex max-w-full items-center overflow-hidden rounded-xl bg-card text-foreground"
        >
          <div className="relative min-w-0 max-w-[calc(100vw-5rem)] sm:max-w-none">
            <div
              tabIndex={0}
              aria-label="Detail baseline risiko. Geser secara horizontal untuk melihat semua informasi."
              className="flex min-h-11 min-w-0 items-center gap-2 overflow-x-auto px-3 text-xs font-normal outline-none [scrollbar-width:thin] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30 sm:gap-2.5 sm:px-3.5"
            >
              <span className="shrink-0 font-mono text-xs font-medium text-foreground">
                {code}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                v{risk.versionNumber ?? "-"}
              </span>
              <span className="h-3.5 w-px shrink-0 bg-border" aria-hidden="true" />
              <span className="shrink-0 text-xs text-muted-foreground">Sumber</span>
              <span className="shrink-0 text-xs font-medium tabular-nums text-foreground">
                {formatRiskScore(inherentScore)}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                P {risk.probability ?? "-"} · D {risk.impact ?? "-"}
              </span>
              <span className="h-3.5 w-px shrink-0 bg-border" aria-hidden="true" />
              <span className="shrink-0 text-xs text-muted-foreground">Target</span>
              <span className="shrink-0 text-xs font-medium tabular-nums text-foreground">
                {formatRiskScore(targetScore, "-")}
              </span>
              {currentLevelLabel ? (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {currentLevelLabel}
                </span>
              ) : null}
            </div>
          </div>
          {detailHref ? (
            <Link
              href={detailHref}
              aria-label={`Lihat detail risiko ${code}`}
              className="mr-1 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-[background-color,color,transform] duration-150 hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.96]"
            >
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <Card data-testid="profil-risiko-card" className="overflow-hidden">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[11px]">
                {code}
              </Badge>
              <span className="text-xs text-muted-foreground">Versi sumber {risk.versionNumber ?? "-"}</span>
            </div>
            <p className="truncate text-sm font-medium text-foreground">{risk.title || "-"}</p>
            <p className="text-xs text-secondary-foreground">Baseline yang digunakan untuk membandingkan hasil periode ini.</p>
          </div>
          <div className="flex shrink-0 items-center gap-5 sm:justify-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Skor saat ini</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{formatRiskScore(inherentScore)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Target</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{formatRiskScore(targetScore, "-")}</p>
            </div>
            {detailHref ? (
              <Link href={detailHref} className="min-h-11 inline-flex items-center text-xs font-medium text-primary underline-offset-2 hover:underline">
                Lihat detail
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      data-testid="profil-risiko-card"
      className="overflow-hidden"
    >
      <CardHeader className="gap-3 border-b border-border/40 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Profil Risiko Saat Ini</CardTitle>
            <p className="text-sm leading-6 text-secondary-foreground">
              Ringkasan versi terakhir yang menjadi acuan pemantauan saat ini.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant="outline" className="font-mono">
              {code}
            </Badge>
            {detailHref ? (
              <Link
                href={detailHref}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                <span>Lihat detail risiko</span>
              </Link>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div>
          <p className="mb-1 text-sm font-medium text-muted-foreground">Judul Risiko</p>
          <p className="text-base font-medium">{risk.title || "-"}</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div
            className={cn(
              "rounded-xl p-4 shadow-inner ring-1 ring-inset",
              currentScoreTone.shell,
            )}
          >
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.16em]",
                currentScoreTone.label,
              )}
            >
              {currentScoreTitle}
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <p
                className={cn(
                  "text-4xl font-semibold tabular-nums tracking-tight",
                  currentScoreTone.metric,
                )}
              >
                {formatRiskScore(inherentScore)}
              </p>
              {currentLevelLabel ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "h-6 rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                    level ? levelToColor(level) : "",
                  )}
                >
                  {currentLevelLabel}
                </Badge>
              ) : null}
            </div>
            <div className="mt-3 grid gap-2 text-sm text-secondary-foreground sm:grid-cols-2">
              <div
                className={cn(
                  "rounded-xl bg-white/70 px-3 py-2 ring-1 ring-inset",
                  currentScoreTone.subcard,
                )}
              >
                <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Probabilitas
                </span>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {risk.probability || "-"}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-xl bg-white/70 px-3 py-2 ring-1 ring-inset",
                  currentScoreTone.subcard,
                )}
              >
                <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Dampak
                </span>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {risk.impact || "-"}
                </p>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "rounded-xl p-4 shadow-inner ring-1 ring-inset",
              targetScoreTone.shell,
            )}
          >
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.16em]",
                targetScoreTone.label,
              )}
            >
              {targetScoreTitle}
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <p
                className={cn(
                  "text-4xl font-semibold tabular-nums tracking-tight",
                  targetScoreTone.metric,
                )}
              >
                {formatRiskScore(targetScore, "-")}
              </p>
              {targetLevelLabel ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "h-6 rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                    targetLevel ? levelToColor(targetLevel) : "",
                  )}
                >
                  {targetLevelLabel}
                </Badge>
              ) : null}
            </div>
            <div className="mt-3 grid gap-2 text-sm text-secondary-foreground sm:grid-cols-2">
              <div
                className={cn(
                  "rounded-xl bg-white/70 px-3 py-2 ring-1 ring-inset",
                  targetScoreTone.subcard,
                )}
              >
                <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Target probabilitas
                </span>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {risk.targetProbability || "-"}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-xl bg-white/70 px-3 py-2 ring-1 ring-inset",
                  targetScoreTone.subcard,
                )}
              >
                <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Target dampak
                </span>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {risk.targetImpact || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
