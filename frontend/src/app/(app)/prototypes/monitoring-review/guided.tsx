import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { InlineHeatmap, NoteFields, ScoreAxes, ScoreComparison, ScoreState, type VariantProps } from "./review-parts";

export function Guided({ draft, choose, edit, review }: VariantProps) {
  const [step, setStep] = useState(0);
  const panelHeading = useRef<HTMLHeadingElement>(null);

  function goTo(next: number) {
    setStep(next);
    panelHeading.current?.focus();
  }

  return (
    <Card className="@container gap-0">
      <CardContent className="space-y-4">
        <h2 className="text-base font-semibold">Hasil Pemantauan</h2>
        <ol className="grid grid-cols-2 rounded-lg border border-border bg-workspace p-1">
          {["Penilaian skor", "Catatan dan simpulan"].map((label, index) => (
            <li key={label}>
              <Button variant="ghost" aria-current={step === index ? "step" : undefined} className={cn("h-auto min-h-10 w-full justify-start gap-2 px-2 py-2 text-left whitespace-normal", step === index && "bg-card shadow-(--surface-shadow-low)")} onClick={() => goTo(index)}>
                <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-xs">{index + 1}</span>{label}
              </Button>
            </li>
          ))}
        </ol>
        <h3 ref={panelHeading} tabIndex={-1} className="sr-only">{step === 0 ? "Penilaian skor" : "Catatan dan simpulan"}</h3>
        {step === 0 ? (
          <div className="grid gap-5 @min-[38rem]:grid-cols-[minmax(0,1fr)_minmax(13rem,0.72fr)]">
            <InlineHeatmap draft={draft} choose={choose} />
            <div className="space-y-4 rounded-lg border border-border bg-workspace p-4">
              <h4 className="text-sm font-semibold">Perubahan skor</h4>
              <ScoreComparison draft={draft} />
              <ScoreAxes draft={draft} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-workspace p-3">
              <ScoreComparison draft={draft} />
              <ScoreState confirmed={draft.confirmed} />
            </div>
            <NoteFields draft={draft} edit={edit} />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
          {step === 0 ? <Button onClick={() => goTo(1)}>Lanjut ke catatan</Button> : (
            <>
              <Button variant="ghost" onClick={() => goTo(0)}>Kembali ke skor</Button>
              <Button onClick={review}>{draft.finalized ? "Lihat hasil" : "Tinjau finalisasi"}</Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
