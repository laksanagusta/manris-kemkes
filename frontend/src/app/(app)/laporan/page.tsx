"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CollectionPageHeader,
  CollectionSearchField,
  DynamicTableFilters,
  PageStack,
} from "@/components/shared/design-system";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  periodLabel,
  WorkflowError,
  WorkflowTable,
  workflowError,
  workflowTime,
} from "@/components/upr/workflow-ui";
import { useSetHeaderActions } from "@/lib/header-actions-context";
import { useAuth } from "@/contexts/auth-context";
import {
  reportKindLabel,
  uprApi,
  type ReportRecord,
  type ReportWorkspace,
} from "@/lib/api/upr-workflow";

const reportStatusLabels = {
  draft: "Draf",
  accepted: "Diterima",
  changes_requested: "Perlu perbaikan",
  sent: "Terkirim",
  final: "Final",
} as const;

function reportStatus(report: ReportRecord): keyof typeof reportStatusLabels {
  return report.resolution ?? (report.sentAt ? "sent" : "final");
}

function ReportList({ workspace }: { workspace: ReportWorkspace }) {
  const [search, setSearch] = useState("");
  const [unit, setUnit] = useState("all");
  const [period, setPeriod] = useState("all");
  const [status, setStatus] = useState("all");
  const incoming = workspace.hasChildren ? workspace.incoming : [];
  const units = [...new Map(incoming.map((report) => [report.organizationId, report.organization]))]
    .sort(([, a], [, b]) => a.localeCompare(b, "id"));

  const rows = [
    ...(workspace.drafts ?? []).map((draft) => ({
      title: draft.title,
      period: `${draft.year}-H${draft.semester}`,
      status: "draft" as const,
      unit: workspace.recipient ? `Ke ${workspace.recipient}` : "—",
      senderId: null,
      version: null,
      time: null,
      href: `/laporan/draf/${draft.id}`,
    })),
    ...[...incoming.map((report) => ({ report, received: true })),
      ...workspace.outgoing.map((report) => ({ report, received: false }))]
      .sort((a, b) => (b.report.sentAt ?? b.report.finalizedAt).localeCompare(a.report.sentAt ?? a.report.finalizedAt))
      .map(({ report, received }) => ({
        title: report.title || reportKindLabel[report.kind],
        period: report.period,
        status: reportStatus(report),
        unit: received ? `Dari ${report.organization}` : report.recipient ? `Ke ${report.recipient}` : "—",
        senderId: received ? report.organizationId : null,
        version: report.version,
        time: report.sentAt ?? report.finalizedAt,
        href: `/laporan/${report.id}`,
      })),
  ];
  const periods = [...new Set(rows.map((row) => row.period))].sort().reverse();
  const query = search.trim().toLocaleLowerCase("id");
  const filtered = rows.filter((row) =>
    (!query || [row.title, row.unit].some((value) => value.toLocaleLowerCase("id").includes(query))) &&
    (unit === "all" || row.senderId === unit) &&
    (period === "all" || row.period === period) &&
    (status === "all" || row.status === status)
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <DynamicTableFilters
        search={
          <CollectionSearchField
            aria-label="Cari laporan"
            placeholder="Cari judul atau unit…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
        fields={rows.length ? [
          ...(units.length ? [{
            id: "report-unit",
            label: "Unit pengirim",
            value: unit,
            onChange: setUnit,
            options: [{ value: "all", label: "Semua unit" }, ...units.map(([value, label]) => ({ value, label }))],
          }] : []),
          {
            id: "report-period",
            label: "Periode laporan",
            value: period,
            onChange: setPeriod,
            options: [{ value: "all", label: "Semua periode" }, ...periods.map((value) => ({ value, label: periodLabel(value) }))],
          },
          {
            id: "report-status",
            label: "Status",
            value: status,
            onChange: setStatus,
            options: [{ value: "all", label: "Semua status" }, ...Object.entries(reportStatusLabels).map(([value, label]) => ({ value, label }))],
          },
        ] : []}
        disabled={rows.length === 0}
      />
      <WorkflowTable columns={["Judul", "Periode", workspace.hasChildren ? "Dari / Tujuan" : "Tujuan", "Status"]}>
        {filtered.length ? filtered.map((row) => (
          <TableRow key={row.href}>
            <TableCell className="whitespace-normal">
              <Link
                href={row.href}
                className="rounded-sm font-medium text-foreground no-underline hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
              >
                {row.title}
              </Link>
              {row.time && <p className="text-xs text-muted-foreground">v{row.version} · {workflowTime(row.time)}</p>}
            </TableCell>
            <TableCell>{periodLabel(row.period)}</TableCell>
            <TableCell className="whitespace-normal">{row.unit}</TableCell>
            <TableCell><Badge variant="outline">{reportStatusLabels[row.status]}</Badge></TableCell>
          </TableRow>
        )) : (
          <TableRow>
            <TableCell colSpan={4}>{rows.length ? "Tidak ada laporan yang cocok dengan pencarian atau filter." : "Belum ada laporan."}</TableCell>
          </TableRow>
        )}
      </WorkflowTable>
    </div>
  );
}

export default function LaporanPage() {
  const { token } = useAuth();
  const [workspace, setWorkspace] = useState<ReportWorkspace | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const setHeaderActions = useSetHeaderActions();
  const showCreate = Boolean(workspace && token && !error);

  useEffect(() => {
    if (!showCreate) return;
    setHeaderActions(
      <Link
        href="/laporan/baru"
        className="rounded-sm px-2 py-1 text-sm font-medium text-primary no-underline hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-ring"
      >
        + Buat Laporan
      </Link>,
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, showCreate]);


  useEffect(() => {
    if (!token) return;
    let ignore = false;
    setError("");
    uprApi
      .workspace(token)
      .then((data) => {
        if (!ignore) setWorkspace(data);
      })
      .catch((cause) => {
        if (!ignore) setError(workflowError(cause));
      });
    return () => {
      ignore = true;
    };
  }, [token, retry]);

  return (
    <PageStack>
      <CollectionPageHeader
        showTitle
        title="Laporan"
        className="md:sr-only"
      />
      {error ? (
        <WorkflowError
          message={error}
          retry={() => setRetry((value) => value + 1)}
        />
      ) : workspace && token ? (
        <ReportList workspace={workspace} />
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          Memuat laporan…
        </p>
      )}
    </PageStack>
  );
}
