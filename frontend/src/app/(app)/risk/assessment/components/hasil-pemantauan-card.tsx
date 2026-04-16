import * as React from "react";
import { UseFormReturn, Controller } from "react-hook-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  getBobot,
  calculateNilai,
  PROBABILITY_LABELS,
  IMPACT_LABELS,
} from "@/lib/risk";

export interface AssessmentFormValues {
  probability: number;
  impact: number;
  changeReason: string;
  reviewSummary: string;
}

interface HasilPemantauanCardProps {
  form: UseFormReturn<AssessmentFormValues>;
}

export function HasilPemantauanCard({ form }: HasilPemantauanCardProps) {
  const probability = form.watch("probability");
  const impact = form.watch("impact");

  const bobot = React.useMemo(() => {
    if (!probability || !impact) return 0;
    return getBobot(probability, impact);
  }, [probability, impact]);

  const nilai = React.useMemo(() => {
    if (!probability || !impact) return 0;
    return calculateNilai(probability, impact, bobot);
  }, [probability, impact, bobot]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hasil Pemantauan</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label>Skor Probabilitas Baru</Label>
            <Controller
              control={form.control}
              name="probability"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(val) => field.onChange(Number(val))}
                >
                  <SelectTrigger data-testid="new-probability">
                    <SelectValue placeholder="Pilih Probabilitas" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((val) => (
                      <SelectItem key={val} value={String(val)}>
                        {val} - {PROBABILITY_LABELS[val]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Skor Dampak Baru</Label>
            <Controller
              control={form.control}
              name="impact"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(val) => field.onChange(Number(val))}
                >
                  <SelectTrigger data-testid="new-impact">
                    <SelectValue placeholder="Pilih Dampak" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((val) => (
                      <SelectItem key={val} value={String(val)}>
                        {val} - {IMPACT_LABELS[val]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label>Bobot (Otomatis)</Label>
            <div
              className="flex h-10 w-full items-center rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
              data-testid="new-bobot"
            >
              {bobot ? bobot.toFixed(2) : "-"}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Nilai (Otomatis)</Label>
            <div
              className="flex h-10 w-full items-center rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
              data-testid="new-nilai"
            >
              {nilai ? nilai.toFixed(2) : "-"}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Alasan Perubahan Skor</Label>
          <Controller
            control={form.control}
            name="changeReason"
            render={({ field }) => (
              <Textarea
                {...field}
                placeholder="Tuliskan alasan mengapa skor probabilitas/dampak diubah..."
                className="min-h-[100px]"
              />
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Ringkasan Review / Saran Tindak Lanjut</Label>
          <Controller
            control={form.control}
            name="reviewSummary"
            render={({ field }) => (
              <Textarea
                {...field}
                placeholder="Tuliskan ringkasan dari hasil review dan rekomendasi tindakan..."
                className="min-h-[100px]"
              />
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
