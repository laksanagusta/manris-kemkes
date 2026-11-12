"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Filter, Plus, Search, XCircle } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import styles from "./filtered-table-toolbar.module.css";
import { canApplyFilter, filterDefault, isFilterActive, type TableFilterField } from "./dynamic-table-filter-state";

export type { TableFilterField, TableFilterOption } from "./dynamic-table-filter-state";

const filterPopoverClassName = "w-60 max-w-[calc(100vw-2rem)] gap-0 rounded-control p-1";

type FilterChipProps = {
  field: TableFilterField;
  disabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: () => void;
};

function FilterChip({ field, disabled, open, onOpenChange, onRemove }: FilterChipProps) {
  const inputId = useId();
  const [draft, setDraft] = useState(field.value);
  const [query, setQuery] = useState("");
  const applied = isFilterActive(field);
  const multiple = field.type === "multi-select";
  const selectedValues = draft ? draft.split(",") : [];
  const appliedValues = field.value ? field.value.split(",") : [];
  const hasSelectedValue = applied || (field.required && Boolean(field.value) && field.value !== "all");
  const label = applied || field.required
    ? multiple && appliedValues.length > 1
      ? `${appliedValues.length} dipilih`
      : field.options?.find((option) => option.value === field.value)?.label ?? field.value
    : "Pilih nilai";
  const options = field.options?.filter((option) => option.label.toLocaleLowerCase("id").includes(query.toLocaleLowerCase("id")));

  return (
    <div className={cn("inline-flex min-w-0 max-w-full items-center rounded-control border border-dashed bg-card text-sm", styles.filterChip, hasSelectedValue && styles.appliedChip, applied || field.required ? "border-border" : "border-muted-foreground/50")}>
      {!field.required && (
        <Button type="button" variant="ghost" size="icon-xs" className="ml-0.5 shrink-0 text-muted-foreground" disabled={disabled} aria-label={`Hapus filter ${field.label}`} onClick={onRemove}>
          <XCircle className="size-3.5" aria-hidden="true" />
        </Button>
      )}
      <Popover open={open && !disabled} onOpenChange={(next) => {
        if (next) { setDraft(field.value); setQuery(""); }
        onOpenChange(next);
      }}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className={cn("h-7 min-w-0 gap-2 px-2 font-normal", field.required && "pl-2.5")} disabled={disabled} aria-label={`Filter ${field.label}: ${label || "Pilih nilai"}`}>
            <span className="shrink-0 font-medium">{field.label}</span>
            <span data-filter-divider="" aria-hidden="true" className="h-4 w-px shrink-0 bg-border" />
            <span className={cn("max-w-52 truncate", !applied && !field.required && "text-muted-foreground")} title={label}>{label || "Pilih nilai"}</span>
            <ChevronDown aria-hidden="true" className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", open && "rotate-180")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className={filterPopoverClassName} aria-label={`Filter berdasarkan ${field.label}`}>
          <form onSubmit={(event) => {
            event.preventDefault();
            if (!canApplyFilter(field, draft)) return;
            field.onChange(field.type === "text" ? draft.trim() : draft);
            onOpenChange(false);
          }}>
            <div className="space-y-1">
              {field.options ? (
                <>
                  {field.options.length > 8 && <div className="relative px-1 pb-1"><Search aria-hidden="true" className="absolute left-3 top-2 size-4 text-muted-foreground" /><Input id={inputId} aria-label={`Cari opsi ${field.label}`} placeholder="Cari opsi..." value={query} onChange={(event) => setQuery(event.target.value)} className="pl-7" /></div>}
                  <div id={field.options.length <= 8 ? inputId : undefined} role={multiple ? "group" : "radiogroup"} aria-label={field.label} className="max-h-64 overflow-y-auto">
                    {options?.map((option) => {
                      const checked = multiple ? selectedValues.includes(option.value) : draft === option.value;
                      return <label key={option.value} className="relative flex min-h-8 cursor-pointer items-center gap-2 rounded-control px-2.5 py-1 text-sm hover:bg-accent has-focus-visible:ring-2 has-focus-visible:ring-ring has-checked:bg-accent">
                        <input className="sr-only" type={multiple ? "checkbox" : "radio"} name={inputId} value={option.value} checked={checked}
                          onChange={() => setDraft(multiple ? (checked ? selectedValues.filter((value) => value !== option.value) : [...selectedValues, option.value]).join(",") : option.value)} />
                        <span className="min-w-0 flex-1 wrap-break-word">{option.label}</span>
                        {checked && <Check className="size-4 shrink-0" aria-hidden="true" />}
                      </label>;
                    })}
                    {options?.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">Tidak ada opsi yang cocok.</p>}
                  </div>
                </>
              ) : <Input id={inputId} aria-label={`Nilai filter ${field.label}`} type={field.type === "date" ? "date" : "text"} value={draft === filterDefault(field) ? "" : draft} onChange={(event) => setDraft(event.target.value)} placeholder="Masukkan nilai..." required />}
            </div>
            <div className="mt-2 flex justify-end gap-2 border-t px-1 pt-2 pb-1">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Batal</Button>
              <Button type="submit" size="sm" disabled={!canApplyFilter(field, draft)}>Terapkan</Button>
            </div>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function DynamicTableFilters({ search, columns, fields, className, triggerLabel, disabled = false }: {
  disabled?: boolean;
  search?: ReactNode;
  columns?: ReactNode;
  triggerLabel?: string;
  fields: readonly TableFilterField[];
  className?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const filterButton = useRef<HTMLButtonElement>(null);
  const visible = fields.filter((field) => field.required || isFilterActive(field) || field.id === pendingId);
  const available = fields.filter((field) => !visible.includes(field));
  const removable = fields.filter((field) => !field.required && isFilterActive(field));
  const remove = (field: TableFilterField) => {
    field.onChange(filterDefault(field));
    setPendingId(null);
    setOpenId(null);
    filterButton.current?.focus();
  };

  return (
    <div data-slot="dynamic-table-filters" className={cn("flex min-w-0 flex-1 flex-col gap-2", styles.filters, className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {search}
        <div data-slot="table-filter-actions" className="flex shrink-0 items-center gap-2">
          {columns}
          <Popover open={pickerOpen && !disabled} onOpenChange={(open) => { setPickerOpen(open); if (open) setPickerQuery(""); }}>
            <PopoverTrigger asChild>
              <Button data-slot="button" ref={filterButton} type="button" variant="outline" size={triggerLabel ? "default" : "icon"} disabled={disabled} aria-label="Tambah filter" title="Tambah filter">
                {triggerLabel ? <><Plus aria-hidden="true" className="size-4" />{triggerLabel}</> : <Filter aria-hidden="true" className="size-4" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent aria-label="Pilih field filter" align="start" sideOffset={6} className={filterPopoverClassName} onCloseAutoFocus={(event) => { if (pendingId) event.preventDefault(); }}>
              {available.length > 8 && <div className="relative px-1 pb-1"><Search aria-hidden="true" className="absolute left-3 top-2 size-4 text-muted-foreground" /><Input aria-label="Cari field filter" value={pickerQuery} onChange={(event) => setPickerQuery(event.target.value)} placeholder="Cari field..." className="pl-7" /></div>}
              <div className="max-h-64 overflow-y-auto">
                {available.filter((field) => field.label.toLocaleLowerCase("id").includes(pickerQuery.toLocaleLowerCase("id"))).map((field) => (
                  <Button key={field.id} type="button" variant="ghost" className="w-full justify-start font-normal" onClick={() => {
                    setPickerOpen(false); setPendingId(field.id); setOpenId(field.id);
                  }}>{field.label}</Button>
                ))}
                {available.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">Semua filter sudah ditambahkan.</p>}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {visible.length > 0 && <div className="flex min-w-0 flex-wrap items-center gap-2" aria-label="Filter tabel aktif">
        {visible.map((field) => <FilterChip key={field.id} field={field} disabled={disabled} open={openId === field.id} onOpenChange={(open) => { setOpenId(open ? field.id : null); if (!open) { if (pendingId === field.id) filterButton.current?.focus(); setPendingId(null); } }} onRemove={() => remove(field)} />)}
        {removable.length > 0 && <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" disabled={disabled} onClick={() => {
          removable.forEach((field) => field.onChange(filterDefault(field)));
          setPendingId(null); setOpenId(null); filterButton.current?.focus();
        }}>Hapus semua filter</Button>}
      </div>}
    </div>
  );
}
