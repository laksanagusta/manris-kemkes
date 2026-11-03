export function collectionCreatedAt(record: unknown): string | undefined {
  if (!record || typeof record !== "object") return undefined;
  const row = record as Record<string, unknown>;
  const value = row.createdAt ?? row.created_at ?? row.CreatedAt;
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : undefined;
}

/** Missing dates sort last; IDs break ties before pagination. */
export function newestCreatedFirst(a: unknown, b: unknown): number {
  const left = collectionCreatedAt(a);
  const right = collectionCreatedAt(b);
  const delta = (right ? Date.parse(right) : -Infinity) - (left ? Date.parse(left) : -Infinity);
  if (!Number.isNaN(delta) && delta !== 0) return delta;
  const id = (row: unknown) => row && typeof row === "object" ? String((row as Record<string, unknown>).id ?? "") : "";
  return id(b).localeCompare(id(a));
}
