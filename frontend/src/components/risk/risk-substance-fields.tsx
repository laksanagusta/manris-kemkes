"use client";

import { useCallback, useMemo } from "react";

import { EditableItemsTable, type EditableItem } from "@/components/shared/editable-items-table";
import { EditableList } from "@/components/shared/editable-list";
import {
  MitigationTable,
  type MitigationItem,
} from "@/components/shared/mitigation-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  treatmentOptionLabels,
  type RiskSubstanceValues,
} from "@/lib/risk-assessment-substance";
import type { UserPickerOption } from "@/lib/risk-register-user-picker";
import type {
  ControlEffectiveness,
  Controllability,
  MitigationType,
  RiskMitigation,
  RiskSource,
  TreatmentOption,
} from "@/types/risk";

const riskCategoryOptions = [
  { value: "kebijakan", label: "Kebijakan" },
  { value: "reputasi", label: "Reputasi" },
  { value: "fraud_korupsi", label: "Fraud / Korupsi" },
  { value: "legal", label: "Legal" },
  { value: "kepatuhan", label: "Kepatuhan" },
  { value: "operasional", label: "Operasional" },
] as const;

const riskSourceOptions: Array<{ value: RiskSource | string; label: string }> = [
  { value: "internal", label: "Internal" },
  { value: "eksternal", label: "Eksternal" },
];

const controllabilityOptions: Array<{ value: Controllability | string; label: string }> = [
  { value: "C", label: "Controllable" },
  { value: "UC", label: "Uncontrollable" },
];

const controlEffectivenessOptions: Array<{
  value: ControlEffectiveness | string;
  label: string;
}> = [
  { value: "efektif", label: "Efektif" },
  { value: "tidak_efektif", label: "Tidak efektif" },
];

const treatmentOptionOptions: Array<{
  value: TreatmentOption | string;
  label: string;
}> = [
  { value: "avoid", label: treatmentOptionLabels.avoid },
  { value: "transfer", label: treatmentOptionLabels.transfer },
  { value: "mitigate", label: treatmentOptionLabels.mitigate },
  { value: "accept", label: treatmentOptionLabels.accept },
];

interface RiskSubstanceFieldsProps {
  value: RiskSubstanceValues;
  onChange: (value: RiskSubstanceValues) => void;
  disabled?: boolean;
  showMitigations?: boolean;
  mitigationActionErrors?: Array<string | undefined>;
  loadPicOptions?: (params: {
    q: string;
    page: number;
    limit: number;
  }) => Promise<{
    options: UserPickerOption[];
    total: number;
    page: number;
    limit: number;
  }>;
  className?: string;
}

function mapStringsToEditableItems(values: string[], prefix: string): EditableItem[] {
  return values.map((text, index) => ({
    id: `${prefix}-${index}`,
    text,
  }));
}

function mapMitigationsToItems(values: RiskMitigation[]): MitigationItem[] {
  return values.map((mitigation, index) => ({
    id: mitigation.id ?? `mitigation-${index}`,
    action: mitigation.action ?? "",
    owner: mitigation.owner ?? "",
    ownerUserId: mitigation.ownerUserId,
    treatmentOwnerId: mitigation.treatmentOwnerId,
    externalPicId: mitigation.externalPicId,
    dueDate: mitigation.dueDate ?? "",
    mitigationType: mitigation.mitigationType ?? "reduce_probability",
    activityStage: mitigation.activityStage ?? "",
    expectedOutput: mitigation.expectedOutput ?? "",
    quantitativeTarget: mitigation.quantitativeTarget ?? "",
    supportingUnit: mitigation.supportingUnit ?? "",
    resourcesRequired: mitigation.resourcesRequired ?? "",
    contingencyPlan: mitigation.contingencyPlan ?? "",
    potentialObstacle: mitigation.potentialObstacle ?? "",
    costBenefitNote: mitigation.costBenefitNote ?? "",
    isBreakthroughActivity: mitigation.isBreakthroughActivity ?? false,
    isExistingControl: mitigation.isExistingControl ?? false,
  }));
}

function mapItemsToStrings(items: EditableItem[]): string[] {
  return items.map((item) => item.text);
}

function updateRiskSubstanceField<K extends keyof RiskSubstanceValues>(
  value: RiskSubstanceValues,
  onChange: (next: RiskSubstanceValues) => void,
  field: K,
  nextValue: RiskSubstanceValues[K],
) {
  onChange({ ...value, [field]: nextValue });
}

export function RiskSubstanceFields({
  value,
  onChange,
  disabled = false,
  showMitigations = true,
  mitigationActionErrors,
  loadPicOptions,
  className,
}: RiskSubstanceFieldsProps) {
  const causeItems = useMemo(
    () => mapStringsToEditableItems(value.cause, "cause"),
    [value.cause],
  );
  const impactItems = useMemo(
    () => mapStringsToEditableItems(value.impactDesc, "impact"),
    [value.impactDesc],
  );
  const mitigationItems = useMemo(
    () => mapMitigationsToItems(value.mitigations ?? []),
    [value.mitigations],
  );

  const handleCauseChange = useCallback(
    (items: EditableItem[]) => {
      updateRiskSubstanceField(value, onChange, "cause", mapItemsToStrings(items));
    },
    [onChange, value],
  );

  const handleImpactChange = useCallback(
    (items: EditableItem[]) => {
      updateRiskSubstanceField(value, onChange, "impactDesc", mapItemsToStrings(items));
    },
    [onChange, value],
  );

  const handleMitigationChange = useCallback(
    (items: MitigationItem[]) => {
      updateRiskSubstanceField(
        value,
        onChange,
        "mitigations",
        items.map((item) => ({
          id: item.id,
          action: item.action,
          owner: item.owner,
          ownerUserId: item.ownerUserId,
          treatmentOwnerId: item.treatmentOwnerId,
          externalPicId: item.externalPicId,
          executionScheduleText: item.executionScheduleText,
          targetCost: item.targetCost,
          mitigationType: item.mitigationType as MitigationType,
          activityStage: item.activityStage,
          expectedOutput: item.expectedOutput,
          quantitativeTarget: item.quantitativeTarget,
          supportingUnit: item.supportingUnit,
          resourcesRequired: item.resourcesRequired,
          contingencyPlan: item.contingencyPlan,
          potentialObstacle: item.potentialObstacle,
          costBenefitNote: item.costBenefitNote,
          isBreakthroughActivity: Boolean(item.isBreakthroughActivity),
          isExistingControl: Boolean(item.isExistingControl),
        })),
      );
    },
    [onChange, value],
  );

  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-sm font-medium">Judul Risiko</Label>
          <Input
            value={value.title}
            onChange={(event) =>
              updateRiskSubstanceField(value, onChange, "title", event.target.value)
            }
            placeholder="Judul risiko"
            disabled={disabled}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-sm font-medium">Deskripsi Risiko</Label>
          <Textarea
            value={value.description}
            onChange={(event) =>
              updateRiskSubstanceField(
                value,
                onChange,
                "description",
                event.target.value,
              )
            }
            placeholder="Uraikan substansi risiko secara singkat dan operasional"
            disabled={disabled}
            className="min-h-[110px] text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Kategori Risiko</Label>
          <Select
            value={value.category}
            onValueChange={(nextValue) =>
              updateRiskSubstanceField(value, onChange, "category", nextValue)
            }
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              {riskCategoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Sumber Risiko</Label>
          <Select
            value={value.riskSource}
            onValueChange={(nextValue) =>
              updateRiskSubstanceField(value, onChange, "riskSource", nextValue)
            }
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Pilih sumber" />
            </SelectTrigger>
            <SelectContent>
              {riskSourceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Kontrollabilitas</Label>
          <Select
            value={value.controllability}
            onValueChange={(nextValue) =>
              updateRiskSubstanceField(
                value,
                onChange,
                "controllability",
                nextValue,
              )
            }
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Pilih status" />
            </SelectTrigger>
            <SelectContent>
              {controllabilityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Efektivitas Kontrol</Label>
          <Select
            value={value.controlEffectiveness}
            onValueChange={(nextValue) =>
              updateRiskSubstanceField(
                value,
                onChange,
                "controlEffectiveness",
                nextValue,
              )
            }
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Belum dinilai" />
            </SelectTrigger>
            <SelectContent>
              {controlEffectivenessOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-sm font-medium">Pilihan Penanganan</Label>
          <Select
            value={value.treatmentOption}
            onValueChange={(nextValue) =>
              updateRiskSubstanceField(
                value,
                onChange,
                "treatmentOption",
                nextValue,
              )
            }
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Pilih penanganan" />
            </SelectTrigger>
            <SelectContent>
              {treatmentOptionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm font-medium">Penyebab Risiko</Label>
            <Badge
              variant="outline"
              className="border-border/50 bg-muted/30 text-[10px] uppercase tracking-[0.14em]"
            >
              Editable list
            </Badge>
          </div>
          <EditableItemsTable
            items={causeItems}
            onChange={handleCauseChange}
            disabled={disabled}
            placeholder="Tulis penyebab..."
            addItemLabel="Tambah Penyebab"
            emptyMessage="Belum ada penyebab"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm font-medium">Dampak Risiko</Label>
            <Badge
              variant="outline"
              className="border-border/50 bg-muted/30 text-[10px] uppercase tracking-[0.14em]"
            >
              Editable list
            </Badge>
          </div>
          <EditableItemsTable
            items={impactItems}
            onChange={handleImpactChange}
            disabled={disabled}
            placeholder="Tulis dampak..."
            addItemLabel="Tambah Dampak"
            emptyMessage="Belum ada dampak"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Kontrol Eksisting</Label>
        <EditableList
          value={value.existingControl}
          onChange={(nextValue) =>
            updateRiskSubstanceField(
              value,
              onChange,
              "existingControl",
              nextValue,
            )
          }
          placeholder="Tulis kontrol yang sudah berjalan..."
          disabled={disabled}
        />
      </div>

      {showMitigations ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <Label className="text-sm font-medium">Rencana Mitigasi</Label>
            <p className="text-xs text-muted-foreground">
              Bagian ini bisa dipakai untuk memperbarui penanganan tanpa mengubah skor pemantauan utama.
            </p>
          </div>
          <MitigationTable
            items={mitigationItems}
            onChange={handleMitigationChange}
            disabled={disabled}
            actionErrors={mitigationActionErrors}
            loadPicOptions={loadPicOptions}
          />
        </div>
      ) : null}
    </div>
  );
}
