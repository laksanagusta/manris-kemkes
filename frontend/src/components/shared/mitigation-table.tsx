"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RemoteUserPicker } from "@/components/risk/remote-user-picker";
import type { UserPickerOption } from "@/lib/risk-register-user-picker";
import type { MitigationType } from "@/types/risk";

export interface MitigationItem {
  id?: string;
  action: string;
  owner: string;
  treatmentOwnerId?: string;
  externalPicId?: string;
  dueDate: string;
  frequency?: string;
  recurringInterval?: string;
  reportDay?: number;
  reportDate?: number;
  executionScheduleText?: string;
  targetCost?: number;
  mitigationType?: MitigationType;
  activityStage?: string;
  expectedOutput?: string;
  quantitativeTarget?: string;
  supportingUnit?: string;
  resourcesRequired?: string;
  contingencyPlan?: string;
  potentialObstacle?: string;
  costBenefitNote?: string;
  isBreakthroughActivity?: boolean;
  isExistingControl?: boolean;
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
  actionErrors?: Array<string | undefined>;
  loadPicOptions?: (params: {
    q: string;
    page: number;
    limit: number;
  }) => Promise<RemoteUserPickerResult>;
}

const emptyMitigation = (): MitigationItem => ({
  action: "",
  owner: "",
  dueDate: "",
  mitigationType: "reduce_probability",
  activityStage: "",
  expectedOutput: "",
  quantitativeTarget: "",
  supportingUnit: "",
  resourcesRequired: "",
  contingencyPlan: "",
  potentialObstacle: "",
  costBenefitNote: "",
  isBreakthroughActivity: false,
  isExistingControl: false,
});

const mitigationTypeOptions: Array<{ value: MitigationType; label: string }> = [
  { value: "reduce_probability", label: "Turunkan probabilitas" },
  { value: "reduce_impact", label: "Turunkan dampak" },
  { value: "reduce_both", label: "Turunkan probabilitas dan dampak" },
];

export function MitigationTable({
  items,
  onChange,
  disabled,
  actionErrors,
  loadPicOptions,
}: MitigationTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const addItem = () => {
    onChange([...items, emptyMitigation()]);
  };

  const updateItem = (
    index: number,
    field: keyof MitigationItem,
    value: string | number | boolean | undefined,
  ) => {
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
      {items.map((item, index) => {
        const expanded = expandedRows[index] ?? false;
        return (
          <div key={index} className="rounded-xl border border-border/50 bg-muted/10 p-3 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </span>
              <div className="flex-1 space-y-2">
                <Input
                  value={item.action || ""}
                  onChange={(e) => updateItem(index, "action", e.target.value)}
                  placeholder="Uraian rencana penanganan..."
                  className="text-sm bg-background border-border/50"
                  disabled={disabled}
                />
                {actionErrors?.[index] ? (
                  <p className="text-xs font-medium text-destructive">
                    {actionErrors[index]}
                  </p>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10"
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
                    onChange={(e) => updateItem(index, "owner", e.target.value)}
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

            <div className="pl-7">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setExpandedRows((prev) => ({ ...prev, [index]: !expanded }))
                }
                disabled={disabled}
                className="h-7 gap-2 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {expanded ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
                {expanded ? "Sembunyikan rincian" : "Rincian mitigasi"}
              </Button>
            </div>

            {expanded ? (
              <div className="pl-7 space-y-3">
                {disabled ? (
                  <p className="text-xs text-muted-foreground">
                    Rincian ini hanya baca di halaman tinjauan. Untuk mengubah isi, buka mode edit risiko.
                  </p>
                ) : null}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tipe mitigasi</Label>
                    <Select
                      value={item.mitigationType ?? "reduce_probability"}
                      onValueChange={(value) =>
                        updateItem(index, "mitigationType", value as MitigationType)
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-9 text-sm bg-background border-border/50">
                        <SelectValue placeholder="Pilih tipe mitigasi" />
                      </SelectTrigger>
                      <SelectContent>
                        {mitigationTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tahap aktivitas</Label>
                    <Input
                      value={item.activityStage || ""}
                      onChange={(e) => updateItem(index, "activityStage", e.target.value)}
                      placeholder="Contoh: persiapan, pelaksanaan, monitoring"
                      className="h-9 text-sm bg-background border-border/50"
                      disabled={disabled}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Output yang diharapkan</Label>
                    <Textarea
                      value={item.expectedOutput || ""}
                      onChange={(e) => updateItem(index, "expectedOutput", e.target.value)}
                      placeholder="Tuliskan output yang ingin dicapai..."
                      className="min-h-20 text-sm bg-background border-border/50"
                      disabled={disabled}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Target kuantitatif</Label>
                    <Textarea
                      value={item.quantitativeTarget || ""}
                      onChange={(e) => updateItem(index, "quantitativeTarget", e.target.value)}
                      placeholder="Contoh: 100% unit terdokumentasi, SLA < 5 hari..."
                      className="min-h-20 text-sm bg-background border-border/50"
                      disabled={disabled}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Unit pendukung</Label>
                    <Input
                      value={item.supportingUnit || ""}
                      onChange={(e) => updateItem(index, "supportingUnit", e.target.value)}
                      placeholder="Contoh: Subdit Surveilans, Biro Umum"
                      className="h-9 text-sm bg-background border-border/50"
                      disabled={disabled}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Sumber daya dibutuhkan</Label>
                    <Textarea
                      value={item.resourcesRequired || ""}
                      onChange={(e) => updateItem(index, "resourcesRequired", e.target.value)}
                      placeholder="SDM, anggaran, sistem, atau alat bantu yang diperlukan"
                      className="min-h-20 text-sm bg-background border-border/50"
                      disabled={disabled}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Rencana kontinjensi</Label>
                    <Textarea
                      value={item.contingencyPlan || ""}
                      onChange={(e) => updateItem(index, "contingencyPlan", e.target.value)}
                      placeholder="Langkah cadangan jika rencana utama tidak berjalan"
                      className="min-h-20 text-sm bg-background border-border/50"
                      disabled={disabled}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Hambatan potensial</Label>
                    <Textarea
                      value={item.potentialObstacle || ""}
                      onChange={(e) => updateItem(index, "potentialObstacle", e.target.value)}
                      placeholder="Risiko implementasi, penolakan, keterbatasan kapasitas"
                      className="min-h-20 text-sm bg-background border-border/50"
                      disabled={disabled}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Catatan cost-benefit</Label>
                    <Textarea
                      value={item.costBenefitNote || ""}
                      onChange={(e) => updateItem(index, "costBenefitNote", e.target.value)}
                      placeholder="Ringkasan sederhana manfaat dibanding biaya"
                      className="min-h-20 text-sm bg-background border-border/50"
                      disabled={disabled}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                      <Checkbox
                        checked={Boolean(item.isBreakthroughActivity)}
                        onCheckedChange={(checked) =>
                          updateItem(index, "isBreakthroughActivity", checked === true)
                        }
                        disabled={disabled}
                      />
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Breakthrough activity</Label>
                        <p className="text-xs text-muted-foreground">
                          Tandai jika ini aktivitas inovatif/terobosan.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                      <Checkbox
                        checked={Boolean(item.isExistingControl)}
                        onCheckedChange={(checked) =>
                          updateItem(index, "isExistingControl", checked === true)
                        }
                        disabled={disabled}
                      />
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Existing control</Label>
                        <p className="text-xs text-muted-foreground">
                          Centang jika baris ini adalah kontrol yang sudah ada, bukan mitigasi baru.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        disabled={disabled}
        className="w-full gap-2 border-dashed text-xs text-muted-foreground hover:border-primary/50 hover:text-primary"
      >
        <Plus className="size-3.5" />
        Tambah Rencana Penanganan
      </Button>
    </div>
  );
}
