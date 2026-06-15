"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Search, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RemoteUserPicker } from "@/components/risk/remote-user-picker";
import { cn } from "@/lib/utils";
import type { UserPickerOption } from "@/lib/risk-register-user-picker";
import type { MitigationType } from "@/types/risk";
import { filterMitigationItems } from "@/components/shared/mitigation-table-search";

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
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => window.clearTimeout(handle);
  }, [search]);

  const filteredItems = useMemo(
    () => filterMitigationItems(items, debouncedSearch),
    [debouncedSearch, items],
  );

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
      {items.length > 0 ? (
        <div className="rounded-xl border border-border/50 bg-card/80 p-3 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <Label htmlFor="mitigation-search" className="text-xs font-medium text-muted-foreground">
                Cari mitigasi
              </Label>
              <div className="relative w-full md:w-[360px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="mitigation-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari aksi, PIC, due date, atau detail..."
                  className="h-9 bg-background/80 pl-9 pr-9 text-xs border-border/50"
                  disabled={disabled}
                />
                {search ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSearch("");
                      setDebouncedSearch("");
                    }}
                    disabled={disabled}
                    aria-label="Hapus pencarian mitigasi"
                  >
                    <X className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredItems.length} dari {items.length} rencana penanganan
            </p>
          </div>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 bg-muted/10 px-4 py-8 text-left">
          <p className="text-xs text-muted-foreground">
            Belum ada rencana mitigasi.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 bg-muted/10 px-4 py-8 text-left">
          <p className="text-xs text-muted-foreground">
            Tidak ada rencana mitigasi yang cocok dengan pencarian ini.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/80 shadow-sm">
          <div className="w-full max-w-full min-w-0 overflow-x-auto">
            <Table className="min-w-[1120px]">
              <TableHeader className="[&_tr]:border-b [&_tr]:border-border/50">
                <TableRow className="border-border/50 transition-colors hover:bg-transparent">
                <TableHead className="w-16 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  No
                </TableHead>
                <TableHead className="whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Rencana Mitigasi
                </TableHead>
                <TableHead className="w-56 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  PIC
                </TableHead>
                <TableHead className="w-44 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Tipe
                </TableHead>
                <TableHead className="w-28 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Detail
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map(({ item, index }) => {
                const expanded = expandedRows[index] ?? false;

                return (
                  <Fragment key={item.id ?? `mitigation-${index}`}>
                    <TableRow
                      className={cn(
                        "border-border/30 transition-colors hover:bg-muted/30",
                        expanded && "bg-muted/20",
                      )}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted/60 text-[10px] font-semibold text-foreground">
                          {index + 1}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[360px]">
                        <div className="space-y-1">
                          <Input
                            value={item.action || ""}
                            onChange={(e) =>
                              updateItem(index, "action", e.target.value)
                            }
                            placeholder="Uraian rencana penanganan..."
                            className="h-8 bg-background/80 text-xs border-border/50"
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
                        <div className="space-y-1">
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
                              onChange={(e) =>
                                updateItem(index, "owner", e.target.value)
                              }
                              placeholder="Nama PIC"
                              className="h-8 bg-background/80 text-xs border-border/50"
                              disabled={disabled}
                            />
                          )}
                        </div>
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
                          <SelectTrigger className="h-8 bg-background/80 text-xs border-border/50">
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
                          className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setExpandedRows((prev) => ({
                              ...prev,
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
                      <TableCell className="align-top">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeItem(index)}
                          disabled={disabled}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>

                    {expanded ? (
                      <TableRow className="border-border/30 bg-muted/15">
                        <TableCell colSpan={7} className="p-0">
                          <div className="border-t border-border/50 px-4 py-4">
                            {disabled ? (
                              <p className="mb-3 text-xs text-muted-foreground">
                                Rincian ini hanya baca di halaman tinjauan. Untuk mengubah isi, buka mode edit risiko.
                              </p>
                            ) : null}

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  Tahap aktivitas
                                </Label>
                                <Input
                                  value={item.activityStage || ""}
                                  onChange={(e) =>
                                    updateItem(
                                      index,
                                      "activityStage",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Contoh: persiapan, pelaksanaan, monitoring"
                                  className="h-8 bg-background/80 text-xs border-border/50"
                                  disabled={disabled}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  Unit pendukung
                                </Label>
                                <Input
                                  value={item.supportingUnit || ""}
                                  onChange={(e) =>
                                    updateItem(
                                      index,
                                      "supportingUnit",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Contoh: Subdit Surveilans, Biro Umum"
                                  className="h-8 bg-background/80 text-xs border-border/50"
                                  disabled={disabled}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  Output yang diharapkan
                                </Label>
                                <Textarea
                                  value={item.expectedOutput || ""}
                                  onChange={(e) =>
                                    updateItem(
                                      index,
                                      "expectedOutput",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Tuliskan output yang ingin dicapai..."
                                  className="min-h-20 bg-background/80 text-sm border-border/50"
                                  disabled={disabled}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  Target kuantitatif
                                </Label>
                                <Textarea
                                  value={item.quantitativeTarget || ""}
                                  onChange={(e) =>
                                    updateItem(
                                      index,
                                      "quantitativeTarget",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Contoh: 100% unit terdokumentasi, SLA < 5 hari..."
                                  className="min-h-20 bg-background/80 text-sm border-border/50"
                                  disabled={disabled}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  Sumber daya dibutuhkan
                                </Label>
                                <Textarea
                                  value={item.resourcesRequired || ""}
                                  onChange={(e) =>
                                    updateItem(
                                      index,
                                      "resourcesRequired",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="SDM, anggaran, sistem, atau alat bantu yang diperlukan"
                                  className="min-h-20 bg-background/80 text-sm border-border/50"
                                  disabled={disabled}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  Rencana kontinjensi
                                </Label>
                                <Textarea
                                  value={item.contingencyPlan || ""}
                                  onChange={(e) =>
                                    updateItem(
                                      index,
                                      "contingencyPlan",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Langkah cadangan jika rencana utama tidak berjalan"
                                  className="min-h-20 bg-background/80 text-sm border-border/50"
                                  disabled={disabled}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  Hambatan potensial
                                </Label>
                                <Textarea
                                  value={item.potentialObstacle || ""}
                                  onChange={(e) =>
                                    updateItem(
                                      index,
                                      "potentialObstacle",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Risiko implementasi, penolakan, keterbatasan kapasitas"
                                  className="min-h-20 bg-background/80 text-sm border-border/50"
                                  disabled={disabled}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  Catatan cost-benefit
                                </Label>
                                <Textarea
                                  value={item.costBenefitNote || ""}
                                  onChange={(e) =>
                                    updateItem(
                                      index,
                                      "costBenefitNote",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Ringkasan sederhana manfaat dibanding biaya"
                                  className="min-h-20 bg-background/80 text-sm border-border/50"
                                  disabled={disabled}
                                />
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                              <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/60 p-3">
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
                              <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/60 p-3">
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
                                    Centang jika baris ini adalah kontrol yang sudah ada, bukan mitigasi baru.
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
        </div>
      )}

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
