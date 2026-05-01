"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { listRiskObjectives } from "@/lib/api/risk-objectives";
import type { RiskObjective } from "@/types/risk-objective";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ObjectivePickerProps {
  organizationId?: string;
  value?: string;
  onChange: (objectiveId: string, summary?: ObjectiveSummary) => void;
}

export type ObjectiveSummary = Pick<
  RiskObjective,
  "sasaran" | "indikatorKinerjaUtama" | "program" | "kegiatan" | "target" | "tujuan"
>;

export function ObjectivePicker({
  organizationId,
  value,
  onChange,
}: ObjectivePickerProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<RiskObjective[]>([]);
  const [loading, setLoading] = useState(false);

  const loadObjectives = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await listRiskObjectives(token, {
        organization_id: organizationId,
        limit: 100,
      });
      setItems(res.data ?? []);
    } catch {
      // Silent fail — picker shows empty
    } finally {
      setLoading(false);
    }
  }, [token, organizationId]);

  useEffect(() => {
    loadObjectives();
  }, [loadObjectives]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (o) =>
        o.sasaran.toLowerCase().includes(q) ||
        o.indikatorKinerjaUtama.toLowerCase().includes(q) ||
        o.tujuan.toLowerCase().includes(q) ||
        o.period.toLowerCase().includes(q),
    );
  }, [items, query]);

  const selected = items.find((o) => o.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between truncate font-normal"
        >
          {selected ? (
            <span className="truncate">
              {selected.sasaran} — {selected.indikatorKinerjaUtama}
            </span>
          ) : (
            <span className="text-muted-foreground">Pilih sasaran & IKU...</span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 size-4 shrink-0 opacity-50" />
          <input
            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Cari sasaran, IKU, atau periode..."
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
              Tidak ada sasaran ditemukan.
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  value === item.id && "bg-accent text-accent-foreground",
                )}
                onClick={() => {
                  onChange(item.id, {
                    sasaran: item.sasaran,
                    indikatorKinerjaUtama: item.indikatorKinerjaUtama,
                    program: item.program,
                    kegiatan: item.kegiatan,
                    target: item.target,
                    tujuan: item.tujuan,
                  });
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 size-4",
                    value === item.id ? "opacity-100" : "opacity-0",
                  )}
                />
                <div className="flex flex-col items-start">
                  <span className="font-medium">{item.sasaran}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.indikatorKinerjaUtama}
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