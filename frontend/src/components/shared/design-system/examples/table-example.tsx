"use client";

import { MoreHorizontal } from "lucide-react";

import {
  CollectionTableCard,
  CollectionPagination,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
} from "@/components/shared/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

const tableRows = [
  { code: "RISK-001", title: "Keterlambatan pengadaan bahan baku", category: "Operasional", score: 16, status: "Disetujui" },
  { code: "RISK-002", title: "Gangguan sistem IT utama", category: "Operasional", score: 20, status: "Dalam Review" },
  { code: "RISK-003", title: "Ketidaksesuaian regulasi baru", category: "Kepatuhan", score: 12, status: "Draft" },
] as const;

export function TableExample() {
  return (
    <CollectionTableCard>
      <div>
        <Table className="min-w-[700px] table-fixed">
          <colgroup>
            <col className="w-[12%]" />
            <col className="w-[30%]" />
            <col className="w-[16%]" />
            <col className="w-[12%]" />
            <col className="w-[18%]" />
            <col className="w-[12%]" />
          </colgroup>
          <CollectionTableHeader>
            <CollectionTableHeaderRow>
              <CollectionTableHead className="pl-4 pr-3">Kode</CollectionTableHead>
              <CollectionTableHead className="px-3">Risiko</CollectionTableHead>
              <CollectionTableHead className="px-3">Kategori</CollectionTableHead>
              <CollectionTableHead className="px-3">Skor</CollectionTableHead>
              <CollectionTableHead className="px-3">Status</CollectionTableHead>
              <CollectionTableHead className="px-3 text-center">Aksi</CollectionTableHead>
            </CollectionTableHeaderRow>
          </CollectionTableHeader>
          <TableBody>
            {tableRows.map((row) => (
              <TableRow key={row.code} className="group border-0 hover:bg-muted/50">
                <TableCell className="py-2 pl-4 pr-3 text-sm text-foreground">
                  {row.code}
                </TableCell>
                <TableCell className="px-3 py-2">
                  <span className="text-sm font-normal text-foreground">{row.title}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap px-3 py-2 text-sm text-foreground">
                  {row.category}
                </TableCell>
                <TableCell className="px-3 py-2">
                  <span className="font-medium tabular-nums text-sm text-foreground">{row.score}</span>
                </TableCell>
                <TableCell className="px-3 py-2">
                  <Badge
                    className="justify-start"
                    size="compact"
                    tone={
                      row.status === "Disetujui"
                        ? "success"
                        : row.status === "Dalam Review"
                          ? "progress"
                          : "neutral"
                    }
                  >
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 py-2">
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="border-0 bg-transparent text-foreground shadow-none hover:bg-muted/50 hover:text-foreground"
                    >
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <CollectionPagination
          itemLabel="risiko"
          page={1}
          pageSize={10}
          total={42}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
        />
      </div>
    </CollectionTableCard>
  );
}
