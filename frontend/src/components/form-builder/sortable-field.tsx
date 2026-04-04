"use client";

import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/react/sortable";

import { cn } from "@/lib/utils";
import { FieldRow } from "./field-row";
import type { BuilderField } from "./use-form-builder";

interface SortableFieldProps {
  field: BuilderField;
  fieldIndex: number;
  sectionId: string;
  isSelected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

export function SortableField({
  field,
  fieldIndex,
  sectionId,
  isSelected,
  disabled,
  onSelect,
  onRemove,
}: SortableFieldProps) {
  const { ref, handleRef, isDragging } = useSortable({
    id: field.id,
    index: fieldIndex,
    group: sectionId,
    disabled,
  });

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex items-center gap-1",
        isDragging && "z-10 opacity-50",
      )}
    >
      <div
        ref={handleRef}
        className="flex size-6 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <FieldRow
          field={field}
          isSelected={isSelected}
          disabled={disabled}
          onSelect={onSelect}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
}
