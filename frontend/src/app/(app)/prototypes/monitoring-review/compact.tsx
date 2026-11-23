import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { baseline, NoteFields, ScoreAxes, ScoreComparison, ScoreState, type VariantProps } from "./review-parts";

export function Compact({ draft, choose, edit, openHeatmap, review }: VariantProps) {
  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Hasil Pemantauan</h2>
          <ScoreState confirmed={draft.confirmed} />
        </div>
        <NoteFields draft={draft} edit={edit} />
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-workspace p-4">
          <div className="space-y-2">
            <ScoreComparison draft={draft} />
            <ScoreAxes draft={draft} />
          </div>
          {!draft.finalized && (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => choose(baseline)}>Gunakan skor sebelumnya</Button>
              <Button size="sm" onClick={openHeatmap} aria-haspopup="dialog">Ubah skor</Button>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={review}>{draft.finalized ? "Lihat hasil" : "Tinjau finalisasi"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
