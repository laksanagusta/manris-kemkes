import { createDisplayDateFormatter } from "@/lib/display-date";
import { TableCell } from "@/components/ui/table";
import { CollectionTableHead } from "./collection-table-head";
import { collectionCreatedAt } from "@/lib/collection-created-at";

export function CreatedAtHead() {
  return <CollectionTableHead className="w-40 whitespace-nowrap" title="created_at · terbaru lebih dulu">Dibuat</CollectionTableHead>;
}
export function CreatedAtCell({ record }: { record: unknown }) {
  const value = collectionCreatedAt(record);
  return <TableCell className="whitespace-nowrap text-foreground">{value ? <time className="tabular-nums" style={{ fontFamily: "var(--font-inter), sans-serif" }} dateTime={value}>{createDisplayDateFormatter("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value))}</time> : "—"}</TableCell>;
}
