"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "@/components/shared/icons";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RemoteUserPicker } from "@/components/risk/remote-user-picker";
import { Input, Textarea } from "@/components/shared/design-system";
import { CollectionTableHead } from "@/components/shared/design-system/collections/collection-table-head";
import { CollectionTableHeader } from "@/components/shared/design-system/collections/collection-table-header";
import { CollectionTableHeaderRow } from "@/components/shared/design-system/collections/collection-table-header-row";
import { cn } from "@/lib/utils";
import type { UserPickerOption } from "@/lib/risk-register-user-picker";
import type { MitigationType } from "@/types/risk";

export interface MitigationItem {
  id?: string;
  action: string;
  owner: string;
  ownerUserId?: string;
  treatmentOwnerId?: string;
  externalPicId?: string;
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
  showPlaceholders?: boolean;
  loadPicOptions?: (params: {
    q: string;
    page: number;
    limit: number;
  }) => Promise<RemoteUserPickerResult>;
}

const emptyMitigation = (): MitigationItem => ({
  action: "",
  owner: "",
  mitigationType: "reduce_probability",
  activityStage: "",
  expectedOutput: "",
  quantitativeTarget: "",
  supportingUnit: "",
  resourcesRequired: "",
  contingencyPlan: "",
  potentialObstacle: "",
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
  showPlaceholders = true,
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
        ownerUserId: option.id,
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
        const selectedId =
          item.ownerUserId ??
          item.treatmentOwnerId ??
          item.externalPicId ??
          item.owner;

        if (!selectedId) {
          return null;
        }

        return {
          id: selectedId,
          name: item.owner || selectedId,
        };
      }),
    [items],
  );

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 bg-muted/10 px-4 py-8 text-left">
          <p className="text-xs text-muted-foreground">
            Belum ada rencana mitigasi.
          </p>
        </div>
      ) : (
        <div className="w-full min-w-0 overflow-hidden rounded-lg border border-border/60">
          <Table className="w-full table-fixed">
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[22%]" />
              <col className="w-[18%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
            </colgroup>
            <CollectionTableHeader density="compact">
              <CollectionTableHeaderRow>
                <CollectionTableHead className="px-24">
                  Rencana Penanganan
                </CollectionTableHead>
                <CollectionTableHead >PIC</CollectionTableHead>
                <CollectionTableHead >Tipe</CollectionTableHead>
                <CollectionTableHead >Detail</CollectionTableHead>
                <CollectionTableHead className="sticky right-0 z-10 w-[84px] bg-table-header text-center">
                  <span className="sr-only">Aksi</span>
                </CollectionTableHead>
              </CollectionTableHeaderRow>
            </CollectionTableHeader>
            <TableBody>
              {items.map((item, index) => {
                const expanded = expandedRows[index] ?? false;

                return (
                  <Fragment key={item.id ?? `mitigation-${index}`}>
                    <TableRow
                      style={{ animationDelay: `${index * 30}ms` }}
                      className={cn(
                        "group h-10 border-0 hover:bg-muted/50",
                        expanded && "bg-muted/20 hover:bg-muted/20",
                      )}
                    >
                      <TableCell className="px-24">
                        <div className="space-y-1">
                          <Input
                            value={item.action || ""}
                            onChange={(event) =>
                              updateItem(index, "action", event.target.value)
                            }
                            placeholder={showPlaceholders ? "Uraian rencana penanganan..." : undefined}
                            className=""
                            disabled={disabled}
                          />
                          {actionErrors?.[index] ? (
                            <p className="text-[11px] font-medium text-destructive">
                              {actionErrors[index]}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {loadPicOptions ? (
                          <RemoteUserPicker
                            title="Pilih PIC"
                            description="Cari dan pilih PIC untuk rencana penanganan ini"
                            placeholder="Pilih PIC"
                            searchPlaceholder={showPlaceholders ? "Cari nama PIC..." : undefined}
                            emptyMessage="Tidak ada user ditemukan."
                            disabled={disabled}
                            value={picValues[index]}
                            onSelect={(option) => handlePicSelect(index, option)}
                            loadOptions={loadPicOptions}
                          />
                        ) : (
                          <Input
                            value={item.owner || ""}
                            onChange={(event) =>
                              updateItem(index, "owner", event.target.value)
                            }
                            placeholder={showPlaceholders ? "Nama PIC" : undefined}
                            className=""
                            disabled={disabled}
                          />
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <Select
                          value={item.mitigationType ?? "reduce_probability"}
                          onValueChange={(value) =>
                            updateItem(
                              index,
                              "mitigationType",
                              value as MitigationType,
                            )
                          }
                          disabled={disabled}
                        >
                          <SelectTrigger className="">
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
                      </TableCell>
                      <TableCell className="align-top">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className=""
                          onClick={() =>
                            setExpandedRows((previous) => ({
                              ...previous,
                              [index]: !expanded,
                            }))
                          }
                          disabled={disabled}
                        >
                          {expanded ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )}
                          {expanded ? "Sembunyikan" : "Rincian"}
                        </Button>
                      </TableCell>
                      <TableCell className="sticky right-0 align-top transition-colors group-hover:bg-muted/50">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-8"
                          onClick={() => removeItem(index)}
                          disabled={disabled}
                          aria-label={`Hapus rencana mitigasi ${index + 1}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>

                    {expanded ? (
                      <TableRow className="">
                        <TableCell colSpan={5} className="">
                          <div className="border-t border-border/50 px-4 py-4">
                            {disabled ? (
                              <p className="mb-3 text-xs text-muted-foreground">
                                Rincian ini hanya baca di halaman tinjauan. Untuk
                                mengubah isi, buka mode edit risiko.
                              </p>
                            ) : null}

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  Tahap aktivitas
                                </Label>
                                <Input
                                  value={item.activityStage || ""}
                                  onChange={(event) =>
                                    updateItem(
                                      index,
                                      "activityStage",
                                      event.target.value,
                                    )
                                  }
                                  placeholder={showPlaceholders ? "Contoh: persiapan, pelaksanaan, monitoring" : undefined}
                                  className=""
                                  disabled={disabled}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  Unit pendukung
                                </Label>
                                <Input
                                  value={item.supportingUnit || ""}
                                  onChange={(event) =>
                                    updateItem(
                                      index,
                                      "supportingUnit",
                                      event.target.value,
                                    )
                                  }
                                  placeholder={showPlaceholders ? "Contoh: Subdit Surveilans, Biro Umum" : undefined}
                                  className=""
                                  disabled={disabled}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  Output yang diharapkan
                                </Label>
                                <Textarea
                                  value={item.expectedOutput || ""}
                                  onChange={(event) =>
                                    updateItem(
                                      index,
                                      "expectedOutput",
                                      event.target.value,
                                    )
                                  }
                                  placeholder={showPlaceholders ? "Tuliskan output yang ingin dicapai..." : undefined}
                                  className=""
                                  disabled={disabled}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  Target kuantitatif
                                </Label>
                                <Textarea
                                  value={item.quantitativeTarget || ""}
                                  onChange={(event) =>
                                    updateItem(
                                      index,
                                      "quantitativeTarget",
                                      event.target.value,
                                    )
                                  }
                                  placeholder={showPlaceholders ? "Contoh: 100% unit terdokumentasi, SLA < 5 hari..." : undefined}
                                  className=""
                                  disabled={disabled}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  Sumber daya dibutuhkan
                                </Label>
                                <Textarea
                                  value={item.resourcesRequired || ""}
                                  onChange={(event) =>
                                    updateItem(
                                      index,
                                      "resourcesRequired",
                                      event.target.value,
                                    )
                                  }
                                  placeholder={showPlaceholders ? "SDM, anggaran, sistem, atau alat bantu yang diperlukan" : undefined}
                                  className=""
                                  disabled={disabled}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  Rencana kontinjensi
                                </Label>
                                <Textarea
                                  value={item.contingencyPlan || ""}
                                  onChange={(event) =>
                                    updateItem(
                                      index,
                                      "contingencyPlan",
                                      event.target.value,
                                    )
                                  }
                                  placeholder={showPlaceholders ? "Langkah cadangan jika rencana utama tidak berjalan" : undefined}
                                  className=""
                                  disabled={disabled}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  Hambatan potensial
                                </Label>
                                <Textarea
                                  value={item.potentialObstacle || ""}
                                  onChange={(event) =>
                                    updateItem(
                                      index,
                                      "potentialObstacle",
                                      event.target.value,
                                    )
                                  }
                                  placeholder={showPlaceholders ? "Risiko implementasi, penolakan, keterbatasan kapasitas" : undefined}
                                  className=""
                                  disabled={disabled}
                                />
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={Boolean(item.isBreakthroughActivity)}
                                  onCheckedChange={(checked) =>
                                    updateItem(
                                      index,
                                      "isBreakthroughActivity",
                                      checked === true,
                                    )
                                  }
                                  disabled={disabled}
                                />
                                <div className="space-y-0.5">
                                  <Label className="text-sm font-medium">
                                    Breakthrough activity
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    Tandai jika ini aktivitas inovatif/terobosan.
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={Boolean(item.isExistingControl)}
                                  onCheckedChange={(checked) =>
                                    updateItem(
                                      index,
                                      "isExistingControl",
                                      checked === true,
                                    )
                                  }
                                  disabled={disabled}
                                />
                                <div className="space-y-0.5">
                                  <Label className="text-sm font-medium">
                                    Existing control
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    Centang jika baris ini adalah kontrol yang
                                    sudah ada, bukan mitigasi baru.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        disabled={disabled}
        className="w-full"
      >
        <Plus className="size-3.5" />
        Tambah Rencana Penanganan
      </Button>
    </div>
  );
}
