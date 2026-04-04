"use client";

import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFieldTypeConfig } from "@/lib/form-field-registry";
import { cn } from "@/lib/utils";
import type { BuilderField } from "./use-form-builder";

interface FieldRowProps {
  field: BuilderField;
  isSelected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

export function FieldRow({
  field,
  isSelected,
  disabled,
  onSelect,
  onRemove,
}: FieldRowProps) {
  const config = getFieldTypeConfig(field.fieldType);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
        isSelected
          ? "border-primary/30 bg-primary/[0.04]"
          : "border-border/30 bg-background hover:border-border/60",
        disabled && "opacity-60",
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/50">
        <Icon className="size-4 text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {field.label || "[Belum ada label]"}
        </p>
        <p className="text-xs text-muted-foreground">{config.label}</p>
      </div>

      {field.isRequired && (
        <Badge
          variant="outline"
          className="shrink-0 border-destructive/20 bg-destructive/5 text-[10px] text-destructive"
        >
          Wajib
        </Badge>
      )}

      {field.conditionSourceFieldId && (
        <Badge
          variant="outline"
          className="shrink-0 border-amber-500/20 bg-amber-500/5 text-[10px] text-amber-600"
        >
          Kondisional
        </Badge>
      )}

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onSelect}
          disabled={disabled}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onRemove}
          disabled={disabled}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
