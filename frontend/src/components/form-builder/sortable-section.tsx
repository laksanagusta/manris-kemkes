"use client";

import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/react/sortable";

import { cn } from "@/lib/utils";
import { SectionCard } from "./section-card";
import type { BuilderSection, FormBuilderAction } from "./use-form-builder";

interface SortableSectionProps {
  section: BuilderSection;
  sectionIndex: number;
  selectedFieldId: string | null;
  disabled?: boolean;
  dispatch: React.Dispatch<FormBuilderAction>;
  generateId: () => string;
}

export function SortableSection({
  section,
  sectionIndex,
  selectedFieldId,
  disabled,
  dispatch,
  generateId,
}: SortableSectionProps) {
  const { ref, handleRef, isDragging } = useSortable({
    id: section.id,
    index: sectionIndex,
    group: "sections",
    disabled,
  });

  return (
    <div
      ref={ref}
      className={cn(
        "relative transition-opacity",
        isDragging && "z-10 opacity-50",
      )}
    >
      <div
        ref={handleRef}
        className="absolute -left-3 top-4 flex size-6 cursor-grab items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </div>
      <SectionCard
        section={section}
        sectionIndex={sectionIndex}
        selectedFieldId={selectedFieldId}
        disabled={disabled}
        dispatch={dispatch}
        generateId={generateId}
      />
    </div>
  );
}
