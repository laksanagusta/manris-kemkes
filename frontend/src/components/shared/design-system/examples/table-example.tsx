"use client";
import { CollectionColumnPicker, useCollectionColumns } from "../collections/collection-column-picker";
import { CreatedAtHead, CreatedAtCell } from "../collections/collection-created-at";
import { useCollectionSorting } from "../collections/collection-sorting";

import { useState } from "react";
import {
  ActionIconButton,
  CollectionTableCard,
  CollectionEmptyState,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  CollectionToolbar,
  CollectionSearchField,
  DynamicTableFilters,
} from "@/components/shared/design-system";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

const rows = [
  { createdAt: "2026-10-01T09:00:00Z", id: "R-001", title: "Keterlambatan pelaporan", status: "Aktif", score: 20, plans: 1, unit: "Surveilans", category: "Operasional" },
  { createdAt: "2026-10-02T09:00:00Z", id: "R-002", title: "Ketersediaan logistik", status: "Draf", score: 12, plans: 3, unit: "Logistik", category: "Operasional" },
  { createdAt: "2026-10-03T09:00:00Z", id: "R-003", title: "Kapasitas layanan", status: "Aktif", score: 15, plans: 3, unit: "Pelayanan", category: "Strategis" },
  { createdAt: "2026-10-04T09:00:00Z", id: "R-004", title: "Ketepatan data program", status: "Aktif", score: 10, plans: 3, unit: "Surveilans", category: "Kepatuhan" },
  { createdAt: "2026-10-05T09:00:00Z", id: "R-005", title: "Gangguan sistem informasi", status: "Diarsipkan", score: 8, plans: 2, unit: "TI", category: "Operasional" },
  { createdAt: "2026-10-06T09:00:00Z", id: "R-006", title: "Ketersediaan tenaga", status: "Draf", score: 6, plans: 2, unit: "Pelayanan", category: "Strategis" },
];

const exampleColumns = [
  { id: "title", label: "Risiko", width: 250, locked: true },
  { id: "status", label: "Status", width: 120 },
  { id: "score", label: "Skor", width: 80 },
  { id: "plans", label: "Penanganan", width: 120 },
  { id: "category", label: "Kategori", width: 130 },
  { id: "unit", label: "Nama Organisasi", width: 224 },
  { id: "createdAt", label: "Dibuat", width: 160 },
] as const;

const selectionWidth = 56;
const actionsWidth = 60;

export function TableExample() {
  const { visible: columns, picker } = useCollectionColumns(exampleColumns);
  const tableMinWidth = columns.reduce((width, column) => width + column.width, selectionWidth + actionsWidth);
  const [status, setStatus] = useState("Semua");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const filtered = rows.filter(row => (status === "Semua" || row.status === status) && `${row.title} ${row.unit}`.toLowerCase().includes(search.toLowerCase()));
  const collectionSort = useCollectionSorting(filtered,{Risiko:r=>r.title,Status:r=>r.status,Skor:r=>r.score,Penanganan:r=>r.plans,Kategori:r=>r.category,"Nama Organisasi":r=>r.unit});
  const visible = collectionSort.rows;
  const allSelected = visible.length > 0 && visible.every((row) => selected.includes(row.id));
  const someSelected = visible.some((row) => selected.includes(row.id));

  return (
    <div className="space-y-4">
      <CollectionToolbar
        leading={
          <DynamicTableFilters
            columns={<CollectionColumnPicker {...picker} />}
            search={<CollectionSearchField value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Cari risiko contoh" placeholder="Cari risiko..." />}
            fields={[{ id: "status", label: "Status", value: status, defaultValue: "Semua", onChange: setStatus, options: ["Semua", "Aktif", "Draf", "Diarsipkan"].map((value) => ({ value, label: value })) }]}
          />
        }

      />
      <CollectionTableCard sorting={collectionSort.controls} stickyActions>
        <Table aria-label="Tabel referensi risiko" className="table-fixed" style={{ minWidth: tableMinWidth }}>
          <colgroup>
            <col style={{ width: selectionWidth }} />
            {columns.map((column) => (
              <col key={column.id} style={column.id === "title" ? undefined : { width: column.width }} />
            ))}
            <col style={{ width: actionsWidth }} />
          </colgroup>
          <CollectionTableHeader>
            <CollectionTableHeaderRow>
              <CollectionTableHead>
                <Checkbox aria-label="Pilih semua risiko contoh" checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  disabled={!visible.length} onCheckedChange={(checked) => setSelected(checked ? visible.map((row) => row.id) : [])} />
              </CollectionTableHead>
              {columns.map(({ id, label }) => id === "createdAt"
                ? <CreatedAtHead key={id} />
                : <CollectionTableHead key={id}>{label}</CollectionTableHead>
              )}
              <CollectionTableHead data-collection-action=""><span className="sr-only">Aksi</span></CollectionTableHead>
            </CollectionTableHeaderRow>
          </CollectionTableHeader>
          <TableBody>
            {visible.length === 0 && <TableRow><TableCell colSpan={columns.length + 2}><CollectionEmptyState title="Tidak ada risiko yang cocok" description="Ubah pencarian atau status." /></TableCell></TableRow>}
            {visible.map((row) => (
              <TableRow key={row.id} data-state={selected.includes(row.id) ? "selected" : undefined}>
                <TableCell><Checkbox aria-label={`Pilih ${row.title}`} checked={selected.includes(row.id)}
                  onCheckedChange={(checked) => setSelected((current) => checked ? [...current, row.id] : current.filter((id) => id !== row.id))} /></TableCell>
                {columns.map(({ id }) => {
                  if (id === "createdAt") return <CreatedAtCell key={id} record={row} />;
                  if (id === "status") {
                    return <TableCell key={id}><Badge variant="secondary" className={row.status === "Aktif" ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : row.status === "Draf" ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : ""}>{row.status}</Badge></TableCell>;
                  }
                  return <TableCell key={id} className="whitespace-normal">{row[id]}</TableCell>;
                })}
                <TableCell data-collection-action="" className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <ActionIconButton aria-label={`Aksi risiko ${row.id}`} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setSelected((current) => current.includes(row.id)
                        ? current.filter((id) => id !== row.id)
                        : [...current, row.id]
                      )}>
                        {selected.includes(row.id) ? "Batalkan pilihan" : "Pilih risiko"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CollectionTableCard>
    </div>
  );
}
