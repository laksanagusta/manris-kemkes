"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search, ListFilter } from "@/components/shared/icons";
import {
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  CollectionToolbar,
  CollectionSearchField,
} from "@/components/shared/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

const rows = [
  { id: "R-001", title: "Keterlambatan pelaporan", status: "Aktif", score: 20, plans: 1, unit: "Surveilans", category: "Operasional" },
  { id: "R-002", title: "Ketersediaan logistik", status: "Draf", score: 12, plans: 3, unit: "Logistik", category: "Operasional" },
  { id: "R-003", title: "Kapasitas layanan", status: "Aktif", score: 15, plans: 3, unit: "Pelayanan", category: "Strategis" },
  { id: "R-004", title: "Ketepatan data program", status: "Aktif", score: 10, plans: 3, unit: "Surveilans", category: "Kepatuhan" },
  { id: "R-005", title: "Gangguan sistem informasi", status: "Diarsipkan", score: 8, plans: 2, unit: "TI", category: "Operasional" },
  { id: "R-006", title: "Ketersediaan tenaga", status: "Draf", score: 6, plans: 2, unit: "Pelayanan", category: "Strategis" },
];

export function TableExample() {
  const [status, setStatus] = useState("Semua");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [descending, setDescending] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const visible = rows.filter((row) =>
    (status === "Semua" || row.status === status) &&
    `${row.title} ${row.unit}`.toLowerCase().includes(search.toLowerCase()),
  ).sort((a, b) => descending ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title));
  const allSelected = visible.length > 0 && visible.every((row) => selected.includes(row.id));
  const someSelected = visible.some((row) => selected.includes(row.id));

  return (
    <div className="space-y-4">
      <CollectionToolbar
        leading={
          <div className="flex flex-wrap items-center gap-1" aria-label="Filter status contoh tabel">
            {["Semua", "Aktif", "Draf", "Diarsipkan"].map((label) => (
              <Button key={label} variant={status === label ? "secondary" : "ghost"}
                aria-pressed={status === label} onClick={() => setStatus(label)}>
                {label}
              </Button>
            ))}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {searchOpen && <CollectionSearchField value={search} onChange={(event) => setSearch(event.target.value)}
              aria-label="Cari risiko contoh" placeholder="Cari risiko..." />}
            <Button variant="outline" size="icon" className="w-12" aria-label="Cari dan filter contoh tabel"
              aria-expanded={searchOpen} onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearch(""); }}>
              <Search strokeWidth={1.5} /><ListFilter strokeWidth={1.5} />
            </Button>
            <Button variant="outline" size="icon" aria-label="Ubah urutan risiko contoh"
              aria-pressed={descending} onClick={() => setDescending(!descending)}>
              {descending ? <ArrowDown strokeWidth={1.5} /> : <ArrowUp strokeWidth={1.5} />}
            </Button>
          </div>
        }
      />
      <CollectionTableCard>
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
              <CollectionTableHead aria-sort={descending ? "descending" : "ascending"}>
                <button className="inline-flex min-h-7 items-center gap-1 text-left focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => setDescending(!descending)}>Risiko <ChevronsUpDown className="size-3.5" /></button>
              </CollectionTableHead>
              <CollectionTableHead>Status</CollectionTableHead><CollectionTableHead>Skor</CollectionTableHead>
              <CollectionTableHead>Penanganan</CollectionTableHead><CollectionTableHead>Kategori</CollectionTableHead>
              <CollectionTableHead>Unit</CollectionTableHead>
            </CollectionTableHeaderRow>
          </CollectionTableHeader>
          <TableBody>
            {visible.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Tidak ada risiko yang cocok. Ubah pencarian atau status.</TableCell></TableRow>}
            {visible.map((row) => (
              <TableRow key={row.id} data-state={selected.includes(row.id) ? "selected" : undefined}>
                <TableCell><Checkbox aria-label={`Pilih ${row.title}`} checked={selected.includes(row.id)}
                  onCheckedChange={(checked) => setSelected((current) => checked ? [...current, row.id] : current.filter((id) => id !== row.id))} /></TableCell>
                <TableCell className="whitespace-normal">{row.title}</TableCell>
                <TableCell><Badge variant="secondary" className={row.status === "Aktif" ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : row.status === "Draf" ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : ""}>{row.status}</Badge></TableCell>
                <TableCell>{row.score}</TableCell><TableCell>{row.plans}</TableCell>
                <TableCell className="whitespace-normal">{row.category}</TableCell><TableCell>{row.unit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CollectionTableCard>
    </div>
  );
}
