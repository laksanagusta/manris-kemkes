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
  changeReason?: string;
  reviewSummary?: string;
}

interface HasilPemantauanCardProps {
  form: UseFormReturn<AssessmentFormValues>;
  treatmentPlan?: {
    action?: string;
    owner?: string;
    dueDate?: string;
    frequency?: string;
  } | null;
}

export function HasilPemantauanCard({ form, treatmentPlan }: HasilPemantauanCardProps) {
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
        {treatmentPlan && (
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Rencana Penanganan (dari versi terakhir yang disetujui)
            </Label>
            {treatmentPlan.action ? (
              <div className="space-y-2 text-sm">
                <p><span className="font-medium text-muted-foreground">Tindakan:</span> {treatmentPlan.action}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <p><span className="text-muted-foreground">PIC:</span> {treatmentPlan.owner || "-"}</p>
                  <p><span className="text-muted-foreground">Tenggat Waktu:</span> {treatmentPlan.dueDate || "-"}</p>
                  <p><span className="text-muted-foreground">Frekuensi:</span> {treatmentPlan.frequency || "-"}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Belum ada rencana penanganan</p>
            )}
          </div>
        )}
        
        <TooltipProvider>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Probabilitas</Label>
              <Controller
                control={form.control}
                name="probability"
                render={({ field }) => (
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <Tooltip key={val}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => field.onChange(val)}
                            className={cn(
                              "h-14 rounded-xl border-2 text-lg font-bold transition-all",
                              val === field.value
                                ? "border-amber-600 bg-amber-50 text-amber-900"
                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
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
              {probError && (
                <span className="text-xs text-red-500 font-medium">
                  {probError.message || "Wajib diisi"}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Dampak (Residual)</Label>
              <Controller
                control={form.control}
                name="impact"
                render={({ field }) => (
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <Tooltip key={val}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => field.onChange(val)}
                            className={cn(
                              "h-14 rounded-xl border-2 text-lg font-bold transition-all",
                              val === field.value
                                ? "border-amber-600 bg-amber-50 text-amber-900"
                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
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
              {impactError && (
                <span className="text-xs text-red-500 font-medium">
                  {impactError.message || "Wajib diisi"}
                </span>
              )}
            </div>
          </div>
        </TooltipProvider>

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
