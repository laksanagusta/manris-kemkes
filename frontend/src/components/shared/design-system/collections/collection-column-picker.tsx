"use client";

import { useCallback, useId, useState, useSyncExternalStore } from "react";
import { isSortable } from "@dnd-kit/dom/sortable";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";

import { ChevronDown, GripVertical, Lock, Settings2 } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Column = { id: string; label: string; locked?: boolean };
type ColumnSetting = { id: string; visible: boolean };

const subscribe = () => () => {};
const emptySnapshot = () => null;

export function useCollectionColumns<T extends Column>(columns: readonly T[], storageKey?: string) {
  const [draft, setDraft] = useState<{ key?: string; settings: ColumnSetting[] }>();
  const stored = useSyncExternalStore(
    subscribe,
    useCallback(() => {
      try {
        return storageKey ? window.localStorage.getItem(storageKey) : null;
      } catch {
        return null;
      }
    }, [storageKey]),
    emptySnapshot,
  );

  let saved: unknown = draft && draft.key === storageKey ? draft.settings : undefined;
  if (!saved && stored) {
    try {
      saved = JSON.parse(stored);
    } catch {
      // A damaged preference falls back to the default layout.
    }
  }

  const settings = new Map(columns.map(({ id }) => [id, true]));
  const order: string[] = [];
  if (Array.isArray(saved)) {
    for (const entry of saved) {
      if (entry && settings.has(entry.id) && typeof entry.visible === "boolean" && !order.includes(entry.id)) {
        settings.set(entry.id, entry.visible);
        order.push(entry.id);
      }
    }
  }

  const ordered = [
    ...columns.filter((column) => column.locked),
    ...order.flatMap((id) => columns.filter((column) => column.id === id && !column.locked)),
    ...columns.filter((column) => !column.locked && !order.includes(column.id)),
  ].map((column) => ({ ...column, visible: !!column.locked || settings.get(column.id) !== false }));

  function apply(next: ColumnSetting[]) {
    const settings = next.map(({ id, visible }) => ({ id, visible }));
    setDraft({ key: storageKey, settings });
    try {
      if (storageKey) window.localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch {
      // The current view remains usable when browser storage is unavailable.
    }
  }

  return {
    visible: ordered.filter((column) => column.visible),
    picker: {
      columns: ordered,
      onToggle: (id: string, visible: boolean) => {
        apply(ordered.map((column) => column.id === id && !column.locked ? { id, visible } : column));
      },
      onMove: (from: number, to: number) => {
        if (from === to || !ordered[from] || !ordered[to] || ordered[from].locked || ordered[to].locked) return;
        const next = [...ordered];
        next.splice(to, 0, next.splice(from, 1)[0]);
        apply(next);
      },
    },
  };
}

type PickerColumn = Column & { visible: boolean };

function SortableColumn({ column, index, onToggle }: {
  column: PickerColumn;
  index: number;
  onToggle: (id: string, visible: boolean) => void;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: column.id,
    index,
    disabled: column.locked,
  });
  const id = useId();

  return (
    <li ref={ref} className={cn(
      "flex min-h-8 items-center gap-1 rounded-md pointer-coarse:min-h-11",
      column.locked && "text-muted-foreground",
      isDragging && "bg-sidebar-accent",
    )}>
      <label htmlFor={id} className={cn("flex min-w-0 flex-1 items-center gap-1.5 self-stretch ps-1", !column.locked && "cursor-pointer")}>
        <Checkbox id={id} className="after:hidden" checked={column.visible} disabled={column.locked}
          onCheckedChange={(checked) => onToggle(column.id, checked === true)} />
        {column.label}
      </label>
      {column.locked ? (
        <span className="flex size-8 shrink-0 items-center justify-center" title="Kolom wajib">
          <Lock aria-hidden="true" className="size-4" />
          <span className="sr-only">Kolom wajib</span>
        </span>
      ) : (
        <Button ref={handleRef} type="button" size="icon" variant="ghost"
          className="size-8 shrink-0 touch-none cursor-grab text-muted-foreground hover:bg-transparent hover:text-muted-foreground active:cursor-grabbing dark:hover:bg-transparent pointer-coarse:size-11"
          aria-label={`Geser kolom ${column.label}`}>
          <GripVertical aria-hidden="true" size={16} className="size-[16px]" />
        </Button>
      )}
    </li>
  );
}

export function CollectionColumnPicker({ columns, onToggle, onMove }: {
  columns: readonly PickerColumn[];
  onToggle: (id: string, visible: boolean) => void;
  onMove: (from: number, to: number) => void;
}) {
  const titleId = useId();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button data-slot="button" type="button" variant="outline" className="group">
          <Settings2 aria-hidden="true" />
          Kolom
          <ChevronDown aria-hidden="true" className="text-muted-foreground group-aria-expanded:rotate-180" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} aria-labelledby={titleId}
        className="w-48 max-w-[calc(100vw-2rem)] gap-0.5 px-1 py-1.5">
        <PopoverTitle id={titleId} className="px-1.5 pt-0.5 text-xs text-muted-foreground">Kolom tabel</PopoverTitle>
        <DragDropProvider onDragEnd={({ canceled, operation: { source } }) => {
          if (!canceled && isSortable(source)) onMove(source.initialIndex, source.index);
        }}>
          <ul className="max-h-[min(20rem,calc(var(--radix-popover-content-available-height)-3rem))] overflow-y-auto p-0.5">
            {columns.map((column, index) => (
              <SortableColumn key={column.id} column={column} index={index} onToggle={onToggle} />
            ))}
          </ul>
        </DragDropProvider>
      </PopoverContent>
    </Popover>
  );
}
