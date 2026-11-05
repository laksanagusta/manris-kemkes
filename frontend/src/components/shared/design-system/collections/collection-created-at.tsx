import { TableCell } from "@/components/ui/table";
import { CollectionTableHead } from "./collection-table-head";
import { collectionCreatedAt } from "@/lib/collection-created-at";

export function CreatedAtHead() {
  return <CollectionTableHead className="w-40 whitespace-nowrap" title="created_at · terbaru lebih dulu">Dibuat</CollectionTableHead>;
}
export function CreatedAtCell({ record }: { record: unknown }) {
  const value = collectionCreatedAt(record);
  return <TableCell className="whitespace-nowrap text-muted-foreground">{value ? <time dateTime={value}>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value))}</time> : "—"}</TableCell>;
}
