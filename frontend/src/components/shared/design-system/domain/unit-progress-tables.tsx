"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shared/animated-tabs";
import { DocumentDownloadButton } from "@/components/shared/document-download-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";
import { createDisplayDateFormatter } from "@/lib/display-date";
import { groupUnitProgress, type UnitProgressGroup } from "@/lib/unit-progress";
import type { UnitProgressItem, UnitProgressReport, UnitProgressWorkingPaper } from "@/types/unit-progress";
import { CollectionLoadingState } from "../collections/collection-loading-state";
import { CollectionPagination } from "../collections/collection-pagination";
import { CollectionSearchField } from "../collections/collection-search-field";
import { CollectionTableCard } from "../collections/collection-table-card";
import { CollectionTableHead } from "../collections/collection-table-head";
import { CollectionTableHeader } from "../collections/collection-table-header";
import { DynamicTableFilters, type TableFilterField } from "../collections/dynamic-table-filters";
import { ReportEmptyState } from "../reports/report-empty-state";

const tabs = {
  summary: "Rekap",
  papers: "Kertas Kerja",
  risks: "Finalisasi Risiko",
  monitoring: "Pemantauan",
  evaluations: "Evaluasi",
  mitigations: "Pelaporan Mitigasi",
} as const;

type Tab = keyof typeof tabs;
type DetailTab = Exclude<Tab, "summary">;
type OpenDetail = (tab: DetailTab, unitId: string) => void;
type Source = (href: string, label: string) => ReactNode;
export type UnitProgressDocumentTab = "papers" | "evaluations";
type DocumentAction = (tab: UnitProgressDocumentTab, unit: UnitProgressGroup, item?: UnitProgressItem) => ReactNode;
type Row = { id: string; status?: string; cells: ReactNode[] };
type TableData = { columns: string[]; rows: Row[]; numericColumns?: readonly string[] };

const statuses: Record<string, string> = {
  missing: "Belum ada dokumen",
  none: "Tidak ada kewajiban",
  draft: "Draf",
  final: "Final",
  signing: "Proses TTE",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  not_started: "Belum dimulai",
  reported: "Sudah dilaporkan",
  pending: "Belum dilaporkan",
  incomplete: "Laporan belum lengkap",
  overdue: "Lewat tenggat",
  not_reported: "Tidak dilaporkan",
  skipped: "Dilewati",
};

const actionColumn = "Aksi";

const dateFormatter = createDisplayDateFormatter("id-ID", { day: "numeric", month: "short", year: "numeric" });
function displayDate(value?: string) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? dateFormatter.format(date) : "—";
}

function Status({ value, label }: { value: string; label?: string }) {
  const tone = ["final", "completed", "reported"].includes(value) ? "success"
    : value === "signing" ? "progress"
    : ["overdue", "not_reported", "cancelled"].includes(value) ? "danger"
    : value === "incomplete" ? "warning" : "neutral";
  return <Badge variant={toBadgeVariant(tone)} className={getStatusBadgeClassName(tone)}>{label ?? statuses[value] ?? value}</Badge>;
}

function SummaryAction({ children, unit, tab, open }: {
  children: ReactNode;
  unit: UnitProgressGroup;
  tab: DetailTab;
  open: OpenDetail;
}) {
  return (
    <button
      type="button"
      className="block max-w-full cursor-pointer rounded-control text-left whitespace-normal underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
      onClick={() => open(tab, unit.id)}
      aria-label={`Lihat ${tabs[tab]} untuk ${unit.name}`}
    >
      {children}
    </button>
  );
}

function PaperStatus({ paper }: { paper?: UnitProgressWorkingPaper }) {
  return paper?.tteSkipped && paper.status === "completed"
    ? <Status value="completed" label="Selesai tanpa TTE" />
    : <Status value={paper?.status ?? "missing"} />;
}

function MitigationProgress({ unit }: { unit: UnitProgressGroup }) {
  return unit.mitigations.length
    ? <span className="tabular-nums">{unit.mitigationReported} dari {unit.mitigations.length} terlapor</span>
    : <span className="text-muted-foreground">Tidak ada kewajiban</span>;
}

function summaryTable(units: UnitProgressGroup[], open: OpenDetail): TableData {
  return {
    columns: ["Unit", "Kertas Kerja", "Finalisasi Risiko", "Pemantauan", "Evaluasi", "Pelaporan Mitigasi", "Perlu tindak lanjut"],
    rows: units.map((unit) => {
      const paper = unit.papers[0];
      const evalDrafts = unit.evaluations.filter((item) => item.status === "draft").length;
      return {
        id: unit.id,
        cells: [
          unit.name,
          <SummaryAction key="papers" unit={unit} tab="papers" open={open}>
            <PaperStatus paper={paper} />
            {paper?.status === "signing" && paper.signers > 0 &&
              <span className="mt-1 block text-xs text-muted-foreground">{paper.signed} dari {paper.signers} tanda tangan</span>}
          </SummaryAction>,
          <SummaryAction key="risks" unit={unit} tab="risks" open={open}>
            <span className="tabular-nums">{unit.riskDrafts} draf · {unit.monitoring.total} final</span>
          </SummaryAction>,
          <SummaryAction key="monitoring" unit={unit} tab="monitoring" open={open}>
            {unit.monitoring.total
              ? <span className="tabular-nums">{unit.monitoring.final} dari {unit.monitoring.total} final</span>
              : <span className="text-muted-foreground">Tidak ada kewajiban</span>}
          </SummaryAction>,
          <SummaryAction key="evaluations" unit={unit} tab="evaluations" open={open}>
            {unit.evaluations.length > 1
              ? <span className="tabular-nums">{evalDrafts} draf · {unit.evaluations.length - evalDrafts} final</span>
              : <Status value={unit.evaluations[0]?.status ?? "missing"} />}
          </SummaryAction>,
          <SummaryAction key="mitigations" unit={unit} tab="mitigations" open={open}><MitigationProgress unit={unit} /></SummaryAction>,
          unit.attention.length ? (
            <ul key="attention" className="min-w-44 space-y-0.5 text-xs whitespace-normal text-secondary-foreground">
              {unit.attention.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          ) : <span key="clear" className="text-muted-foreground">—</span>,
        ],
      };
    }),
  };
}

function detailTable(tab: DetailTab, units: UnitProgressGroup[], selected: boolean, open: OpenDetail, source: Source, documentAction: DocumentAction): TableData {
  switch (tab) {
    case "papers":
      return {
        columns: ["Unit", "Kertas Kerja", "Status", "Tanda tangan", "Giliran berikutnya", "Diperbarui", actionColumn],
        rows: units.flatMap((unit): Row[] => unit.papers.length ? unit.papers.map((item) => ({
          id: item.id, status: item.status, cells: [
            unit.name, source(`/risk/working-papers/${item.id}`, item.code || item.title),
            <PaperStatus key="status" paper={item} />,
            item.signers && !item.tteSkipped ? `${item.signed} dari ${item.signers}` : "—",
            item.nextSigner || "—", displayDate(item.updatedAt), documentAction(tab, unit, item),
          ],
        })) : [{ id: unit.id, status: "missing", cells: [unit.name, "—", <Status key="status" value="missing" />, "—", "—", "—", documentAction(tab, unit)] }]),
      };
    case "risks":
      return {
        columns: ["Unit", "Draf risiko baru", "Risiko final", "Total risiko"],
        numericColumns: ["Draf risiko baru", "Risiko final", "Total risiko"],
        rows: units.map((unit) => ({
          id: unit.id,
          cells: [unit.name, unit.riskDrafts, unit.monitoring.total, unit.riskDrafts + unit.monitoring.total],
        })),
      };
    case "evaluations":
      return {
        columns: ["Unit", "Evaluasi", "Template", "Status", "Diperbarui", actionColumn],
        rows: units.flatMap((unit): Row[] => unit.evaluations.length ? unit.evaluations.map((item) => ({
          id: item.id, status: item.status, cells: [
            unit.name, source(`/evaluations/${item.id}`, item.code || item.title || "Lihat evaluasi"), item.title || "—",
            <Status key="status" value={item.status} />, displayDate(item.updatedAt), documentAction(tab, unit, item),
          ],
        })) : [{ id: unit.id, status: "missing", cells: [unit.name, "—", "—", <Status key="status" value="missing" />, "—", documentAction(tab, unit)] }]),
      };
    case "mitigations":
      return {
        columns: ["Unit", "Rencana mitigasi", "Risiko", "PIC", "Tenggat", "Status"],
        rows: units.flatMap((unit): Row[] => unit.mitigations.length ? unit.mitigations.map((item) => ({
          id: item.id, status: item.status, cells: [
            unit.name, source(`/compliance/penanganan?taskId=${item.id}`, item.title || "Lihat tugas mitigasi"),
            item.riskTitle || item.code || "—", item.owner || "—", displayDate(item.dueDate),
            <div key="status" className="flex flex-wrap gap-1">
              <Status value={item.status} />
              {item.reportedLate && <Status value="overdue" label="Dilaporkan lewat tenggat" />}
              {item.overdue && item.status !== "overdue" && <Status value="overdue" />}
            </div>,
          ],
        })) : [{ id: unit.id, status: "none", cells: [unit.name, "—", "—", "—", "—", <Status key="status" value="none" />] }]),
      };
    case "monitoring":
      if (selected) return {
        columns: ["Risiko", "Kode", "Status pemantauan", "Perubahan profil"],
        rows: units.flatMap((unit) => unit.risks.filter((item) => item.status === "final").map((item) => {
          const status = item.monitoringStatus || "not_started";
          const href = item.monitoringId ? `/risk/monitoring/${item.monitoringId}` : `/risk/register/${item.id}?tab=monitoring`;
          return {
            id: item.id, status, cells: [
              source(href, item.title), item.code || "—", <Status key="status" value={status} />,
              item.profileChanged ? "Ada perubahan profil" : "—",
            ],
          };
        })),
      };
      return {
        columns: ["Organisasi", "Wajib dipantau", "Belum dimulai", "Draf", "Final"],
        rows: units.map((unit) => ({
          id: unit.id, cells: [
            <SummaryAction key="monitoring" unit={unit} tab="monitoring" open={open}>{unit.name}</SummaryAction>,
            ...(unit.monitoring.total ? [unit.monitoring.total, unit.monitoring.notStarted, unit.monitoring.drafts, unit.monitoring.final]
              : [<Status key="none" value="none" />, "—", "—", "—"]),
          ],
        })),
      };
  }
}

function ProgressTable({ label, columns, rows, numericColumns = [], empty }: TableData & { label: string; empty: string }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const activePage = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
  const visible = rows.slice((activePage - 1) * pageSize, activePage * pageSize);
  return (
    <CollectionTableCard>
      <Table aria-label={label}>
        <CollectionTableHeader>
          <TableRow>{columns.map((column) => (
            <CollectionTableHead key={column} scope="col" className={column === actionColumn || numericColumns.includes(column) ? "text-end" : undefined}>
              {column === actionColumn ? <span className="sr-only">{column}</span> : column}
            </CollectionTableHead>
          ))}</TableRow>
        </CollectionTableHeader>
        <TableBody>
          {visible.map((row) => (
            <TableRow key={row.id}>
              {row.cells.map((cell, index) => index === 0 ? (
                <th key={columns[index]} scope="row" data-slot="table-cell" className="min-w-32 text-start align-middle font-medium">{cell}</th>
              ) : (
                <TableCell key={columns[index]} className={columns[index] === actionColumn ? "text-end" : numericColumns.includes(columns[index]) ? "text-end tabular-nums" : "whitespace-normal"}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
          {!visible.length && (
            <TableRow><TableCell colSpan={columns.length}>
              <ReportEmptyState title="Tidak ada hasil" description={empty} />
            </TableCell></TableRow>
          )}
        </TableBody>
      </Table>
      <CollectionPagination itemLabel="baris" total={rows.length} page={activePage} pageSize={pageSize}
        onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
    </CollectionTableCard>
  );
}

export function UnitProgressTables({ report, loading = false, example = false, scopeFields = [], reloadAction, feedback, onDownloadDocument, isDownloadingDocument }: {
  report?: UnitProgressReport;
  loading?: boolean;
  example?: boolean;
  scopeFields?: TableFilterField[];
  reloadAction?: ReactNode;
  feedback?: ReactNode;
  onDownloadDocument?: (tab: UnitProgressDocumentTab, id: string) => void;
  isDownloadingDocument?: (tab: UnitProgressDocumentTab, id: string) => boolean;
}) {
  const [tab, setTab] = useState<Tab>("summary");
  const [unitId, setUnitId] = useState("");
  const [search, setSearch] = useState("");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [status, setStatus] = useState("all");
  const heading = useRef<HTMLHeadingElement>(null);
  const [focusRequest, requestFocus] = useState(0);
  const allUnits = useMemo(() => report ? groupUnitProgress(report) : [], [report]);
  const filtered = allUnits.filter((unit) => (
    unit.name.toLocaleLowerCase("id").includes(search.trim().toLocaleLowerCase("id")) &&
    (!attentionOnly || unit.attention.length > 0)
  ));
  const selectedUnit = tab === "summary" ? undefined : allUnits.find((unit) => unit.id === unitId);
  const units = selectedUnit ? filtered.filter((unit) => unit.id === selectedUnit.id) : filtered;
  const open: OpenDetail = (nextTab, nextUnit) => {
    requestFocus((value) => value + 1);
    setStatus("all");
    setUnitId(nextUnit);
    setTab(nextTab);
  };
  const source: Source = (href, label) => example ? label : (
    <Link className="block min-w-28 whitespace-normal text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring" href={href}>
      {label}
    </Link>
  );
  const documentAction: DocumentAction = (documentTab, unit, item) => {
    const isEvaluation = documentTab === "evaluations";
    const label = isEvaluation
      ? `Unduh PDF evaluasi ${item?.code || item?.title || unit.name}`
      : `Download ${item?.title || item?.code || `kertas kerja ${unit.name}`}`;

    return (
      <DocumentDownloadButton
        label={label}
        title={isEvaluation ? "Unduh PDF evaluasi" : "Download kertas kerja"}
        downloading={item ? isDownloadingDocument?.(documentTab, item.id) : false}
        onDownload={item && onDownloadDocument ? () => onDownloadDocument(documentTab, item.id) : undefined}
      />
    );
  };
  const data = tab === "summary" ? summaryTable(units, open) : detailTable(tab, units, Boolean(selectedUnit), open, source, documentAction);
  const statusFilter = status;
  const availableStatuses = Array.from(new Set([
    ...data.rows.flatMap((row) => row.status ? [row.status] : []),
    ...(statusFilter === "all" ? [] : [statusFilter]),
  ]));
  const rows = statusFilter === "all" ? data.rows : data.rows.filter((row) => row.status === statusFilter);
  const title = `${tabs[tab]}${selectedUnit ? ` · ${selectedUnit.name}` : ""}`;

  const fields: TableFilterField[] = [
    ...scopeFields,
    {
      id: "attention", label: "Tindak lanjut", value: attentionOnly ? "required" : "all",
      onChange: (value) => setAttentionOnly(value === "required"),
      options: [{ value: "all", label: "Semua unit" }, { value: "required", label: "Perlu tindak lanjut" }],
    },
    ...(availableStatuses.length ? [{
      id: "status", label: "Status", value: statusFilter, onChange: setStatus,
      options: availableStatuses.map((value) => ({ value, label: statuses[value] ?? value })),
    }] : []),
  ];

  useEffect(() => {
    if (focusRequest) heading.current?.focus();
  }, [focusRequest]);

  return (
    <Tabs value={tab} onValueChange={(value) => { setTab(value as Tab); setStatus("all"); }} className="min-w-0 gap-4">
      <TabsList aria-label="Tabel progres per unit" className="h-auto max-w-full flex-wrap justify-start gap-y-1">
        {Object.entries(tabs).map(([value, label]) => <TabsTrigger key={value} value={value}>{label}</TabsTrigger>)}
      </TabsList>
      <TabsContent value={tab} className="flex min-w-0 flex-col gap-4">
        <h2 ref={heading} tabIndex={-1} className="sr-only">{title}</h2>
        <DynamicTableFilters
          fields={fields}
          columns={reloadAction}
          search={<CollectionSearchField value={search} onChange={(event) => setSearch(event.target.value)}
            aria-label="Cari unit" placeholder="Cari unit…" />}
        />
        {selectedUnit && (
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <p className="wrap-anywhere text-sm font-medium">{selectedUnit.name}</p>
              {tab === "monitoring" && (
                <p className="text-sm text-muted-foreground">
                  {selectedUnit.monitoring.total
                    ? `${selectedUnit.monitoring.final} dari ${selectedUnit.monitoring.total} final · ${selectedUnit.monitoring.drafts} draf · ${selectedUnit.monitoring.notStarted} belum dimulai`
                    : "Tidak ada kewajiban pemantauan untuk periode ini."}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => { requestFocus((value) => value + 1); setUnitId(""); setStatus("all"); }}>
              Semua unit dalam filter
            </Button>
          </div>
        )}
        {report && !report.monitoringAvailable && tab === "monitoring" && (
          <p className="text-sm text-muted-foreground">Jendela pemantauan untuk periode ini belum dibuka.</p>
        )}
        <p className="sr-only" role="status">{loading ? "" : `${rows.length} hasil`}</p>
        {feedback ?? (loading ? <CollectionLoadingState message="Memuat progres unit…" /> : (
          <ProgressTable
            key={`${report?.cycle}:${allUnits.map(({ id }) => id).join(",")}:${tab}:${unitId}:${search}:${attentionOnly}:${statusFilter}`}
            label={title} columns={data.columns} rows={rows} numericColumns={data.numericColumns}
            empty={search || attentionOnly || statusFilter !== "all"
              ? "Ubah filter untuk melihat hasil lainnya."
              : "Tidak ada data untuk unit dan periode yang dipilih."}
          />
        ))}
      </TabsContent>
    </Tabs>
  );
}
