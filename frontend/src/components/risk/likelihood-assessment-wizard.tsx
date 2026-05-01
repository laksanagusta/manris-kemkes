"use client";

import { useState } from "react";
import { CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  LikelihoodMethod,
  FrequencyType,
  LikelihoodAssessmentInput,
} from "@/types/likelihood-assessment";
import {
  LIKELIHOOD_METHOD_LABELS,
  LIKELIHOOD_METHOD_DESCRIPTIONS,
  FREQUENCY_TYPE_LABELS,
  FREQUENCY_TYPE_DESCRIPTIONS,
  PROBABILITY_LABELS,
} from "@/types/likelihood-assessment";

export interface LikelihoodWizardValue {
  method: LikelihoodMethod;
  frequencyType: FrequencyType;
  observationPeriodMonths: number;
  eventCount?: number;
  populationCount?: number;
  selectedProbabilityLevel: number;
  justification: string;
  dataSource: string;
  recommendedLevel: number;
}

interface LikelihoodAssessmentWizardProps {
  value?: LikelihoodWizardValue;
  onChange?: (value: LikelihoodWizardValue) => void;
  onConfirm?: (assessment: LikelihoodAssessmentInput) => void;
  disabled?: boolean;
  compact?: boolean;
}

function resolveLikelihoodLevel(
  method: LikelihoodMethod,
  frequencyType: FrequencyType,
  eventCount: number,
  populationCount: number,
  observationMonths: number
): number {
  if (method === "frequency" || method === "probability") {
    if (observationMonths <= 0) return 3;

    if (method === "probability" && populationCount > 0) {
      const P =
        (eventCount / populationCount) * 100 * (12 / observationMonths);
      if (P <= 1) return 1;
      if (P <= 10) return 2;
      if (P <= 20) return 3;
      if (P <= 50) return 4;
      return 5;
    }

    if (frequencyType === "low_frequency") {
      const annualRate = (eventCount * 12) / observationMonths;
      if (eventCount === 0) return 1;
      if (annualRate >= 1.0) return 5;
      if (annualRate >= 0.5) return 4;
      if (annualRate >= 0.33) return 3;
      return 2;
    }

    // non-low frequency
    if (eventCount < 2) return 1;
    if (eventCount <= 5) return 2;
    if (eventCount <= 9) return 3;
    if (eventCount <= 12) return 4;
    return 5;
  }

  return 3; // non-data methods default to 3
}

export function LikelihoodAssessmentWizard({
  value,
  onChange,
  disabled = false,
  compact = false,
}: LikelihoodAssessmentWizardProps) {
  const [method, setMethod] = useState<LikelihoodMethod>(
    value?.method ?? "frequency"
  );
  const [frequencyType, setFrequencyType] = useState<FrequencyType>(
    value?.frequencyType ?? "non_low_frequency"
  );
  const [observationMonths, setObservationMonths] = useState<number>(
    value?.observationPeriodMonths ?? 12
  );
  const [eventCount, setEventCount] = useState<number>(
    value?.eventCount ?? 0
  );
  const [populationCount, setPopulationCount] = useState<number>(
    value?.populationCount ?? 0
  );
  const [selectedLevel, setSelectedLevel] = useState<number>(
    value?.selectedProbabilityLevel ?? 3
  );
  const [justification, setJustification] = useState<string>(
    value?.justification ?? ""
  );
  const [dataSource, setDataSource] = useState<string>(
    value?.dataSource ?? ""
  );
  const [showWizard, setShowWizard] = useState(!!value);

  const recommendedLevel = resolveLikelihoodLevel(
    method,
    frequencyType,
    eventCount,
    populationCount,
    observationMonths
  );

  const needsJustification =
    method === "expert_judgement" ||
    method === "benchmarking" ||
    method === "consensus";

  const needsPopulation =
    method === "probability" && populationCount > 0;

  const canConfirm =
    selectedLevel >= 1 &&
    selectedLevel <= 5 &&
    (method === "frequency" ||
      method === "probability" ||
      justification.trim().length > 0);

  function handleFrequencyTypeChange(ft: FrequencyType) {
    setFrequencyType(ft);
    if (ft === "low_frequency") {
      setObservationMonths(60);
    } else {
      setObservationMonths(12);
    }
    setSelectedLevel(recommendedLevel);
  }

  function handleConfirm() {
    const result: LikelihoodWizardValue = {
      method,
      frequencyType,
      observationPeriodMonths: observationMonths,
      eventCount: method === "frequency" || method === "probability" ? eventCount : undefined,
      populationCount:
        method === "probability" ? populationCount : undefined,
      selectedProbabilityLevel: selectedLevel,
      justification: method === "frequency" || method === "probability" ? dataSource : justification,
      dataSource,
      recommendedLevel,
    };
    onChange?.(result);
    setShowWizard(false);
  }

  function handleClear() {
    onChange?.({
      method: "frequency",
      frequencyType: "non_low_frequency",
      observationPeriodMonths: 12,
      eventCount: 0,
      selectedProbabilityLevel: 3,
      justification: "",
      dataSource: "",
      recommendedLevel: 3,
    });
  }

  const triggerLabel = value
    ? `${LIKELIHOOD_METHOD_LABELS[value.method]} — Level ${value.selectedProbabilityLevel} (${PROBABILITY_LABELS[value.selectedProbabilityLevel]})`
    : "Tetapkan Level Kemungkinan";

  if (!showWizard && !compact) {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowWizard(true)}
          disabled={disabled}
          className="w-full justify-start text-left h-auto py-2"
        >
          {value ? (
            <div className="flex w-full items-center justify-between">
              <span className="text-sm">{triggerLabel}</span>
              <CheckCircle2 className="size-4 text-success shrink-0 ml-2" />
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              {triggerLabel}
            </span>
          )}
        </Button>
        {value && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowWizard(true)}
              disabled={disabled}
              className="text-xs h-7"
            >
              Ubah
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              className="text-xs h-7 text-destructive hover:text-destructive"
            >
              Hapus
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              Penentuan Level Kemungkinan
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-5 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Petunjuk"
                >
                  <Info className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="max-w-xs text-xs"
              >
                Tentukan level kemungkinan berdasarkan data historis
                kejadian atau pendapat ahli. Pilihan UPR dapat berbeda dari
                rekomendasi sistem denganJustifikasi yang memadai.
              </TooltipContent>
            </Tooltip>
          </div>
          {value && !compact && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              className="text-xs h-7 text-destructive hover:text-destructive"
            >
              Reset
            </Button>
          )}
        </div>
      )}

      <Tabs
        value={method}
        onValueChange={(v) => {
          setMethod(v as LikelihoodMethod);
          setSelectedLevel(3);
          setJustification("");
        }}
        className="w-full"
      >
        <TabsList
          className={cn(
            "grid grid-cols-5 gap-1 h-auto p-1 bg-muted/50",
            compact ? "grid-cols-3" : ""
          )}
        >
          {(compact
            ? (
                [
                  "frequency",
                  "probability",
                  "expert_judgement",
                ] as LikelihoodMethod[]
              )
            : (
                [
                  "frequency",
                  "probability",
                  "expert_judgement",
                  "benchmarking",
                  "consensus",
                ] as LikelihoodMethod[]
              )
          ).map((m) => (
            <TabsTrigger
              key={m}
              value={m}
              className={cn(
                "text-xs py-1.5 px-2 rounded-md transition-colors",
                compact && "text-[11px] py-1"
              )}
            >
              {LIKELIHOOD_METHOD_LABELS[m]}
            </TabsTrigger>
          ))}
        </TabsList>

        {(![
          "expert_judgement",
          "benchmarking",
          "consensus",
        ].includes(method) || !compact) &&
          (
            [
              "frequency",
              "probability",
              "expert_judgement",
              "benchmarking",
              "consensus",
            ] as LikelihoodMethod[]
          ).map((m) => (
            <TabsContent key={m} value={m} className="space-y-3 pt-2">
              {/* Frequency Type selector for frequency/probability */}
              {m === "frequency" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Tipe Frekuensi
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      ["non_low_frequency", "low_frequency"] as FrequencyType[]
                    ).map((ft) => (
                      <button
                        key={ft}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleFrequencyTypeChange(ft)}
                        className={cn(
                          "rounded-lg border p-2.5 text-left transition-colors text-xs",
                          frequencyType === ft
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        <p className="font-medium">{FREQUENCY_TYPE_LABELS[ft]}</p>
                        <p className="mt-0.5 text-muted-foreground leading-relaxed">
                          {ft === "non_low_frequency"
                            ? "Intensitas sedang/tinggi, periode pengamatan 12 bulan"
                            : "Intensitas sangat rendah, periode pengamatan 60 bulan"}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Frequency inputs */}
              {(m === "frequency" || m === "probability") && (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Periode Pengamatan
                        <span className="text-destructive ml-0.5">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={observationMonths}
                          onChange={(e) => {
                            const v = parseInt(e.target.value) || 12;
                            setObservationMonths(v);
                            setSelectedLevel(
                              resolveLikelihoodLevel(
                                m,
                                frequencyType,
                                eventCount,
                                populationCount,
                                v
                              )
                            );
                          }}
                          disabled={disabled}
                          className="h-9 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          bulan
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Jumlah Kejadian
                        <span className="text-destructive ml-0.5">*</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={eventCount}
                        onChange={(e) => {
                          const v = parseInt(e.target.value) || 0;
                          setEventCount(v);
                          setSelectedLevel(
                            resolveLikelihoodLevel(
                              m,
                              frequencyType,
                              v,
                              populationCount,
                              observationMonths
                            )
                          );
                        }}
                        disabled={disabled}
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Jumlah kejadian"
                      />
                    </div>
                  </div>

                  {m === "probability" && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Total Populasi
                        <span className="text-destructive ml-0.5">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={populationCount || ""}
                        onChange={(e) => {
                          const v = parseInt(e.target.value) || 0;
                          setPopulationCount(v);
                          setSelectedLevel(
                            resolveLikelihoodLevel(
                              m,
                              frequencyType,
                              eventCount,
                              v,
                              observationMonths
                            )
                          );
                        }}
                        disabled={disabled}
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Total populasi yang berisiko"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Untuk menghitung probabilitas: event count / population count ×
                        100
                      </p>
                    </div>
                  )}

                  {/* Data source */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Sumber Data
                    </label>
                    <input
                      type="text"
                      value={dataSource}
                      onChange={(e) => setDataSource(e.target.value)}
                      disabled={disabled}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Contoh: Sistem pelaporan insiden 2024-2025"
                    />
                  </div>
                </div>
              )}

              {/* Non-data methods */}
              {needsJustification && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {LIKELIHOOD_METHOD_DESCRIPTIONS[m]}
                  </p>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Justifikasi
                      <span className="text-destructive ml-0.5">*</span>
                    </label>
                    <textarea
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      disabled={disabled}
                      rows={3}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      placeholder="Jelaskan dasar penilaian level kemungkinan..."
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
      </Tabs>

      {/* Level selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {![
              "expert_judgement",
              "benchmarking",
              "consensus",
            ].includes(method)
              ? "Rekomendasi Sistem"
              : "Level Kemungkinan"}
          </span>
          {![
            "expert_judgement",
            "benchmarking",
            "consensus",
          ].includes(method) && (
            <span className="text-xs text-muted-foreground">
              Rekomendasi:{" "}
              <span className="font-semibold text-foreground">
                Level {recommendedLevel} — {PROBABILITY_LABELS[recommendedLevel]}
              </span>
            </span>
          )}
        </div>

        {/* Recommendation notice */}
        {![
          "expert_judgement",
          "benchmarking",
          "consensus",
        ].includes(method) && (
          <div
            className={cn(
              "rounded-lg border p-2.5 text-xs",
              selectedLevel === recommendedLevel
                ? "border-success/30 bg-success/5 text-success"
                : "border-amber-300/50 bg-amber-50 text-amber-800"
            )}
          >
            {selectedLevel === recommendedLevel ? (
              <p className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 shrink-0" />
                Level sesuai rekomendasi sistem.
              </p>
            ) : (
              <p className="flex items-center gap-1.5">
                <Info className="size-3.5 shrink-0" />
                Level berbeda dari rekomendasi ({recommendedLevel}).{" "}
                {needsJustification
                  ? "Justifikasi akan dicatat."
                  : "Pastikan justifikasi memadai."}
              </p>
            )}
          </div>
        )}

        {/* Level buttons */}
        <div className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              key={val}
              type="button"
              disabled={disabled}
              onClick={() => setSelectedLevel(val)}
              className={cn(
                "h-9 rounded-lg border text-xs font-semibold transition-all",
                val === selectedLevel
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-muted/30 hover:bg-muted/50 text-muted-foreground"
              )}
            >
              {val}
              <br />
              <span className="text-[10px] font-normal opacity-80 leading-tight">
                {PROBABILITY_LABELS[val]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          onClick={handleConfirm}
          disabled={disabled || !canConfirm}
          className="h-8 text-xs"
        >
          Konfirmasi
        </Button>
        {!compact && value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowWizard(false)}
            disabled={disabled}
            className="h-8 text-xs"
          >
            Batal
          </Button>
        )}
      </div>
    </div>
  );
}
