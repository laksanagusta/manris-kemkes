"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { ArrowDown } from "@/components/shared/icons";
import { collectionCreatedAt } from "@/lib/collection-created-at";
import {
  nextCollectionSort,
  sortCollection,
  sortDate,
  type SortDirection,
  type SortValue,
} from "@/lib/collection-sort";

export type CollectionSortControls = {
  columns: readonly string[];
  key: string;
  direction: SortDirection;
  onChange: (key: string) => void;
};

const SortContext = createContext<CollectionSortControls | null>(null);

export function CollectionSortProvider({ controls, children }: {
  controls?: CollectionSortControls;
  children: ReactNode;
}) {
  return <SortContext.Provider value={controls ?? null}>{children}</SortContext.Provider>;
}

export function useCollectionSorting<T>(
  rows: readonly T[],
  columns: Record<string, (row: T) => SortValue>,
  onChange?: () => void,
  defaultKey = "Dibuat",
) {
  const [state, setState] = useState<{ key: string; direction: SortDirection }>({
    key: defaultKey, direction: "desc",
  });
  const accessors = { Dibuat: (row: T) => sortDate(collectionCreatedAt(row)), ...columns };
  const controls: CollectionSortControls = {
    ...state,
    columns: Object.keys(accessors),
    onChange(key) {
      setState(current => nextCollectionSort(current, key));
      onChange?.();
    },
  };
  const accessor = accessors[state.key as keyof typeof accessors] ?? accessors.Dibuat;
  return { controls, rows: sortCollection(rows, accessor, state.direction) };
}

export function useCollectionSortHeader(label?: string) {
  const controls = useContext(SortContext);
  if (!label || !controls?.columns.includes(label)) return null;
  return {
    active: controls.key === label,
    direction: controls.direction,
    onClick: () => controls.onChange(label),
  };
}

export function CollectionSortLabel({ label, active, direction, onClick }: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  const next = nextCollectionSort({ key: active ? label : "", direction }, label);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/sort inline-flex min-h-8 max-w-full cursor-pointer items-center gap-1 rounded-sm text-left [font-weight:inherit] text-inherit outline-none active:opacity-60 focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11"
      aria-label={`Urutkan ${label} ${next.direction === "desc" ? "menurun" : "menaik"}`}
    >
      <span>{label}</span>
      <ArrowDown
        aria-hidden="true"
        className={`size-3 shrink-0 transition-[transform,opacity] duration-150 motion-reduce:transition-none ${active ? "opacity-100" : "opacity-30 group-hover/sort:opacity-70"} ${active && direction === "asc" ? "rotate-180" : ""}`}
      />
    </button>
  );
}

export function useRemoteCollectionSorting(columns: Record<string, string>, onChange: () => void) {
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<{ key: string; direction: SortDirection }>({
    key: "Dibuat", direction: "desc",
  });
  const fields = { Dibuat: "created_at", ...columns };
  const controls: CollectionSortControls = {
    ...state,
    columns: Object.keys(fields),
    onChange(key) {
      setTouched(true);
      setState(current => nextCollectionSort(current, key));
      onChange();
    },
  };
  return {
    controls,
    touched,
    sortBy: fields[state.key as keyof typeof fields] ?? "created_at",
    sortOrder: state.direction,
  };
}
