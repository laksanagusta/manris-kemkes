"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
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
  CollapsibleCard,
  ReportEmptyState,
} from "@/components/shared/design-system";
import {
  formatReportNumber,
  movementLabels,
  type ReportRiskRow,
} from "@/lib/quarterly-report";

function formatReportScore(value: number | null | undefined) {
  return formatReportNumber(value == null ? value : Math.round(value));
}

export function QuarterlyReportRiskTable({
  rows,
  cycle,
  totalRows = rows.length,
  hasRisks = rows.length > 0,
  loadRows,
}: {
  rows: ReportRiskRow[];
  cycle: string;
  totalRows?: number;
  hasRisks?: boolean;
  loadRows?: () => Promise<ReportRiskRow[]>;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(!loadRows);
  const [loadedRows, setLoadedRows] = useState(rows);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<"attention" | "all">("attention");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const filtered = useMemo(
    () =>
      loadedRows
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
    [loadedRows, view, query],
  );
  const handleOpenChange = async (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen || loaded || loading) return;
    if (!hasRisks || !loadRows) {
      setLoaded(true);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      setLoadedRows(await loadRows());
      setLoaded(true);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Gagal memuat daftar risiko.",
      );
    } finally {
      setLoading(false);
    }
  };
  const safePage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / pageSize)),
  );
  const visible = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  return (
    <CollapsibleCard.Root open={open} onOpenChange={handleOpenChange}>
      <CollapsibleCard.Trigger>
        <CollapsibleCard.Header>
          <CollapsibleCard.Icon />
          <CollapsibleCard.Text>
            <CollapsibleCard.Title>
              Daftar risiko periode ini
            </CollapsibleCard.Title>
            <CollapsibleCard.Description>
              {open
                ? "Tampilkan yang perlu perhatian atau semua risiko"
                : "Buka untuk melihat rincian risiko"}
            </CollapsibleCard.Description>
          </CollapsibleCard.Text>
        </CollapsibleCard.Header>
        <CollapsibleCard.Actions>
          <Badge variant="secondary">{totalRows} risiko</Badge>
        </CollapsibleCard.Actions>
      </CollapsibleCard.Trigger>
      <CollapsibleCard.Content>
        <CollapsibleCard.Body className="pt-4">
          {loading ? (
            <div
              className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground"
              role="status"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Memuat daftar risiko...
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-start gap-3 py-4">
              <p className="text-sm text-destructive" role="alert">
                {loadError}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleOpenChange(true)}
              >
                Coba lagi
              </Button>
            </div>
          ) : loaded ? (
            <>
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
                <div className="-mx-4 border-t border-border/60">
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
                        <TableHead>Indikator lain</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map((row) => {
                        const otherAttention = row.attention.filter(
                          (item) => item !== "Belum mencapai target",
                        );
                        return (
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
                                {formatReportScore(row.profile)}
                              </p>
                              <p
                                className={`mt-1 text-xs ${row.movement === "up" ? "text-risk-extreme" : row.movement === "down" ? "text-risk-low" : "text-muted-foreground"}`}
                              >
                                {movementLabels[row.movement]}
                              </p>
                            </TableCell>
                            <TableCell className="whitespace-normal tabular-nums">
                              {formatReportScore(row.observed)}
                              {!row.final && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Belum final
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-normal">
                              <p className="tabular-nums">
                                {formatReportScore(row.target)}
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
                              {otherAttention.length ? (
                                <ul className="space-y-1">
                                  {otherAttention.map((item) => (
                                    <li key={item}>{item}</li>
                                  ))}
                                </ul>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <ReportEmptyState
                  title={
                    query
                      ? "Tidak ada hasil pencarian"
                      : view === "attention" && loadedRows.length
                        ? "Tidak ada risiko yang perlu perhatian"
                        : "Belum ada risiko"
                  }
                  description={
                    query
                      ? "Ubah kata pencarian untuk melihat risiko lain."
                      : view === "attention" && loadedRows.length
                        ? "Lihat Semua risiko untuk meninjau seluruh profil periode ini."
                        : "Belum ada profil final yang berlaku pada periode dan scope ini."
                  }
                />
              )}
            </>
          ) : null}
        </CollapsibleCard.Body>
        {loaded && !loading && !loadError && (
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
        )}
      </CollapsibleCard.Content>
    </CollapsibleCard.Root>
  );
}
