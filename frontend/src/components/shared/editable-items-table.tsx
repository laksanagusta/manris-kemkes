"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Plus, Trash2, GripVertical } from "@/components/ui/icons";
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
}

export function EditableItemsTable({
  items,
  onChange,
  placeholder = "Tulis item...",
  disabled = false,
  addItemLabel = "Tambah Item",
  emptyMessage = "Belum ada item",
  itemLabel = "Item",
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
    <div className="space-y-2">
      {items.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <p className="text-xs text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="border border-border/50 rounded-lg overflow-hidden">
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
                  <TableCell className="w-8 px-2 py-2">
                    <div className="flex items-center justify-center text-muted-foreground">
                      <GripVertical className="size-3.5" />
                    </div>
                  </TableCell>
                  <TableCell className="w-8 px-2 py-2">
                    <span className="text-[10px] font-semibold text-muted-foreground bg-muted/50 rounded-full w-5 h-5 flex items-center justify-center">
                      {index + 1}
                    </span>
                  </TableCell>
                  <TableCell className="flex-1 px-2 py-2">
                    <Input
                      aria-label={`${itemLabel} ${index + 1}`}
                      value={item.text}
                      onChange={(e) => updateItem(item.id, e.target.value)}
                      placeholder={placeholder}
                      className="text-xs bg-background border-input h-10"
                      disabled={disabled}
                    />
                  </TableCell>
                  <TableCell className="w-10 px-2 py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Hapus ${itemLabel.toLowerCase()} ${index + 1}`}
                      className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10"
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

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        disabled={disabled}
        className="w-full border-dashed gap-2 text-xs text-muted-foreground hover:text-primary hover:border-primary/50"
      >
        <Plus className="size-3.5" />
        {addItemLabel}
      </Button>
    </div>
  );
}
