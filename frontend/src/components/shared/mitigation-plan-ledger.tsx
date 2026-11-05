"use client";

import {
  Layers3,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MitigationItem } from "./mitigation-table";

const types = [
  { value: "reduce_probability", label: "Turunkan probabilitas" },
  { value: "reduce_impact", label: "Turunkan dampak" },
  { value: "reduce_both", label: "Turunkan probabilitas dan dampak" },
];

/** Editable plans in the risk summary use a flat table and a trailing add action. */
export function MitigationPlanLedger({
  items,
  disabled,
  hideAddButton,
  actionErrors,
  onEdit,
  onRemove,
}: {
  items: MitigationItem[];
  disabled?: boolean;
  hideAddButton?: boolean;
  actionErrors?: Array<string | undefined>;
  onEdit: (index: number | null) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div data-risk-plan-list className="min-w-0 space-y-3">
      <div className="overflow-hidden rounded-lg border border-border shadow-(--surface-shadow-low)">
      <Table className="min-w-[640px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[45%]">Rencana Penanganan</TableHead>
            <TableHead className="w-[24%]">PIC</TableHead>
            <TableHead className="w-[24%]">Tipe mitigasi</TableHead>
            <TableHead className="w-[7%]">
              <span className="sr-only">Aksi</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length ? (
            items.map((item, index) => (
              <TableRow key={item.id ?? index}>
                <TableCell className="align-top whitespace-normal">
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Edit rencana mitigasi ${index + 1}: ${item.action || "Belum diisi"}`}
                    onClick={() => onEdit(index)}
                    className="w-full rounded-control text-left text-sm font-normal break-words outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
                  >
                    {item.action || "Rencana belum diisi"}
                  </button>
                  {item.isExistingControl && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pengendalian yang ada
                    </p>
                  )}
                  {actionErrors?.[index] && (
                    <p role="alert" className="mt-1 text-xs text-destructive">
                      {actionErrors[index]}
                    </p>
                  )}
                </TableCell>
                <TableCell className="align-top whitespace-normal text-muted-foreground">
                  {item.owner || "PIC belum dipilih"}
                </TableCell>
                <TableCell className="align-top whitespace-normal text-muted-foreground">
                  {types.find(
                    (t) =>
                      t.value === (item.mitigationType || "reduce_probability"),
                  )?.label || "—"}
                </TableCell>
                <TableCell className="text-right align-top">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={disabled}
                        aria-label={`Aksi rencana mitigasi ${index + 1}`}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(index)}>
                        <Pencil />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onRemove(index)}
                      >
                        <Trash2 />
                        Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="whitespace-normal">
                <div
                  role="status"
                  className="flex min-h-80 flex-col items-center justify-center gap-3 px-4 py-12 text-center"
                >
                  <Layers3
                    aria-hidden="true"
                    className="mb-2 size-8 text-tertiary-foreground"
                  />
                  <p className="text-base font-medium">
                    Belum ada rencana penanganan
                  </p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Tambahkan rencana penanganan untuk mulai mengelola risiko.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
      {!hideAddButton && (
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={() => onEdit(null)}
        >
          Tambah Rencana Penanganan
        </Button>
      )}
    </div>
  );
}
