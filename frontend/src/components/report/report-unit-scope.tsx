"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { MonitoringRuleProgressOption } from "@/lib/annual-profile-progress-report";

export function ReportUnitScope({ organizations, selectedIds, onApply, disabled }: {
  organizations: MonitoringRuleProgressOption["organizations"];
  selectedIds: string[];
  onApply: (ids: string[]) => void;
  disabled: boolean;
}) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<string[]>([]);
  const allIds = organizations.map(({ id }) => id);
  const applied = selectedIds.length ? allIds.filter((id) => selectedIds.includes(id)) : allIds;
  const allChecked = draft.length === allIds.length;
  const matches = organizations.filter(({ name }) => name.toLocaleLowerCase("id-ID").includes(query.trim().toLocaleLowerCase("id-ID")));
  const label = applied.length ? `${applied.length} unit dipilih` : "Pilih unit";
  const triggerText = applied.length ? `Unit · ${applied.length} dipilih` : "Pilih unit";

  return (
    <Popover open={open && !disabled} onOpenChange={(next) => {
      if (next) {
        setDraft(applied);
        setQuery("");
      }
      setOpen(next);
    }}>
      <PopoverTrigger asChild>
        <Button variant="outline" disabled={disabled} aria-label={`Filter unit: ${label}`}>{triggerText}</Button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label="Pilih unit laporan" className="w-72 max-w-[calc(100vw-2rem)] gap-2 p-2">
        <form onSubmit={(event) => {
          event.preventDefault();
          if (!draft.length) return;
          onApply(allChecked ? [] : draft);
          setOpen(false);
        }}>
          {organizations.length > 8 && <Input className="mb-1" aria-label="Cari unit" placeholder="Cari unit…" value={query} onChange={(event) => setQuery(event.target.value)} />}
          <label htmlFor={`${fieldId}-all`} className="flex min-h-8 cursor-pointer items-center gap-2 rounded-control px-2 py-1 text-sm hover:bg-accent">
            <Checkbox id={`${fieldId}-all`} checked={allChecked ? true : draft.length ? "indeterminate" : false}
              onCheckedChange={(checked) => setDraft(checked ? allIds : [])} />
            Semua unit
          </label>
          <div className="max-h-64 overflow-y-auto border-t pt-1">
            {matches.map((unit) => (
              <label key={unit.id} htmlFor={`${fieldId}-${unit.id}`} className="flex min-h-8 cursor-pointer items-center gap-2 rounded-control px-2 py-1 text-sm hover:bg-accent">
                <Checkbox id={`${fieldId}-${unit.id}`} checked={draft.includes(unit.id)} onCheckedChange={(checked) => {
                  setDraft((current) => checked ? [...current, unit.id] : current.filter((id) => id !== unit.id));
                }} />
                <span className="min-w-0 wrap-anywhere">{unit.name}</span>
              </label>
            ))}
            {!matches.length && <p className="px-2 py-2 text-sm text-muted-foreground">Unit tidak ditemukan.</p>}
          </div>
          <div className="mt-2 flex justify-end gap-2 border-t pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" size="sm" disabled={!draft.length}>Terapkan</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
