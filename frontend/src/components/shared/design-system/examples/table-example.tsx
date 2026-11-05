"use client";
import { CreatedAtHead, CreatedAtCell } from "../collections/collection-created-at";
import { useCollectionSorting } from "../collections/collection-sorting";

import { useState } from "react";
import {
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

export function TableExample() {
  const [status, setStatus] = useState("Semua");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const filtered = rows.filter(row => (status === "Semua" || row.status === status) && `${row.title} ${row.unit}`.toLowerCase().includes(search.toLowerCase()));
  const collectionSort = useCollectionSorting(filtered,{Risiko:r=>r.title,Status:r=>r.status,Skor:r=>r.score,Penanganan:r=>r.plans,Kategori:r=>r.category,Unit:r=>r.unit});
  const visible = collectionSort.rows;
  const allSelected = visible.length > 0 && visible.every((row) => selected.includes(row.id));
  const someSelected = visible.some((row) => selected.includes(row.id));

  return (
    <div className="space-y-4">
      <CollectionToolbar
        leading={
          <DynamicTableFilters
            search={<CollectionSearchField value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Cari risiko contoh" placeholder="Cari risiko..." />}
            fields={[{ id: "status", label: "Status", value: status, defaultValue: "Semua", onChange: setStatus, options: ["Semua", "Aktif", "Draf", "Diarsipkan"].map((value) => ({ value, label: value })) }]}
          />
        }

      />
      <CollectionTableCard sorting={collectionSort.controls}>
        <Table aria-label="Tabel referensi risiko" className="min-w-[880px] table-fixed">
          <colgroup>
            <col className="w-[56px]" /><col className="w-[32%]" /><col className="w-[12%]" />
            <col className="w-[10%]" /><col className="w-[14%]" /><col className="w-[15%]" /><col />
          </colgroup>
          <CollectionTableHeader>
            <CollectionTableHeaderRow>
              <CollectionTableHead>
                <Checkbox aria-label="Pilih semua risiko contoh" checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  disabled={!visible.length} onCheckedChange={(checked) => setSelected(checked ? visible.map((row) => row.id) : [])} />
              </CollectionTableHead>
              <CollectionTableHead>Risiko</CollectionTableHead>
              <CollectionTableHead>Status</CollectionTableHead><CollectionTableHead>Skor</CollectionTableHead>
              <CollectionTableHead>Penanganan</CollectionTableHead><CollectionTableHead>Kategori</CollectionTableHead>
              <CollectionTableHead>Unit</CollectionTableHead><CreatedAtHead />
            </CollectionTableHeaderRow>
          </CollectionTableHeader>
          <TableBody>
            {visible.length === 0 && <TableRow><TableCell colSpan={8}><CollectionEmptyState title="Tidak ada risiko yang cocok" description="Ubah pencarian atau status." /></TableCell></TableRow>}
            {visible.map((row) => (
              <TableRow key={row.id} data-state={selected.includes(row.id) ? "selected" : undefined}>
                <TableCell><Checkbox aria-label={`Pilih ${row.title}`} checked={selected.includes(row.id)}
                  onCheckedChange={(checked) => setSelected((current) => checked ? [...current, row.id] : current.filter((id) => id !== row.id))} /></TableCell>
                <TableCell className="whitespace-normal">{row.title}</TableCell>
                <TableCell><Badge variant="secondary" className={row.status === "Aktif" ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : row.status === "Draf" ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : ""}>{row.status}</Badge></TableCell>
                <TableCell>{row.score}</TableCell><TableCell>{row.plans}</TableCell>
                <TableCell className="whitespace-normal">{row.category}</TableCell><TableCell>{row.unit}</TableCell><CreatedAtCell record={row} />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CollectionTableCard>
    </div>
  );
}
