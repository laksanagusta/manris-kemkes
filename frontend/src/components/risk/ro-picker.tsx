"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { listPlanningROOptions } from "@/lib/api/planning";
import type { PlanningROOption } from "@/types/planning";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ROSelectionSummary = PlanningROOption;

interface ROPickerProps {
  organizationId?: string;
  period?: string;
  value?: string;
  onChange: (roId: string, summary?: ROSelectionSummary) => void;
}

export function ROPicker({
  organizationId,
  period,
  value,
  onChange,
}: ROPickerProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PlanningROOption[]>([]);
  const [loading, setLoading] = useState(false);

  const loadROOptions = useCallback(async () => {
    if (!token || !organizationId || !period) return;
    try {
      setLoading(true);
      const res = await listPlanningROOptions(token, {
        organization_id: organizationId,
        period,
        q: query.trim() || undefined,
      });
      setItems(res.data ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId, period, query, token]);

  useEffect(() => {
    loadROOptions();
  }, [loadROOptions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [
        item.roTitle,
        item.kegiatanTitle,
        item.programTitle,
        item.ikuTitle,
        item.sasaranTitle,
        item.tujuanTitle,
        item.period,
      ].some((field) => field.toLowerCase().includes(q)),
    );
  }, [items, query]);

  const selected = items.find((item) => item.roId === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full min-w-0 max-w-full shrink justify-between overflow-hidden font-normal"
        >
          {selected ? (
            <span className="min-w-0 flex-1 truncate text-left">
              {selected.roTitle} — {selected.kegiatanTitle}
            </span>
          ) : (
            <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">
              Pilih RO...
            </span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 size-4 shrink-0 opacity-50" />
          <input
            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Cari RO, kegiatan, program, IKU, atau sasaran..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Memuat...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Tidak ada RO ditemukan.
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.roId}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-start rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  value === item.roId && "bg-accent text-accent-foreground",
                )}
                onClick={() => {
                  onChange(item.roId, item);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 size-4",
                    value === item.roId ? "opacity-100" : "opacity-0",
                  )}
                />
                <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                  <span className="w-full break-words font-medium leading-snug">
                    {item.roTitle}
                  </span>
                  <span className="w-full break-words text-xs leading-snug text-muted-foreground">
                    {item.kegiatanTitle}
                    {item.period ? ` · ${item.period}` : ""}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
