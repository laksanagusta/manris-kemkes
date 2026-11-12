"use client";

import { useState } from "react";
import { DynamicTableFilters } from "../collections/dynamic-table-filters";
import { CollectionSearchField } from "../collections/collection-search-field";

export function FilterPopoverExample() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState("all");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <DynamicTableFilters
        search={<CollectionSearchField aria-label="Cari contoh tabel" placeholder="Cari..." value={search} onChange={(event) => setSearch(event.target.value)} />}
        fields={[
          { id: "status", label: "Status", value: status, onChange: setStatus, options: [{ value: "all", label: "Semua status" }, { value: "draft", label: "Draf" }, { value: "final", label: "Final" }] },
          { id: "period", label: "Periode", value: period, onChange: setPeriod, options: [{ value: "all", label: "Semua periode" }, { value: "2026-Q3", label: "2026-Q3" }, { value: "2026-Q4", label: "2026-Q4" }] },
          { id: "email", label: "Email", type: "text", value: email, onChange: setEmail },
          { id: "date", label: "Tanggal", type: "date", value: date, onChange: setDate },
        ]}
      />
      <p className="text-xs text-muted-foreground">Contoh interaktif: pilih field melalui ikon filter, isi nilai lalu Terapkan. Batal membuang edit. Pill berubah biru setelah nilai diterapkan dan dapat diedit atau dihapus; Hapus semua filter mempertahankan pencarian.</p>
      <output aria-live="polite" className="block text-xs text-muted-foreground">{[status !== "all" && `Status: ${status}`, period !== "all" && `Periode: ${period}`, email && `Email: ${email}`, date && `Tanggal: ${date}`].filter(Boolean).join(" · ") || "Belum ada filter diterapkan"}</output>
    </div>
  );
}
