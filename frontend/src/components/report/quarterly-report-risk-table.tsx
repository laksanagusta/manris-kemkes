"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CollectionPagination,
  CollectionSearchField,
  ReportEmptyState,
} from "@/components/shared/design-system";
import {
  formatReportNumber,
  movementLabels,
  type ReportRiskRow,
} from "@/lib/quarterly-report";

export function QuarterlyReportRiskTable({
  rows,
  cycle,
}: {
  rows: ReportRiskRow[];
  cycle: string;
}) {
  const [view, setView] = useState<"attention" | "all">("attention");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const filtered = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            (view === "all" || row.attention.length > 0) &&
            `${row.risk.title} ${row.risk.code ?? row.risk.riskCode ?? ""} ${row.risk.orgName ?? ""}`
              .toLocaleLowerCase("id")
              .includes(query.trim().toLocaleLowerCase("id")),
        )
        .sort(
          (a, b) =>
            b.attention.length - a.attention.length ||
            (b.profile ?? 0) - (a.profile ?? 0),
        ),
    [rows, view, query],
  );
  const safePage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / pageSize)),
  );
  const visible = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          Risiko yang perlu ditindaklanjuti
        </CardTitle>
        <CardAction>
          <Badge variant="secondary">{filtered.length}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div
            className="flex gap-2"
            role="group"
            aria-label="Tampilan daftar risiko"
          >
            <Button
              variant={view === "attention" ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={view === "attention"}
              onClick={() => {
                setView("attention");
                setPage(1);
              }}
            >
              Perlu perhatian
            </Button>
            <Button
              variant={view === "all" ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={view === "all"}
              onClick={() => {
                setView("all");
                setPage(1);
              }}
            >
              Semua risiko
            </Button>
          </div>
          <CollectionSearchField
            value={query}
            aria-label="Cari risiko dalam laporan"
            placeholder="Cari risiko atau unit..."
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </div>
        {visible.length ? (
          <div className="-mx-4">
            <Table className="min-w-[1050px] table-fixed">
              <caption className="sr-only">
                Profil dan observasi {cycle}; nilai target memakai profil yang
                berlaku pada periode ini.
              </caption>
              <colgroup>
                <col style={{ width: "38%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "26%" }} />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-24">Risiko</TableHead>
                  <TableHead>Profil kuartal</TableHead>
                  <TableHead>Hasil final</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Perhatian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.risk.id}>
                    <TableCell className="whitespace-normal px-24">
                      <Link
                        href={`/risk/register/${row.risk.id}`}
                        className="break-words hover:underline"
                      >
                        {row.risk.title}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {row.risk.code || row.risk.riskCode || "—"} ·{" "}
                        {row.risk.orgName || "—"}
                      </p>
                      {row.risk.archivedInPeriod && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Diarsipkan dalam periode ini
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <p className="tabular-nums">
                        {formatReportNumber(row.profile)}
                      </p>
                      <p
                        className={`mt-1 text-xs ${row.movement === "up" ? "text-risk-extreme" : row.movement === "down" ? "text-risk-low" : "text-muted-foreground"}`}
                      >
                        {movementLabels[row.movement]}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-normal tabular-nums">
                      {formatReportNumber(row.observed)}
                      {!row.final && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Belum final
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <p className="tabular-nums">
                        {formatReportNumber(row.target)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.targetState === "achieved"
                          ? "Tercapai"
                          : row.targetState === "missed"
                            ? "Belum tercapai"
                            : "Belum dapat dinilai"}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-normal text-xs text-muted-foreground">
                      {row.attention.length ? (
                        <ul className="space-y-1">
                          {row.attention.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        "Tidak ada indikator perhatian"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <ReportEmptyState
            title={
              query
                ? "Tidak ada hasil pencarian"
                : view === "attention" && rows.length
                  ? "Tidak ada risiko yang perlu perhatian"
                  : "Belum ada risiko"
            }
            description={
              query
                ? "Ubah kata pencarian untuk melihat risiko lain."
                : view === "attention" && rows.length
                  ? "Lihat Semua risiko untuk meninjau seluruh profil periode ini."
                  : "Belum ada profil final yang berlaku pada periode dan scope ini."
            }
          />
        )}
      </CardContent>
      <CollectionPagination
        itemLabel="risiko"
        page={safePage}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </Card>
  );
}
