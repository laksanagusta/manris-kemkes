import * as React from "react";
import { UseFormReturn, Controller, FieldError } from "react-hook-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  getBobot,
  calculateNilai,
  getRiskLevelFromNilai,
  levelToColor,
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
  const probError = form.formState.errors.probability;
  const impactError = form.formState.errors.impact;

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
        <TooltipProvider>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Skor Probabilitas Baru</Label>
                {probError && (
                  <span className="text-xs text-red-500 font-medium">
                    {probError.message || "Wajib diisi"}
                  </span>
                )}
              </div>
              <Controller
                control={form.control}
                name="probability"
                render={({ field }) => (
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <Tooltip key={val}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => field.onChange(val)}
                            className={cn(
                              "h-10 rounded-lg border text-sm font-semibold transition-colors",
                              val === field.value
                                ? `${levelToColor(getRiskLevelFromNilai(calculateNilai(val, impact, getBobot(val, impact))))} ring-1 font-bold`
                                : "bg-muted/30 hover:bg-muted/50"
                            )}
                            data-testid={val === field.value ? "new-probability" : undefined}
                          >
                            {val}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {PROBABILITY_LABELS[val]}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Skor Dampak Baru</Label>
                {impactError && (
                  <span className="text-xs text-red-500 font-medium">
                    {impactError.message || "Wajib diisi"}
                  </span>
                )}
              </div>
              <Controller
                control={form.control}
                name="impact"
                render={({ field }) => (
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <Tooltip key={val}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => field.onChange(val)}
                            className={cn(
                              "h-10 rounded-lg border text-sm font-semibold transition-colors",
                              val === field.value
                                ? `${levelToColor(getRiskLevelFromNilai(calculateNilai(probability, val, getBobot(probability, val))))} ring-1 font-bold`
                                : "bg-muted/30 hover:bg-muted/50"
                            )}
                            data-testid={val === field.value ? "new-impact" : undefined}
                          >
                            {val}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {IMPACT_LABELS[val]}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                )}
              />
            </div>
          </div>
        </TooltipProvider>

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
