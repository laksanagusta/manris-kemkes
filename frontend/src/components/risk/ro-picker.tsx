"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import {
  listPlanningObjectiveCompatibility,
  listPlanningROOptions,
} from "@/lib/api/planning";
import type {
  PlanningObjectiveCompatibilityItem,
  PlanningROOption,
} from "@/types/planning";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ROSelectionSummary = PlanningROOption;

type PlanningOption = {
  id: string;
  title: string;
  status: string;
  period: string;
};

interface ROPickerProps {
  organizationId?: string;
  value?: string;
  onChange: (roId: string, summary?: ROSelectionSummary) => void;
}

function buildPlanningOptions(items: PlanningObjectiveCompatibilityItem[]) {
  const byId = new Map<string, PlanningOption>();

  for (const item of items) {
    if (!item.planningId || byId.has(item.planningId)) continue;
    byId.set(item.planningId, {
      id: item.planningId,
      title: item.planningTitle || "Perjanjian Kinerja",
      status: item.planningStatus || "draft",
      period: item.planningPeriod || item.period || "",
    });
  }

  return [...byId.values()].sort((left, right) => {
    if (left.status !== right.status) {
      if (left.status === "active") return -1;
      if (right.status === "active") return 1;
    }
    return right.title.localeCompare(left.title);
  });
}

export function ROPicker({
  organizationId,
  value,
  onChange,
}: ROPickerProps) {
  const { token, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [planningOptions, setPlanningOptions] = useState<PlanningOption[]>([]);
  const [selectedPlanningId, setSelectedPlanningId] = useState("");
  const [items, setItems] = useState<PlanningROOption[]>([]);
  const [loadingPlanning, setLoadingPlanning] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const canQuerySelectedOrg =
    Boolean(user?.isGlobal) || user?.organizationId === organizationId;

  const loadPlanningOptions = useCallback(async () => {
    if (!token || !organizationId || !canQuerySelectedOrg) {
      setPlanningOptions([]);
      setSelectedPlanningId("");
      return;
    }

    try {
      setLoadingPlanning(true);
      const response = await listPlanningObjectiveCompatibility(token, {
        organization_id: organizationId,
        page: 1,
        limit: 100,
      });
      const options = buildPlanningOptions(response.data ?? []);
      const activeOptions = options.filter((option) => option.status === "active");
      const visibleOptions = activeOptions.length > 0 ? activeOptions : options;
      setPlanningOptions(visibleOptions);
      setSelectedPlanningId((current) => {
        if (current && visibleOptions.some((option) => option.id === current)) {
          return current;
        }
        return visibleOptions[0]?.id ?? "";
      });
    } catch {
      setPlanningOptions([]);
      setSelectedPlanningId("");
    } finally {
      setLoadingPlanning(false);
    }
  }, [canQuerySelectedOrg, organizationId, token]);

  useEffect(() => {
    loadPlanningOptions();
  }, [loadPlanningOptions]);

  const loadROOptions = useCallback(async () => {
    if (!token || !organizationId || !selectedPlanningId || !canQuerySelectedOrg) {
      setItems([]);
      return;
    }

    try {
      setLoadingOptions(true);
      const res = await listPlanningROOptions(token, {
        organization_id: organizationId,
        planning_id: selectedPlanningId,
        q: query.trim() || undefined,
      });
      setItems(res.data ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoadingOptions(false);
    }
  }, [
    canQuerySelectedOrg,
    organizationId,
    query,
    selectedPlanningId,
    token,
  ]);

  useEffect(() => {
    loadROOptions();
  }, [loadROOptions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [
        item.roTitle,
        item.activityTitle,
        item.programTitle,
        item.ikuTitle,
        item.objectiveTitle,
        item.planningTitle,
        item.planningPeriod,
      ].some((field) => (field ?? "").toLowerCase().includes(q)),
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
              {selected.roTitle}
              {selected.planningTitle ? ` · ${selected.planningTitle}` : ""}
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
        <div className="space-y-2 border-b px-3 py-3">
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Perjanjian Kinerja
            </p>
            <Select
              value={selectedPlanningId}
              onValueChange={setSelectedPlanningId}
              disabled={loadingPlanning || planningOptions.length === 0}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Pilih perjanjian kinerja" />
              </SelectTrigger>
              <SelectContent>
                {planningOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.title}
                    {option.period ? ` · ${option.period}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center border-b px-3">
          <Search className="mr-2 size-4 shrink-0 opacity-50" />
          <input
            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Cari RO, kegiatan, program, IKU, atau sasaran..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="max-h-60 overflow-y-auto p-1">
          {loadingPlanning || loadingOptions ? (
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
                    {item.activityTitle}
                    {item.planningTitle ? ` · ${item.planningTitle}` : ""}
                    {item.planningPeriod ? ` · ${item.planningPeriod}` : ""}
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
