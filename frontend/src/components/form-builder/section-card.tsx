"use client";

import { useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/dom/sortable";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FIELD_TYPES, getFieldTypeConfig } from "@/lib/form-field-registry";
import type { FormFieldType } from "@/types/form";
import { SortableField } from "./sortable-field";
import type { BuilderSection, FormBuilderAction } from "./use-form-builder";

interface SectionCardProps {
  section: BuilderSection;
  sectionIndex: number;
  selectedFieldId: string | null;
  disabled?: boolean;
  dispatch: React.Dispatch<FormBuilderAction>;
  generateId: () => string;
}

export function SectionCard({
  section,
  sectionIndex,
  selectedFieldId,
  disabled,
  dispatch,
  generateId,
}: SectionCardProps) {
  const handleAddField = (fieldType: FormFieldType) => {
    dispatch({
      type: "ADD_FIELD",
      payload: {
        sectionId: section.id,
        fieldId: generateId(),
        fieldType,
      },
    });
  };

  const handleFieldDragEnd = useCallback(
    (event: { canceled: boolean; operation: { source: { id: unknown; index?: number; initialIndex?: number } | null; target: { id: unknown; index?: number } | null } }) => {
      if (event.canceled) return;
      const { source, target } = event.operation;
      if (!source || !target) return;
      if (!isSortable(source as never) || !isSortable(target as never)) return;
      const from = (source as unknown as { initialIndex: number }).initialIndex;
      const to = (target as unknown as { index: number }).index;
      if (from === to) return;
      dispatch({
        type: "REORDER_FIELDS",
        payload: { sectionId: section.id, fromIndex: from, toIndex: to },
      });
    },
    [dispatch, section.id],
  );

  return (
    <Card className="border-border/20 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
            {sectionIndex + 1}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <Input
              value={section.title}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_SECTION_TITLE",
                  payload: {
                    sectionId: section.id,
                    title: e.target.value,
                  },
                })
              }
              placeholder={`Judul Bagian ${sectionIndex + 1}`}
              disabled={disabled}
              className="border-0 bg-transparent px-0 text-base font-semibold shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
            />
            <Textarea
              value={section.description}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_SECTION_DESCRIPTION",
                  payload: {
                    sectionId: section.id,
                    description: e.target.value,
                  },
                })
              }
              placeholder="Deskripsi bagian (opsional)"
              disabled={disabled}
              className="min-h-[36px] resize-none border-0 bg-transparent px-0 text-sm shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
              rows={1}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() =>
              dispatch({
                type: "REMOVE_SECTION",
                payload: { sectionId: section.id },
              })
            }
            disabled={disabled}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {section.fields.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/40 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada field. Klik tombol di bawah untuk menambahkan.
            </p>
          </div>
        )}

        {section.fields.length > 0 && (
          <DragDropProvider onDragEnd={handleFieldDragEnd}>
            <div className="space-y-2">
              {section.fields.map((field, fieldIdx) => (
                <SortableField
                  key={field.id}
                  field={field}
                  fieldIndex={fieldIdx}
                  sectionId={section.id}
                  isSelected={selectedFieldId === field.id}
                  disabled={disabled}
                  onSelect={() =>
                    dispatch({ type: "SELECT_FIELD", payload: field.id })
                  }
                  onRemove={() =>
                    dispatch({
                      type: "REMOVE_FIELD",
                      payload: { sectionId: section.id, fieldId: field.id },
                    })
                  }
                />
              ))}
            </div>
          </DragDropProvider>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 w-full gap-2 border-dashed text-xs"
              disabled={disabled}
            >
              <Plus className="size-3.5" />
              Tambah Field
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuGroup>
              {FIELD_TYPES.map((ft) => {
                const cfg = getFieldTypeConfig(ft);
                const Icon = cfg.icon;
                return (
                  <DropdownMenuItem
                    key={ft}
                    onClick={() => handleAddField(ft)}
                  >
                    <Icon className="mr-2 size-4 text-muted-foreground" />
                    {cfg.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}
