import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { CollectionTableCard } from "../collections/collection-table-card";
import { CollectionTableHead } from "../collections/collection-table-head";
import { CollectionTableHeader } from "../collections/collection-table-header";
import { CollectionTableHeaderRow } from "../collections/collection-table-header-row";
import { MonitoringLevelBadge, MonitoringScoreComparison } from "../domain/monitoring-score-cells";

const examples = [
  { title: "Hasil pemantauan tersedia", sourceScore: 20, observedScore: 8, observedLevel: "Rendah" },
  { title: "Hasil pemantauan belum tersedia", sourceScore: 12, observedScore: null, observedLevel: "-" },
];

export function MonitoringScoreColumnsExample() {
  return (
    <CollectionTableCard>
      <Table>
        <CollectionTableHeader>
          <CollectionTableHeaderRow>
            <CollectionTableHead>Risiko · contoh</CollectionTableHead>
            <CollectionTableHead>Perubahan Skor</CollectionTableHead>
            <CollectionTableHead>Level</CollectionTableHead>
          </CollectionTableHeaderRow>
        </CollectionTableHeader>
        <TableBody>
          {examples.map((row) => (
            <TableRow key={row.title}>
              <TableCell>{row.title}</TableCell>
              <TableCell><MonitoringScoreComparison row={row} /></TableCell>
              <TableCell><MonitoringLevelBadge row={row} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CollectionTableCard>
  );
}
