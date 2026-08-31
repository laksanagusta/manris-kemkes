"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Plus } from "@/components/ui/icons";

import {
  AccentButton,
  CollectionDialogCancel,
} from "@/components/shared/design-system";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type WorkingPaperPeriodOption = {
  value: string;
  label: string;
};

function WorkingPaperPeriodPicker({
  value,
  onValueChange,
  options,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: WorkingPaperPeriodOption[];
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="working-paper-period"
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls="working-paper-period-options"
          aria-required="true"
          className="group/risk-select h-10 w-full justify-between gap-2 rounded-lg border-input bg-card px-3 text-sm font-normal shadow-none transition-[background-color,box-shadow] active:translate-y-0 active:scale-100 aria-expanded:bg-card aria-expanded:text-foreground focus:border-input focus-visible:border-input focus:ring-0 focus-visible:ring-0 dark:focus:border-input dark:focus-visible:border-input"
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-left",
              !selected && "text-muted-foreground",
            )}
          >
            {selected?.label ?? "Pilih kuartal"}
          </span>
          <ChevronDown className="pointer-events-none size-4 shrink-0 opacity-60 transition-transform duration-150 ease-(--ease-out) group-data-[state=open]/risk-select:rotate-180 motion-reduce:transition-none" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        id="working-paper-period-options"
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-1"
      >
        <div
          role="listbox"
          aria-label="Pilihan periode kuartal"
          className="max-h-60 overflow-y-auto p-1"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                  isSelected && "bg-accent text-accent-foreground",
                )}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "size-4 shrink-0",
                    isSelected ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="min-w-0 flex-1 truncate">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function WorkingPaperCreateButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <AccentButton
      size="md"
      onClick={onClick}
      icon={<Plus className="size-3.5" strokeWidth={2.5} />}
    >
      Buat Kertas Kerja
    </AccentButton>
  );
}

export function WorkingPaperCreateDialog({
  open,
  onOpenChange,
  selectedPeriod,
  onSelectedPeriodChange,
  periodOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPeriod: string;
  onSelectedPeriodChange: (value: string) => void;
  periodOptions: WorkingPaperPeriodOption[];
}) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl no-scrollbar" showCloseButton={false}>
        <form
          className="flex min-h-0 flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!selectedPeriod) return;

            onOpenChange(false);
            router.push(`/risk/working-papers/new?cycle=${selectedPeriod}`);
          }}
        >
          <DialogHeader className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both">
            <DialogTitle className="text-base">Pilih Periode Kuartal</DialogTitle>
            <DialogDescription className="max-w-[38ch]">
              Tentukan kuartal untuk kertas kerja yang akan dibuat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[40ms]">
            <Label htmlFor="working-paper-period" className="text-sm">
              Periode Kuartal
              <span className="ml-0.5 text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <WorkingPaperPeriodPicker
              value={selectedPeriod}
              onValueChange={onSelectedPeriodChange}
              options={periodOptions}
            />
          </div>

          <DialogFooter className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[80ms] sm:flex-row">
            <CollectionDialogCancel
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </CollectionDialogCancel>
            <AccentButton type="submit" disabled={!selectedPeriod}>
              Lanjutkan
            </AccentButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
