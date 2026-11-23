import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InlineHeatmap, NoteFields, ReviewSummary, type VariantProps } from "./review-parts";

export function SideBySide({ draft, choose, edit, review }: VariantProps) {
  return (
    <div className="@container space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-base font-semibold">Hasil Pemantauan</h2>
          <div className="grid gap-6 @min-[39rem]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-lg border border-border bg-workspace p-3 sm:p-4">
              <InlineHeatmap draft={draft} choose={choose} />
            </div>
            <div className="flex flex-col justify-between gap-4">
              <NoteFields draft={draft} edit={edit} />
              <Button className="self-end" variant="outline" onClick={review}>{draft.finalized ? "Lihat hasil" : "Tinjau finalisasi"}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <ReviewSummary draft={draft} />
    </div>
  );
}
