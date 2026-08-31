"use client";

import { Fragment, useRef, useState, type KeyboardEvent } from "react";

import {
  calculateRiskMetrics,
  getRiskLevelLabel,
  IMPACT_LABELS,
  levelToColor,
  levelToFillColor,
  PROBABILITY_LABELS,
} from "@/lib/risk";
import type { RiskLevel } from "@/types/risk";
import { cn } from "@/lib/utils";
import { Check, ChevronRight } from "@/components/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccentButton } from "../actions/accent-button";
import { CollectionDialogCancel } from "../collections/collection-dialog-cancel";

const IMPACT_VALUES = [1, 2, 3, 4, 5] as const;
const PROBABILITY_VALUES = [5, 4, 3, 2, 1] as const;
const LEGEND_LEVELS: RiskLevel[] = [
  "sangat_rendah",
  "rendah",
  "sedang",
  "tinggi",
  "sangat_tinggi",
];
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function VerticalNumberTicker({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const digits = String(Math.round(value)).split("");

  return (
    <span
      aria-live="polite"
      aria-atomic="true"
      className={cn("inline-flex items-baseline tabular-nums", className)}
    >
      <span className="sr-only">{Math.round(value)}</span>
      <span aria-hidden="true" className="inline-flex">
        {digits.map((digit, index) => {
          const numericDigit = Number(digit);

          return (
            <span
              key={index}
              className="relative inline-block h-[1em] w-[0.62em] overflow-hidden align-baseline"
            >
              <span
                className="absolute inset-x-0 top-0 flex flex-col motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-reduce:transition-none"
                style={{ transform: `translateY(-${numericDigit}em)` }}
              >
                {DIGITS.map((nextDigit) => (
                  <span
                    key={nextDigit}
                    className="flex h-[1em] items-center justify-center"
                  >
                    {nextDigit}
                  </span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

export interface RiskScoreSelection {
  probability: number;
  impact: number;
}

export interface RiskScorePickerTriggerProps extends RiskScoreSelection {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  id?: string;
  "aria-describedby"?: string;
}

export function RiskScorePickerTrigger({
  title,
  probability,
  impact,
  onClick,
  disabled = false,
  id,
  "aria-describedby": ariaDescribedBy,
}: RiskScorePickerTriggerProps) {
  const metrics = calculateRiskMetrics(probability, impact);

  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      disabled={disabled}
      aria-describedby={ariaDescribedBy}
      aria-label={`Pilih ${title.toLowerCase()} dari heatmap. Probabilitas ${probability}, dampak ${impact}, skor ${metrics.inherentScore}.`}
      className="group flex min-h-11 w-fit max-w-full self-start items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-3xl font-mono font-medium leading-none tracking-tight text-foreground tabular-nums">
          {metrics.inherentScore}
        </span>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
            levelToColor(metrics.level),
          )}
        >
          {getRiskLevelLabel(metrics.level)}
        </span>
        <ChevronRight className="size-4 text-muted-foreground transition-transform duration-150 ease-(--ease-out) group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </div>
    </button>
  );
}

interface RiskScoreHeatmapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  probability: number;
  impact: number;
  onApply: (selection: RiskScoreSelection) => void;
}

export function RiskScoreHeatmapModal({
  open,
  onOpenChange,
  title,
  description = "Pilih kombinasi probabilitas dan dampak untuk menetapkan skor risiko.",
  probability,
  impact,
  onApply,
}: RiskScoreHeatmapModalProps) {
  const [draft, setDraft] = useState<RiskScoreSelection>({ probability, impact });
  const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const selectedMetrics = calculateRiskMetrics(draft.probability, draft.impact);

  const focusCell = (nextProbability: number, nextImpact: number) => {
    cellRefs.current[`${nextProbability}-${nextImpact}`]?.focus();
  };

  const handleCellKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    cellProbability: number,
    cellImpact: number,
  ) => {
    const rowIndex = PROBABILITY_VALUES.indexOf(cellProbability as (typeof PROBABILITY_VALUES)[number]);
    const columnIndex = IMPACT_VALUES.indexOf(cellImpact as (typeof IMPACT_VALUES)[number]);
    let nextRow = rowIndex;
    let nextColumn = columnIndex;

    if (event.key === "ArrowUp") nextRow = Math.max(0, rowIndex - 1);
    if (event.key === "ArrowDown") nextRow = Math.min(PROBABILITY_VALUES.length - 1, rowIndex + 1);
    if (event.key === "ArrowLeft") nextColumn = Math.max(0, columnIndex - 1);
    if (event.key === "ArrowRight") nextColumn = Math.min(IMPACT_VALUES.length - 1, columnIndex + 1);
    if (event.key === "Home") nextColumn = 0;
    if (event.key === "End") nextColumn = IMPACT_VALUES.length - 1;

    if (nextRow !== rowIndex || nextColumn !== columnIndex) {
      event.preventDefault();
      focusCell(PROBABILITY_VALUES[nextRow], IMPACT_VALUES[nextColumn]);
    }
  };

  const handleApply = () => {
    onApply(draft);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden sm:max-w-3xl"
        showCloseButton={false}
      >
        <DialogHeader className="gap-0">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="mt-0.5 max-w-xl">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-3 no-scrollbar sm:flex-none sm:overflow-visible">
          <div className="pb-3 sm:pb-4">
            <div className="grid grid-cols-[minmax(76px,1.2fr)_repeat(5,minmax(0,1fr))] gap-1.5 sm:grid-cols-[minmax(144px,1.35fr)_repeat(5,minmax(0,1fr))] sm:gap-2">
              <div aria-hidden="true" />
              {IMPACT_VALUES.map((impactValue) => (
                <div
                  key={impactValue}
                  className="flex min-h-12 flex-col justify-end rounded-xl px-1 py-1 text-center sm:min-h-14"
                >
                  <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                    {impactValue}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-[9px] leading-3 text-muted-foreground sm:text-[10px]">
                    {IMPACT_LABELS[impactValue]}
                  </span>
                </div>
              ))}

              {PROBABILITY_VALUES.map((probabilityValue) => (
                <Fragment key={probabilityValue}>
                  <div className="flex min-h-12 flex-col justify-center rounded-xl px-1 py-1 sm:min-h-14">
                    <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                      {probabilityValue}
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-[9px] leading-3 text-muted-foreground sm:text-[10px]">
                      {PROBABILITY_LABELS[probabilityValue]}
                    </span>
                  </div>
                  {IMPACT_VALUES.map((impactValue) => {
                    const metrics = calculateRiskMetrics(probabilityValue, impactValue);
                    const isSelected =
                      draft.probability === probabilityValue && draft.impact === impactValue;
                    const cellKey = `${probabilityValue}-${impactValue}`;

                    return (
                      <button
                        key={cellKey}
                        ref={(element) => {
                          cellRefs.current[cellKey] = element;
                        }}
                        type="button"
                        aria-label={`Probabilitas ${probabilityValue} ${PROBABILITY_LABELS[probabilityValue]}, dampak ${impactValue} ${IMPACT_LABELS[impactValue]}, skor ${metrics.inherentScore}, ${getRiskLevelLabel(metrics.level)}`}
                        aria-pressed={isSelected}
                        onClick={() =>
                          setDraft({ probability: probabilityValue, impact: impactValue })
                        }
                        onKeyDown={(event) =>
                          handleCellKeyDown(event, probabilityValue, impactValue)
                        }
                        className={cn(
                          "relative flex min-h-12 items-center justify-center rounded-xl border px-1 py-1 text-center transition-[filter,box-shadow,transform] duration-150 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.96] motion-reduce:transition-none motion-reduce:transform-none sm:min-h-14",
                          levelToColor(metrics.level),
                        isSelected ? "z-10 border-2" : "hover:brightness-95",
                      )}
                    >
                        <span className="font-mono text-base font-semibold tabular-nums sm:text-lg">
                          {metrics.inherentScore}
                        </span>
                      </button>
                    );
                  })}
                </Fragment>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 border-t border-border/40 pt-3">
              {LEGEND_LEVELS.map((level) => (
                <div key={level} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full"
                    style={{ backgroundColor: levelToFillColor(level) }}
                  />
                  {getRiskLevelLabel(level)}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Probabilitas
                </p>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-foreground">
                  <VerticalNumberTicker
                    value={draft.probability}
                    className="font-mono text-2xl font-semibold leading-none"
                  />
                  <span className="text-xs text-muted-foreground">
                    {PROBABILITY_LABELS[draft.probability]}
                  </span>
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Dampak
                </p>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-foreground">
                  <VerticalNumberTicker
                    value={draft.impact}
                    className="font-mono text-2xl font-semibold leading-none"
                  />
                  <span className="text-xs text-muted-foreground">
                    {IMPACT_LABELS[draft.impact]}
                  </span>
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Hasil
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-foreground">
                  <VerticalNumberTicker
                    value={selectedMetrics.inherentScore}
                    className="font-mono text-2xl font-semibold leading-none"
                  />
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px]",
                      levelToColor(selectedMetrics.level),
                    )}
                  >
                    {getRiskLevelLabel(selectedMetrics.level)}
                  </span>
                </p>
              </div>
          </div>
        </div>

        <DialogFooter className="!mt-4 flex-col gap-3 sm:flex-row sm:justify-end">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <CollectionDialogCancel
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none"
            >
              Batal
            </CollectionDialogCancel>
            <AccentButton
              type="button"
              onClick={handleApply}
              className="flex-1 sm:flex-none"
            >
              <Check className="size-3.5" />
              Terapkan Skor
            </AccentButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
