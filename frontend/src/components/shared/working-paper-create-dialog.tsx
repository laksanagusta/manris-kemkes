"use client";

import { useRouter } from "next/navigation";
import { Plus } from "@/components/ui/icons";

import {
  AccentButton,
  ActionButton,
} from "@/components/shared/design-system";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type WorkingPaperPeriodOption = {
  value: string;
  label: string;
};

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pilih Periode Kuartal</DialogTitle>
          <DialogDescription>
            Tentukan kuartal untuk kertas kerja yang akan dibuat.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select
            value={selectedPeriod}
            onValueChange={onSelectedPeriodChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih kuartal" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <ActionButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Batal
          </ActionButton>
          <AccentButton
            size="sm"
            disabled={!selectedPeriod}
            onClick={() => {
              onOpenChange(false);
              router.push(`/risk/working-papers/new?cycle=${selectedPeriod}`);
            }}
          >
            Lanjutkan
          </AccentButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
