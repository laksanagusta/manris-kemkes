import type { ReactNode } from "react";
import { Table } from "@/components/ui/table";
import { CollectionTableSurface } from "./collection-table-surface";
import { CollectionTableHeader } from "./collection-table-header";
import { CollectionTableHeaderRow } from "./collection-table-header-row";
import { CollectionTableHead } from "./collection-table-head";

export type MitigationTableColumn = {
  key: string;
  label: string;
  width: string;
  action?: boolean;
};

export const treatmentTableColumns: readonly MitigationTableColumn[] = [
  { key: "code", label: "Kode risiko", width: "148px" },
  { key: "plan", label: "Rencana Penanganan", width: "24%" },
  { key: "owner", label: "PIC", width: "16%" },
  { key: "period", label: "Periode", width: "12%" },
  { key: "deadline", label: "Deadline", width: "14%" },
  { key: "status", label: "Status", width: "13%" },
  { key: "actions", label: "Aksi", width: "48px", action: true },
];

/** Shared table geometry for the treatment collection and risk-detail ledgers. */
export function MitigationCollectionTable({
  columns,
  children,
}: {
  columns: readonly MitigationTableColumn[];
  children: ReactNode;
}) {
  return (
    <CollectionTableSurface>
      <Table
        className={
          columns.length > 6
            ? "min-w-[1340px] table-fixed"
            : columns.length > 5
            ? "min-w-[1180px] table-fixed"
            : "min-w-[980px] table-fixed"
        }
      >
        <colgroup>
          {columns.map((column) => (
            <col key={column.key} style={{ width: column.width }} />
          ))}
        </colgroup>
        <CollectionTableHeader>
          <CollectionTableHeaderRow className="h-9 hover:bg-transparent">
            {columns.map((column) => (
              <CollectionTableHead
                key={column.key}
                className={column.action ? "text-center" : undefined}
                data-collection-action={column.action ? "" : undefined}
              >
                {column.action ? (
                  <span className="sr-only">{column.label}</span>
                ) : (
                  column.label
                )}
              </CollectionTableHead>
            ))}
          </CollectionTableHeaderRow>
        </CollectionTableHeader>
        {children}
      </Table>
    </CollectionTableSurface>
  );
}
