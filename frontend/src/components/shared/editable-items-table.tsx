"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Plus, Trash2, GripVertical } from "@/components/shared/icons";
import { Input } from "@/components/shared/design-system";
import { IllustratedEmptyState } from "@/components/shared/design-system/feedback/illustrated-empty-state";
import { cn } from "@/lib/utils";

export interface EditableItem {
  id: string;
  text: string;
}

interface EditableItemsTableProps {
  items: EditableItem[];
  onChange: (items: EditableItem[]) => void;
  placeholder?: string;
  disabled?: boolean;
  addItemLabel?: string;
  emptyMessage?: string;
  itemLabel?: string;
  invalid?: boolean;
  itemErrors?: Array<string | undefined>;
  emptyStatePresentation?: "illustrated" | "plain";
  hideAddButton?: boolean;
}

export function EditableItemsTable({
  items,
  onChange,
  placeholder,
  disabled = false,
  addItemLabel = "Tambah Item",
  emptyMessage = "Belum ada item",
  itemLabel = "Item",
  invalid = false,
  itemErrors,
  emptyStatePresentation = "illustrated",
  hideAddButton = false,
}: EditableItemsTableProps) {
  const previousItemIdsRef = useRef(new Set(items.map((item) => item.id)));
  const animatingItemIdsRef = useRef<Set<string>>(new Set());
  const animationTimerRef = useRef<number | null>(null);
  const [animatingItemIds, setAnimatingItemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentItemIds = new Set(items.map((item) => item.id));
    const newlyAddedItemIds = [...currentItemIds].filter(
      (id) => !previousItemIdsRef.current.has(id),
    );

    previousItemIdsRef.current = currentItemIds;

    if (newlyAddedItemIds.length > 0) {
      const nextAnimatingItemIds = new Set(
        [...animatingItemIdsRef.current].filter((id) => currentItemIds.has(id)),
      );

      newlyAddedItemIds.forEach((id) => nextAnimatingItemIds.add(id));
      animatingItemIdsRef.current = nextAnimatingItemIds;
      setAnimatingItemIds(nextAnimatingItemIds);
    } else {
      const currentAnimatingItemIds = new Set(
        [...animatingItemIdsRef.current].filter((id) => currentItemIds.has(id)),
      );

      if (currentAnimatingItemIds.size !== animatingItemIdsRef.current.size) {
        animatingItemIdsRef.current = currentAnimatingItemIds;
        setAnimatingItemIds(currentAnimatingItemIds);
      }
    }

    if (animationTimerRef.current !== null) {
      window.clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }

    if (animatingItemIdsRef.current.size > 0) {
      animationTimerRef.current = window.setTimeout(() => {
        animationTimerRef.current = null;
        animatingItemIdsRef.current = new Set();
        setAnimatingItemIds(new Set());
      }, 220);
    }

    return () => {
      if (animationTimerRef.current !== null) {
        window.clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, [items]);

  const addItem = () => {
    const newItem: EditableItem = {
      id: `item-${Date.now()}`,
      text: "",
    };
    onChange([...items, newItem]);
  };

  const updateItem = (id: string, value: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, text: value } : item
    );
    onChange(updated);
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div
      role="group"
      aria-label={itemLabel}
      data-invalid={invalid || undefined}
      className="space-y-2"
    >
      {items.length === 0 ? (
        emptyStatePresentation === "plain" ? (
          <div
            className={cn(
              "rounded-lg bg-sunken py-8 text-center text-state-foreground shadow-[inset_0_1px_2px_rgb(0_0_0/0.12),inset_0_-1px_0_rgb(255_255_255/0.6)] dark:shadow-[inset_0_1px_2px_rgb(0_0_0/0.35),inset_0_-1px_0_rgb(255_255_255/0.06)]",
              invalid && "ring-1 ring-destructive",
            )}
          >
            <p className="text-xs text-state-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <div className={cn("rounded-lg", invalid && "ring-1 ring-destructive")}>
            <IllustratedEmptyState
              title={emptyMessage}
              size="compact"
              className="py-3"
            />
          </div>
        )
      ) : (
        <div className={cn("border rounded-lg overflow-hidden", invalid ? "border-destructive" : "border-border/50")}>
          <Table className="w-full">
            <TableBody>
              {items.map((item, index) => (
                <TableRow
                  key={item.id}
                  className={cn(
                    "h-auto border-t-0 transition-colors hover:bg-muted/30",
                    animatingItemIds.has(item.id) &&
                      "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-reduce:animate-none",
                  )}
                >
                  <TableCell className="w-8">
                    <div className="flex items-center justify-center text-muted-foreground">
                      <GripVertical className="size-3.5" />
                    </div>
                  </TableCell>
                  <TableCell className="w-8">
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 rounded-full w-5 h-5 flex items-center justify-center">
                      {index + 1}
                    </span>
                  </TableCell>
                  <TableCell className="flex-1">
                    <Input
                      aria-label={`${itemLabel} ${index + 1}`}
                      value={item.text}
                      onChange={(e) => updateItem(item.id, e.target.value)}
                      placeholder={placeholder}
                      className=""
                      disabled={disabled}
                    />
                    {itemErrors?.[index] ? (
                      <p className="mt-1 text-xs text-destructive">{itemErrors[index]}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="w-10">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Hapus ${itemLabel.toLowerCase()} ${index + 1}`}
                      className="w-8"
                      onClick={() => removeItem(item.id)}
                      disabled={disabled}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!hideAddButton ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addItem}
          disabled={disabled}
          className="w-full"
        >
          <Plus className="size-3.5" />
          {addItemLabel}
        </Button>
      ) : null}
    </div>
  );
}
