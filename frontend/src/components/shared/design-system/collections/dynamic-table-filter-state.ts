export type TableFilterOption = { value: string; label: string };

export type TableFilterField = {
  id: string;
  label: string;
  value: string;
  defaultValue?: string;
  onChange: (value: string) => void;
  options?: readonly TableFilterOption[];
  type?: "select" | "text" | "date";
  required?: boolean;
};

export function filterDefault(field: TableFilterField): string {
  return field.defaultValue ?? (field.type === "text" || field.type === "date" ? "" : "all");
}

export function isFilterActive(field: TableFilterField): boolean {
  return field.value !== filterDefault(field);
}

export function canApplyFilter(field: TableFilterField, draft: string): boolean {
  if (!draft.trim()) return false;
  if (field.type === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft)) return false;
    const parsed = new Date(`${draft}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === draft;
  }
  return !field.options || field.options.some((option) => option.value === draft);
}
