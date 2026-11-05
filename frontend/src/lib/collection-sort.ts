import { newestCreatedFirst } from "./collection-created-at.ts";

export type SortValue = string | number | boolean | null | undefined;
export type SortDirection = "asc" | "desc";
const collator = new Intl.Collator("id", { numeric: true, sensitivity: "base" });

function isMissing(value: SortValue) {
  return value == null || value === "" || (typeof value === "number" && !Number.isFinite(value));
}

/** Sort the complete filtered collection before pagination; missing values always stay last. */
export function sortCollection<T>(
  rows: readonly T[], value: (row: T) => SortValue, direction: SortDirection,
): T[] {
  return [...rows].sort((a, b) => {
    const left = value(a);
    const right = value(b);
    if (isMissing(left) || isMissing(right)) {
      return isMissing(left) && isMissing(right) ? newestCreatedFirst(a, b) : isMissing(left) ? 1 : -1;
    }
    const comparison = typeof left === "number" && typeof right === "number"
      ? left - right
      : collator.compare(String(left), String(right));
    return (direction === "asc" ? comparison : -comparison) || newestCreatedFirst(a, b);
  });
}

export function sortDate(value?: string | null) {
  return value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
}

export function nextCollectionSort(
  current: { key: string; direction: SortDirection }, key: string,
): { key: string; direction: SortDirection } {
  const descendingFirst = /tanggal|dibuat|diperbarui|skor|jumlah|peserta|versi|deadline/i.test(key);
  return {
    key,
    direction: current.key === key
      ? current.direction === "asc" ? "desc" : "asc"
      : descendingFirst ? "desc" : "asc",
  };
}
