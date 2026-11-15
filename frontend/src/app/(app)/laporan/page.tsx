"use client";

import { TableLoadingSkeleton } from "@/components/shared/design-system/feedback/loading-skeleton";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useOrganizationFilter } from "@/hooks/use-organization-filter";
import {
  CollectionPageHeader,
  CollectionSearchField,
  CollectionPagination,
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  DynamicTableFilters,
  PageStack,
} from "@/components/shared/design-system";
import { useRemoteCollectionSorting } from "@/components/shared/design-system/collections/collection-sorting";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  periodLabel,
  WorkflowError,
  workflowError,
  workflowTime,
} from "@/components/upr/workflow-ui";
import { useSetHeaderActions } from "@/lib/header-actions-context";
import { useAuth } from "@/contexts/auth-context";
import { uprApi, type ReportCollectionPage } from "@/lib/api/upr-workflow";

const reportStatusLabels = {
  draft: "Draf",
  accepted: "Diterima",
  changes_requested: "Perlu perbaikan",
  sent: "Terkirim",
  final: "Final",
} as const;

export default function LaporanPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [data, setData] = useState<ReportCollectionPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const organizationFilter = useOrganizationFilter(() => setPage(1));
  const unit = organizationFilter.organizationId;
  const unitHeader = data?.hasChildren ? "Dari / Tujuan" : "Tujuan";
  const { controls, sortBy, sortOrder } = useRemoteCollectionSorting({
    Judul: "title", Periode: "period", [unitHeader]: "unit", Status: "status",
  }, () => setPage(1));
  const query = search.trim();
  const setHeaderActions = useSetHeaderActions();
  const showCreate = Boolean(data && token && !error);

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
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = window.setTimeout(() => {
      void uprApi.reportCollection(token, {
        q: query,
        organizationId: unit === "all" ? undefined : unit,
        period: period === "all" ? undefined : period,
        status: status === "all" ? undefined : status,
        sortBy,
        sortOrder,
        page,
        limit,
      }, controller.signal).then((response) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(response.total / limit));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setData(response);
        setLoading(false);
      }).catch((cause) => {
        if (controller.signal.aborted) return;
        setError(workflowError(cause));
        setLoading(false);
      });
    }, query ? 250 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [token, query, unit, period, status, page, limit, sortBy, sortOrder, retry]);

  const periods = [...new Set([...(data?.periods ?? []), ...(period === "all" ? [] : [period])])].sort().reverse();

  return (
    <PageStack>
      <CollectionPageHeader showTitle title="Laporan" className="md:sr-only" />
      <DynamicTableFilters
        search={
          <CollectionSearchField
            aria-label="Cari laporan"
            placeholder="Cari judul atau unit…"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          />
        }
        fields={[
          { ...organizationFilter.field, id: "report-unit", label: "Unit pengirim" },
          {
            id: "report-period",
            label: "Periode laporan",
            value: period,
            onChange: (value) => { setPeriod(value); setPage(1); },
            options: [{ value: "all", label: "Semua periode" }, ...periods.map((value) => ({ value, label: periodLabel(value) }))],
          },
          {
            id: "report-status",
            label: "Status",
            value: status,
            onChange: (value) => { setStatus(value); setPage(1); },
            options: [{ value: "all", label: "Semua status" }, ...Object.entries(reportStatusLabels).map(([value, label]) => ({ value, label }))],
          },
        ]}
      />
      {error ? (
        <WorkflowError message={error} retry={() => setRetry((value) => value + 1)} />
      ) : (
        <CollectionTableCard sorting={controls}>
          <Table>
            <CollectionTableHeader>
              <CollectionTableHeaderRow>
                {["Judul", "Periode", unitHeader, "Status"].map((label) => (
                  <CollectionTableHead key={label}>{label}</CollectionTableHead>
                ))}
              </CollectionTableHeaderRow>
            </CollectionTableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4}><TableLoadingSkeleton message="Memuat laporan…" /></TableCell>
                </TableRow>
              ) : data?.items.length ? data.items.map((row) => (
                <TableRow key={`${row.draft ? "draft" : "report"}-${row.id}`}>
                  <TableCell className="whitespace-normal">
                    <Link
                      href={row.draft ? `/laporan/draf/${row.id}` : `/laporan/${row.id}`}
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
                  <TableCell colSpan={4}>
                    {query || unit !== "all" || period !== "all" || status !== "all"
                      ? "Tidak ada laporan yang cocok dengan pencarian atau filter." : "Belum ada laporan."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <CollectionPagination
            itemLabel="laporan"
            page={page}
            pageSize={limit}
            total={data?.total ?? 0}
            disabled={loading}
            onPageChange={setPage}
            onPageSizeChange={(value) => { setLimit(value); setPage(1); }}
          />
        </CollectionTableCard>
      )}
    </PageStack>
  );
}
