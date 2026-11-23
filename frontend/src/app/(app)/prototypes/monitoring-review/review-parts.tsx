import { Fragment } from "react";
import { ArrowRight, CheckCircle2 } from "@/components/shared/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculateRiskMetrics, getRiskLevelLabel, levelToColor, resolveRiskAppetite } from "@/lib/risk";
import { cn } from "@/lib/utils";

export type Score = { probability: number; impact: number };
export type Notes = { reason: string; conclusion: string };
export type Draft = Score & Notes & { confirmed: boolean; report: string; finalized: boolean };

export const baseline: Score = { probability: 3, impact: 4 };
export const initial: Draft = { ...baseline, confirmed: false, reason: "", conclusion: "", report: "", finalized: false };
export const baselineScore = calculateRiskMetrics(baseline.probability, baseline.impact).inherentScore;

export type VariantProps = {
  draft: Draft;
  choose: (score: Score) => void;
  edit: (notes: Partial<Notes>) => void;
  openHeatmap: () => void;
  review: () => void;
};

export function ScoreComparison({ draft }: { draft: Draft }) {
  const metrics = calculateRiskMetrics(draft.probability, draft.impact);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div>
        <p className="text-xs text-muted-foreground">Skor sebelumnya</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{baselineScore}</p>
      </div>
      <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground" />
      <div aria-live="polite" aria-atomic="true">
        <p className="text-xs text-muted-foreground">Skor observasi</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-2xl font-semibold tabular-nums">{metrics.inherentScore}</span>
          <Badge variant="outline" className={levelToColor(metrics.level)}>{getRiskLevelLabel(metrics.level)}</Badge>
        </div>
      </div>
    </div>
  );
}

export function ScoreState({ confirmed }: { confirmed: boolean }) {
  return (
    <Badge variant="secondary" className={confirmed ? "bg-success/15" : undefined}>
      {confirmed && <CheckCircle2 aria-hidden="true" />}
      {confirmed ? "Skor ditetapkan" : "Skor belum ditetapkan"}
    </Badge>
  );
}

export function ScoreAxes({ draft }: { draft: Draft }) {
  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
      <div className="flex gap-1.5"><dt>Probabilitas</dt><dd className="font-medium text-foreground">{draft.probability}</dd></div>
      <div className="flex gap-1.5"><dt>Dampak</dt><dd className="font-medium text-foreground">{draft.impact}</dd></div>
    </dl>
  );
}

export function InlineHeatmap({ draft, choose }: Pick<VariantProps, "draft" | "choose">) {
  const levels = [1, 2, 3, 4, 5];
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Skor risiko observasi</p>
        <ScoreState confirmed={draft.confirmed} />
      </div>
      <div>
        <p className="mb-2 text-center text-xs text-muted-foreground">Dampak</p>
        <div role="group" aria-label="Heatmap skor risiko" className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-1.5 text-center text-xs tabular-nums">
          <span className="self-center text-[10px] text-muted-foreground">Prob.</span>
          {levels.map((impact) => <span key={impact} className="py-1 text-muted-foreground">{impact}</span>)}
          {[...levels].reverse().map((probability) => (
            <Fragment key={probability}>
              <span className="self-center text-muted-foreground">{probability}</span>
              {levels.map((impact) => {
                const metrics = calculateRiskMetrics(probability, impact);
                const selected = draft.probability === probability && draft.impact === impact;
                return (
                  <button
                    key={impact}
                    type="button"
                    disabled={draft.finalized}
                    aria-label={`Probabilitas ${probability}, dampak ${impact}, skor ${metrics.inherentScore}`}
                    aria-pressed={selected && draft.confirmed}
                    onClick={() => choose({ probability, impact })}
                    className={cn("min-h-9 rounded-md border font-medium transition-transform duration-150 ease-out active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-default motion-reduce:transition-none motion-reduce:active:scale-100", levelToColor(metrics.level), selected && (draft.confirmed ? "ring-2 ring-inset ring-foreground" : "outline outline-dashed -outline-offset-2 outline-foreground/65"))}
                  >
                    <span className="text-foreground">{metrics.inherentScore}</span>
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
      {!draft.finalized && <Button variant="outline" size="sm" onClick={() => choose(baseline)}>Gunakan skor sebelumnya</Button>}
    </div>
  );
}

export function NoteFields({ draft, edit }: Pick<VariantProps, "draft" | "edit">) {
  return (
    <div className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="preview-reason">Alasan penilaian</Label>
        <Textarea id="preview-reason" className="min-h-24" value={draft.reason} readOnly={draft.finalized} onChange={(e) => edit({ reason: e.target.value })} placeholder="Jelaskan bukti atau pertimbangan yang mendasari skor." />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="preview-conclusion">Simpulan dan tindak lanjut</Label>
        <Textarea id="preview-conclusion" className="min-h-24" value={draft.conclusion} readOnly={draft.finalized} onChange={(e) => edit({ conclusion: e.target.value })} placeholder="Catat temuan dan tindakan yang perlu ditindaklanjuti." />
      </div>
    </div>
  );
}

export function ReviewSummary({ draft }: { draft: Draft }) {
  const metrics = calculateRiskMetrics(draft.probability, draft.impact);
  return (
    <Card>
      <CardContent className="space-y-3">
        <h3 className="text-sm font-semibold">Simpulan Pemantauan</h3>
        <ScoreComparison draft={draft} />
        <p className="border-t border-dashed border-border pt-3 text-xs text-muted-foreground">
          {metrics.inherentScore === baselineScore ? "Skor tetap" : metrics.inherentScore < baselineScore ? "Skor turun" : "Skor naik"}
          {" · "}{resolveRiskAppetite(metrics.inherentScore) === "di_atas_batas" ? "Di atas batas selera risiko" : "Dalam batas selera risiko"}
        </p>
      </CardContent>
    </Card>
  );
}
