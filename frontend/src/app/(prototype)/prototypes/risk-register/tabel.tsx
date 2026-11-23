import { CollectionCode } from "@/components/shared/design-system/collections/collection-code";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { riskCategoryLabels } from "@/lib/risk";
import { formatCreated, optionalColumns } from "./data";
import { RiskRowMenu, RiskScore, RiskStatus, titleButton, type StageProps } from "./parts";

export function Tabel({ rows, visible, onOpen }: StageProps) {
  const columns = optionalColumns.filter(({ id }) => visible.has(id));

  return (
    <Table framed aria-label="Tabel Register Risiko" className="min-w-[60rem]">
      <TableHeader>
        <TableRow>
          <TableHead className="w-32">Kode risiko</TableHead>
          <TableHead>Risiko</TableHead>
          {columns.map(({ id, label }) => <TableHead key={id}>{label}</TableHead>)}
          <TableHead className="w-14 text-center">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const cells = {
            category: riskCategoryLabels[row.category],
            organization: row.organization,
            score: <RiskScore score={row.score} />,
            status: <RiskStatus status={row.status} />,
            created: <time dateTime={row.created}>{formatCreated(row.created)}</time>,
          };
          return (
            <TableRow key={row.code}>
              <TableCell><CollectionCode code={row.code} /></TableCell>
              <TableCell><button type="button" className={`${titleButton} whitespace-normal`} onClick={() => onOpen(row)}>{row.title}</button></TableCell>
              {columns.map(({ id }) => <TableCell key={id}>{cells[id]}</TableCell>)}
              <TableCell className="text-center"><RiskRowMenu row={row} onOpen={onOpen} /></TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
