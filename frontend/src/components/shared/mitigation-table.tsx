"use client";

import { useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { RemoteUserPicker } from "@/components/risk/remote-user-picker";
import type { UserPickerOption } from "@/lib/risk-register-user-picker";

export interface MitigationItem {
  id?: string;
  action: string;
  owner: string;
  treatmentOwnerId?: string;
  externalPicId?: string;
  dueDate: string;
}

type RemoteUserPickerResult = {
  options: UserPickerOption[];
  total: number;
  page: number;
  limit: number;
};

interface MitigationTableProps {
  items: MitigationItem[];
  onChange: (items: MitigationItem[]) => void;
  disabled?: boolean;
  loadPicOptions?: (params: {
    q: string;
    page: number;
    limit: number;
  }) => Promise<RemoteUserPickerResult>;
}

export function MitigationTable({ 
  items, 
  onChange, 
  disabled, 
  loadPicOptions,
}: MitigationTableProps) {
  const addItem = () => {
    onChange([...items, { action: "", owner: "", dueDate: "" }]);
  };

  const updateItem = (index: number, field: keyof MitigationItem, value: string | number | undefined) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handlePicSelect = useCallback(
    (index: number, option: UserPickerOption) => {
      const updated = [...items];
      updated[index] = {
        ...updated[index],
        treatmentOwnerId: option.id,
        externalPicId: undefined,
        owner: option.name,
      };
      onChange(updated);
    },
    [items, onChange],
  );

  const picValues = useMemo(
    () =>
      items.map((item): UserPickerOption | null => {
        const id = item.treatmentOwnerId ?? item.externalPicId;
        if (!id || !item.owner) return null;
        return { id, name: item.owner };
      }),
    [items],
  );

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-lg border border-border/50 bg-muted/10 p-3 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <span className="shrink-0 mt-1 text-xs font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center">
              {index + 1}
            </span>
            <div className="flex-1">
              <Input
                value={item.action || ""}
                onChange={(e) => updateItem(index, "action", e.target.value)}
                placeholder="Uraian rencana penanganan..."
                className="text-sm bg-background border-border/50"
                disabled={disabled}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-destructive/50 hover:text-destructive hover:bg-destructive/10 h-8 w-8"
              onClick={() => removeItem(index)}
              disabled={disabled}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-7">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">PIC</Label>
              {loadPicOptions ? (
                <RemoteUserPicker
                  title="Pilih PIC"
                  description="Cari dan pilih PIC untuk rencana penanganan ini"
                  placeholder="Pilih PIC"
                  searchPlaceholder="Cari nama PIC..."
                  emptyMessage="Tidak ada user ditemukan."
                  disabled={disabled}
                  value={picValues[index]}
                  onSelect={(option) => handlePicSelect(index, option)}
                  loadOptions={loadPicOptions}
                />
              ) : (
                <Input
                  value={item.owner || ""}
                  onChange={(e) => {
                    const updated = [...items];
                    updated[index] = { ...updated[index], owner: e.target.value };
                    onChange(updated);
                  }}
                  placeholder="Nama PIC"
                  className="h-8 text-sm bg-background border-border/50"
                  disabled={disabled}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Due Date Laporan</Label>
              <Input
                type="date"
                value={item.dueDate || ""}
                onChange={(e) => updateItem(index, "dueDate", e.target.value)}
                className="h-8 text-sm bg-background border-border/50"
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        disabled={disabled}
        className="w-full border-dashed gap-2 text-xs text-muted-foreground hover:text-primary hover:border-primary/50"
      >
        <Plus className="size-3.5" />
        Tambah Rencana Penanganan
      </Button>
    </div>
  );
}
