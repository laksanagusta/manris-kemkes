"use client";

import { useMemo } from "react";
import { Plus, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { getFieldTypeConfig } from "@/lib/form-field-registry";
import type { FormFieldOption } from "@/types/form";
import type {
  BuilderField,
  BuilderSection,
  FormBuilderAction,
} from "./use-form-builder";

interface FieldConfigPanelProps {
  field: BuilderField;
  sectionId: string;
  sections: BuilderSection[];
  disabled?: boolean;
  dispatch: React.Dispatch<FormBuilderAction>;
  onClose: () => void;
}

export function FieldConfigPanel({
  field,
  sectionId,
  sections,
  disabled,
  dispatch,
  onClose,
}: FieldConfigPanelProps) {
  const config = getFieldTypeConfig(field.fieldType);
  const Icon = config.icon;

  const availableConditionSources = useMemo(() => {
    const sources: { id: string; label: string; sectionTitle: string }[] = [];
    for (const section of sections) {
      for (const f of section.fields) {
        if (f.id === field.id) continue;
        if (f.fieldType === "checkbox") continue;
        sources.push({
          id: f.id,
          label: f.label || "[Belum ada label]",
          sectionTitle: section.title || "Tanpa judul",
        });
      }
    }
    return sources;
  }, [sections, field.id]);

  const updateField = (updates: Partial<BuilderField>) => {
    dispatch({
      type: "UPDATE_FIELD",
      payload: { sectionId, fieldId: field.id, updates },
    });
  };

  const handleOptionChange = (
    index: number,
    key: keyof FormFieldOption,
    value: string,
  ) => {
    const newOptions = [...field.options];
    newOptions[index] = { ...newOptions[index], [key]: value };
    updateField({ options: newOptions });
  };

  const handleAddOption = () => {
    const idx = field.options.length + 1;
    updateField({
      options: [
        ...field.options,
        { value: `option_${idx}`, label: `Opsi ${idx}` },
      ],
    });
  };

  const handleRemoveOption = (index: number) => {
    if (field.options.length <= 2) return;
    updateField({ options: field.options.filter((_, i) => i !== index) });
  };

  const hasCondition = !!field.conditionSourceFieldId;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
            <Icon className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Konfigurasi Field</p>
            <p className="text-xs text-muted-foreground">{config.label}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div className="space-y-1.5">
          <Label className="text-sm">Label</Label>
          <Input
            value={field.label}
            onChange={(e) => updateField({ label: e.target.value })}
            placeholder="Masukkan label field"
            disabled={disabled}
          />
        </div>

        {(field.fieldType === "text" ||
          field.fieldType === "textarea" ||
          field.fieldType === "dropdown") && (
          <div className="space-y-1.5">
            <Label className="text-sm">Placeholder</Label>
            <Input
              value={field.placeholder}
              onChange={(e) => updateField({ placeholder: e.target.value })}
              placeholder="Teks placeholder"
              disabled={disabled}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Wajib diisi</Label>
            <p className="text-xs text-muted-foreground">
              Responden harus mengisi field ini
            </p>
          </div>
          <Switch
            checked={field.isRequired}
            onCheckedChange={(checked) =>
              updateField({ isRequired: checked === true })
            }
            disabled={disabled}
          />
        </div>

        {config.hasOptions && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Opsi Jawaban</Label>
                <Badge variant="outline" className="text-[10px]">
                  Min. 2
                </Badge>
              </div>

              <div className="space-y-2">
                {field.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={opt.label}
                      onChange={(e) =>
                        handleOptionChange(idx, "label", e.target.value)
                      }
                      placeholder={`Opsi ${idx + 1}`}
                      disabled={disabled}
                      className="flex-1 text-sm"
                    />
                    <Input
                      value={opt.value}
                      onChange={(e) =>
                        handleOptionChange(idx, "value", e.target.value)
                      }
                      placeholder="value"
                      disabled={disabled}
                      className="w-24 text-xs text-muted-foreground"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemoveOption(idx)}
                      disabled={disabled || field.options.length <= 2}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2 text-xs"
                onClick={handleAddOption}
                disabled={disabled}
              >
                <Plus className="size-3" />
                Tambah Opsi
              </Button>
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Logika Kondisional</Label>
              <p className="text-xs text-muted-foreground">
                Tampilkan field ini berdasarkan jawaban field lain
              </p>
            </div>
            <Switch
              checked={hasCondition}
              onCheckedChange={(checked) => {
                if (checked !== true) {
                  updateField({
                    conditionSourceFieldId: null,
                    conditionValue: "",
                  });
                } else if (availableConditionSources.length > 0) {
                  updateField({
                    conditionSourceFieldId: availableConditionSources[0].id,
                    conditionValue: "",
                  });
                }
              }}
              disabled={disabled || availableConditionSources.length === 0}
            />
          </div>

          {hasCondition && (
            <div className="space-y-3 rounded-lg border border-border/30 bg-muted/20 p-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tampilkan jika field</Label>
                <Select
                  value={field.conditionSourceFieldId ?? ""}
                  onValueChange={(val) =>
                    updateField({ conditionSourceFieldId: val })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Pilih field sumber" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {availableConditionSources.map((src) => (
                        <SelectItem key={src.id} value={src.id}>
                          {src.label}{" "}
                          <span className="text-muted-foreground">
                            ({src.sectionTitle})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Bernilai sama dengan</Label>
                <Input
                  value={field.conditionValue}
                  onChange={(e) =>
                    updateField({ conditionValue: e.target.value })
                  }
                  placeholder="Masukkan nilai kondisi"
                  disabled={disabled}
                  className="text-sm"
                />
              </div>
            </div>
          )}

          {availableConditionSources.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Tidak ada field lain yang bisa dijadikan sumber kondisi. Tambahkan
              field teks, radio, atau dropdown terlebih dahulu.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
