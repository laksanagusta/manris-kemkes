"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

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

export type WorkingPaperSemesterOption = {
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
  selectedSemester,
  onSelectedSemesterChange,
  semesterOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSemester: string;
  onSelectedSemesterChange: (value: string) => void;
  semesterOptions: WorkingPaperSemesterOption[];
}) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] rounded-2xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pilih Periode Semester</DialogTitle>
          <DialogDescription>
            Tentukan semester untuk kertas kerja yang akan dibuat.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select
            value={selectedSemester}
            onValueChange={onSelectedSemesterChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih semester" />
            </SelectTrigger>
            <SelectContent>
              {semesterOptions.map((option) => (
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
            disabled={!selectedSemester}
            onClick={() => {
              onOpenChange(false);
              router.push(`/risk/working-papers/new?cycle=${selectedSemester}`);
            }}
          >
            Lanjutkan
          </AccentButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
