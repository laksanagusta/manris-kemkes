"use client";

import { useCallback } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/dom/sortable";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { RemoteUserPicker } from "@/components/risk/remote-user-picker";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApprovalLineRow } from "@/lib/risk-approval-line";
import type { UserPickerOption } from "@/lib/risk-register-user-picker";
import { cn } from "@/lib/utils";

type SortableDragEndEvent = {
  canceled: boolean;
  operation: {
    source: { id: unknown; index?: number; initialIndex?: number } | null;
    target: { id: unknown; index?: number } | null;
  };
};

type OrderedUserSelectionLoadResult = {
  options: UserPickerOption[];
  total: number;
  page: number;
  limit: number;
};

export interface OrderedUserSelectionTableProps {
  rows: ApprovalLineRow[];
  loadOptions: (
    params: { q: string; page: number; limit: number },
    row: ApprovalLineRow,
  ) => Promise<OrderedUserSelectionLoadResult>;
  onSelectRow: (rowId: string, option: UserPickerOption) => void;
  onAddRow: () => void;
  onRemoveRow: (rowId: string) => void;
  onMoveRow: (fromIndex: number, toIndex: number) => void;
  pickerTitle: string;
  pickerDescription: string;
  pickerPlaceholder: string;
  pickerSearchPlaceholder: string;
  pickerEmptyMessage: string;
  emptyStateMessage: string;
  addRowLabel: string;
  footerNote?: string;
  disabled?: boolean;
  canRemoveRow?: (row: ApprovalLineRow, index: number) => boolean;
  getRowError?: (row: ApprovalLineRow, index: number) => string | undefined;
  dndGroup?: string;
}

interface SortableOrderedUserSelectionRowProps {
  row: ApprovalLineRow;
  index: number;
  disabled?: boolean;
  canRemove: boolean;
  errorMessage?: string;
  pickerTitle: string;
  pickerDescription: string;
  pickerPlaceholder: string;
  pickerSearchPlaceholder: string;
  pickerEmptyMessage: string;
  dndGroup: string;
  onSelectRow: (rowId: string, option: UserPickerOption) => void;
  onRemoveRow: (rowId: string) => void;
  loadOptions: OrderedUserSelectionTableProps["loadOptions"];
}

function SortableOrderedUserSelectionRow({
  row,
  index,
  disabled,
  canRemove,
  errorMessage,
  pickerTitle,
  pickerDescription,
  pickerPlaceholder,
  pickerSearchPlaceholder,
  pickerEmptyMessage,
  dndGroup,
  onSelectRow,
  onRemoveRow,
  loadOptions,
}: SortableOrderedUserSelectionRowProps) {
  const { ref, handleRef, isDragging } = useSortable({
    id: row.rowId,
    index,
    group: dndGroup,
    disabled,
  });

  const selectedValue = row.id && row.name ? row : null;
  const handleSelect = useCallback(
    (option: UserPickerOption) => {
      onSelectRow(row.rowId, option);
    },
    [onSelectRow, row.rowId],
  );
  const loadRowOptions = useCallback(
    (params: { q: string; page: number; limit: number }) =>
      loadOptions(params, row),
    [loadOptions, row],
  );

  return (
    <TableRow
      ref={ref}
      className={cn(
        "border-b border-border/30 transition-colors hover:bg-muted/30",
        isDragging && "bg-muted/40 opacity-60",
      )}
    >
      <TableCell className="w-10">
        <button
          type="button"
          ref={handleRef}
          disabled={disabled}
          className="flex size-7 cursor-grab items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-muted hover:text-muted-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Ubah urutan pengguna ${index + 1}`}
        >
          <GripVertical className="size-3.5" />
        </button>
      </TableCell>
      <TableCell className="w-10">
        <span className="flex size-5 items-center justify-center rounded-full bg-muted/70 text-[10px] font-semibold text-muted-foreground">
          {index + 1}
        </span>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex flex-col gap-2">
          <RemoteUserPicker
            title={`${pickerTitle} ${index + 1}`}
            description={pickerDescription}
            placeholder={pickerPlaceholder}
            searchPlaceholder={pickerSearchPlaceholder}
            emptyMessage={pickerEmptyMessage}
            disabled={disabled}
            value={selectedValue}
            onSelect={handleSelect}
            loadOptions={loadRowOptions}
          />
          {errorMessage ? (
            <p className="text-xs text-destructive">{errorMessage}</p>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {row.nip || "-"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        <div className="flex items-center justify-between gap-3">
          <span
            className="truncate"
            title={[row.jabatan, row.pangkat].filter(Boolean).join(" · ") || "-"}
          >
            {row.jabatan || "-"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-destructive/50 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onRemoveRow(row.rowId)}
            disabled={disabled || !canRemove}
            aria-label={`Hapus pengguna ${index + 1}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function OrderedUserSelectionTable({
  rows,
  loadOptions,
  onSelectRow,
  onAddRow,
  onRemoveRow,
  onMoveRow,
  pickerTitle,
  pickerDescription,
  pickerPlaceholder,
  pickerSearchPlaceholder,
  pickerEmptyMessage,
  emptyStateMessage,
  addRowLabel,
  footerNote,
  disabled,
  canRemoveRow,
  getRowError,
  dndGroup = "ordered-user-selection",
}: OrderedUserSelectionTableProps) {
  const handleDragEnd = useCallback(
    (event: SortableDragEndEvent) => {
      if (event.canceled) {
        return;
      }

      const { source, target } = event.operation;

      if (!source || !target) {
        return;
      }

      if (!isSortable(source as never) || !isSortable(target as never)) {
        return;
      }

      const fromIndex = (source as { initialIndex: number }).initialIndex;
      const toIndex = (target as { index: number }).index;

      if (fromIndex === toIndex) {
        return;
      }

      onMoveRow(fromIndex, toIndex);
    },
    [onMoveRow],
  );

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <div className="overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <span className="sr-only">Pegangan drag</span>
              </TableHead>
              <TableHead className="w-10 text-center">
                <span className="sr-only">Urutan</span>
              </TableHead>
              <TableHead className="w-[360px] whitespace-nowrap">Nama</TableHead>
              <TableHead className="w-[220px] whitespace-nowrap">NIP</TableHead>
              <TableHead className="whitespace-nowrap">Jabatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-sm text-muted-foreground"
                >
                  {emptyStateMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <SortableOrderedUserSelectionRow
                  key={row.rowId}
                  row={row}
                  index={index}
                  disabled={disabled}
                  canRemove={canRemoveRow ? canRemoveRow(row, index) : true}
                  errorMessage={getRowError?.(row, index)}
                  pickerTitle={pickerTitle}
                  pickerDescription={pickerDescription}
                  pickerPlaceholder={pickerPlaceholder}
                  pickerSearchPlaceholder={pickerSearchPlaceholder}
                  pickerEmptyMessage={pickerEmptyMessage}
                  dndGroup={dndGroup}
                  onSelectRow={onSelectRow}
                  onRemoveRow={onRemoveRow}
                  loadOptions={loadOptions}
                />
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between gap-3 border-t border-border/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {footerNote ??
              "Urutan baris menentukan sequence peninjauan dan persetujuan."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddRow}
            disabled={disabled}
            className="gap-2 border-dashed text-xs text-muted-foreground hover:border-primary/50 hover:text-primary"
          >
            <Plus className="size-3.5" />
            {addRowLabel}
          </Button>
        </div>
      </div>
    </DragDropProvider>
  );
}
