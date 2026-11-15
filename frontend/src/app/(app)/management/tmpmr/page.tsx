"use client";
import { useOrganizationFilter } from "@/hooks/use-organization-filter";

import { createDisplayDateFormatter } from "@/lib/display-date";
import { useRemoteCollectionSorting, CollectionSortProvider } from "@/components/shared/design-system/collections/collection-sorting";
import { CollectionTableHead } from "@/components/shared/design-system/collections/collection-table-head";
import { CreatedAtHead, CreatedAtCell } from "@/components/shared/design-system/collections/collection-created-at";


import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowUpRight,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
} from "@/components/shared/icons";

import { useAuth } from "@/contexts/auth-context";
import { listTMPMRAssessments } from "@/lib/api/tmpmr";
import type { TMPMRAssessment, TMPMRStatus, TMPMRSummary } from "@/types/tmpmr";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getStatusBadgeClassName, toBadgeVariant, type StatusTone } from "@/lib/badge-variant";
import {
  CollectionPageHeader,
  shouldShowCollectionPagination,
  CollectionToolbar,
  CollectionEmptyState,
  CollectionSearchField,
  DynamicTableFilters,
  KpiCard,
  MetricGrid,
  PageStack,
} from "@/components/shared/design-system";

const PAGE_SIZE = 10;

const statusLabel: Record<TMPMRStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  reviewed: "Reviewed",
  approved: "Approved",
};

const statusTones: Record<TMPMRStatus, StatusTone> = {
  draft: "neutral",
  submitted: "progress",
  reviewed: "warning",
  approved: "success",
};

const maturityStyles = [
  { match: "Awal", variant: "secondary" as BadgeVariant },
  { match: "Berkembang", variant: "outline" as BadgeVariant },
  { match: "Terdefinisi", variant: "outline" as BadgeVariant },
  { match: "Terkelola", variant: "default" as BadgeVariant },
  { match: "Optimum", variant: "default" as BadgeVariant },
];

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return createDisplayDateFormatter("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getMaturityVariant(maturityLevel: string): BadgeVariant {
  return maturityStyles.find((item) => maturityLevel.includes(item.match))?.variant ?? "secondary";
}

export default function TMPMRListPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<TMPMRAssessment[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<TMPMRSummary>({ total: 0, draft: 0, submitted: 0, approved: 0, periods: [] });
  const requestVersion = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<TMPMRStatus | "all">("all");
  const [page, setPage] = useState(1);

  const deferredSearch = useDeferredValue(search);
  const organizationFilter = useOrganizationFilter(() => setPage(1));
  const collectionSort = useRemoteCollectionSorting({
    "Periode": "period", "Organisasi": "organization", "Skor": "score",
    "Maturity": "maturity", "Status": "status", "Diperbarui": "updated_at",
  }, () => setPage(1));

  const loadData = useCallback(async () => {
    if (!token) return;
    const request = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const response = await listTMPMRAssessments(token, {
        page,
        limit: PAGE_SIZE,
        q: deferredSearch.trim() || undefined,
        organizationId: organizationFilter.organizationId === "all" ? undefined : organizationFilter.organizationId,
        period: periodFilter === "all" ? undefined : periodFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        sort_by: collectionSort.sortBy,
        sort_order: collectionSort.sortOrder,
      });
      if (request !== requestVersion.current) return;
      const lastPage = Math.max(1, Math.ceil(response.total / PAGE_SIZE));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setItems(response.data ?? []);
      setTotal(response.total);
      setSummary(response.summary);
    } catch (err) {
      if (request !== requestVersion.current) return;
      const message = err instanceof Error ? err.message : "Gagal memuat TMPMR.";
      setError(message);
      toast.error(message);
    } finally {
      if (request === requestVersion.current) setLoading(false);
    }
  }, [token, page, deferredSearch, organizationFilter.organizationId, periodFilter, statusFilter, collectionSort.sortBy, collectionSort.sortOrder]);

  useEffect(() => {
    void loadData();
    return () => { requestVersion.current += 1; };
  }, [loadData]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const availablePeriods = summary.periods;


  return (
    <PageStack>
      <CollectionPageHeader
        eyebrow={
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
            Risk Governance
          </p>
        }
        title="TMPMR"
      />

      <MetricGrid>
        {[
          { label: "Total Assessment", value: summary.total },
          { label: "Draft", value: summary.draft },
          { label: "Submitted", value: summary.submitted },
          { label: "Approved", value: summary.approved },
        ].map((item) => (
          <KpiCard
            key={item.label}
            label={item.label}
            value={item.value}
            tone="white"
            icon={<ClipboardList className="size-5 text-muted-foreground" />}
          />
        ))}
      </MetricGrid>

      <div className="space-y-4">
      <CollectionToolbar
        className="w-full"
        leading={
          <DynamicTableFilters
            search={
              <CollectionSearchField
                id="tmpmr-search"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                placeholder="Cari organisasi, skor, maturity level, atau periode"
                aria-label="Cari TMPMR"
              />
            }
            fields={[
              organizationFilter.field,
              {
                id: "period",
                label: "Periode",
                value: periodFilter,
                onChange: (value) => { setPeriodFilter(value); setPage(1); },
                options: [
                  { value: "all", label: "Semua periode" },
                  ...availablePeriods.map((period) => ({ value: period, label: period })),
                ],
              },
              {
                id: "status",
                label: "Status",
                value: statusFilter,
                onChange: (value) => { setStatusFilter(value as TMPMRStatus | "all"); setPage(1); },
                options: [
                  { value: "all", label: "Semua status" },
                  ...Object.entries(statusLabel).map(([value, label]) => ({ value, label })),
                ],
              },
            ]}
          />
        }
        actions={
          <>
            <Button variant="outline" size="default" className="" onClick={loadData}>
              <RefreshCw className="size-4" />
              Muat Ulang
            </Button>
            <Button asChild size="default" className="">
              <Link href="/management/tmpmr/new">
                <Plus className="size-4" />
                Buat Assessment
              </Link>
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <CardContent className="space-y-5">

          {loading ? (
            <div className="flex min-h-56 items-center justify-center gap-3 rounded-lg bg-state-surface text-sm text-state-foreground">
              <Loader2 className="size-5 animate-spin" />
              Memuat daftar TMPMR...
            </div>
          ) : error ? (
            <div className="rounded-lg bg-state-surface px-4 py-8 text-center text-sm text-state-foreground">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              <CollectionSortProvider controls={collectionSort.controls}><Table>
                <TableHeader>
                  <TableRow>
                    <CollectionTableHead className="whitespace-nowrap">Periode</CollectionTableHead>
                    <CollectionTableHead className="whitespace-nowrap">Organisasi</CollectionTableHead>
                    <CollectionTableHead className="whitespace-nowrap">Skor</CollectionTableHead>
                    <CollectionTableHead className="whitespace-nowrap">Maturity</CollectionTableHead>
                    <CollectionTableHead className="whitespace-nowrap">Status</CollectionTableHead>
                    <CollectionTableHead className="whitespace-nowrap">Diperbarui</CollectionTableHead>
                    <CreatedAtHead />
                    <CollectionTableHead className="text-right whitespace-nowrap">
                      <span className="sr-only">Aksi</span>
                    </CollectionTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="!p-0">
                        <CollectionEmptyState
                          title="Belum ada assessment yang cocok dengan filter ini"
                          description="Coba ubah filter atau buat assessment baru."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => {
                      const orgName = item.organizationName || item.organizationId;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="whitespace-nowrap">{item.period}</TableCell>
                          <TableCell className="max-w-[240px] truncate">
                            <span className="text-foreground">{orgName}</span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {item.score.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getMaturityVariant(item.maturityLevel)} className="whitespace-nowrap">
                              {item.maturityLevel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={toBadgeVariant(statusTones[item.status])} className={`whitespace-nowrap ${getStatusBadgeClassName(statusTones[item.status])}`}>
                              {statusLabel[item.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span data-date-time="">{formatDateTime(item.updatedAt)}</span>
                          </TableCell>
                          <CreatedAtCell record={item} />
                          <TableCell className="text-right">
                            <Button asChild variant="ghost" size="sm" className="">
                              <Link href={`/management/tmpmr/${item.id}`}>
                                Buka
                                <ArrowUpRight className="size-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table></CollectionSortProvider>

              {shouldShowCollectionPagination(total) ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-table-footer px-5 py-3 text-sm">
                  <p className="text-secondary-foreground">
                    Menampilkan {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
                    {" "}
                    hingga {Math.min(page * PAGE_SIZE, total)} dari {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page === 1}
                    >
                      Sebelumnya
                    </Button>
                    <Badge variant="outline" className="">
                      {page} / {totalPages}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      disabled={page >= totalPages}
                    >
                      Berikutnya
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </PageStack>
  );
}
