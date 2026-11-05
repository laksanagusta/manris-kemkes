"use client";
import { useCollectionSorting, CollectionSortProvider } from "@/components/shared/design-system/collections/collection-sorting";
import { CollectionTableHead } from "@/components/shared/design-system/collections/collection-table-head";
import { sortDate } from "@/lib/collection-sort";
import { newestCreatedFirst } from "@/lib/collection-created-at";
import { CreatedAtHead, CreatedAtCell } from "@/components/shared/design-system/collections/collection-created-at";


import { useCallback, useEffect, useMemo, useState } from "react";
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
import { listAllOrganizations, type OrganizationListItem } from "@/lib/api/organizations";
import { listTMPMRAssessments } from "@/lib/api/tmpmr";
import type { TMPMRAssessment, TMPMRStatus } from "@/types/tmpmr";
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
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getMaturityVariant(maturityLevel: string): BadgeVariant {
  return maturityStyles.find((item) => maturityLevel.includes(item.match))?.variant ?? "secondary";
}

function getFilteredPeriods(items: TMPMRAssessment[]) {
  return [...new Set(items.map((item) => item.period).filter(Boolean))]
    .sort()
    .reverse();
}

export default function TMPMRListPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<TMPMRAssessment[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<TMPMRStatus | "all">("all");
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const [response, orgs] = await Promise.all([
        (async () => {
          const rows: TMPMRAssessment[] = [];
          let page = 1;
          while (true) {
            const response = await listTMPMRAssessments(token, { page, limit: 100 });
            const data = response.data ?? [];
            rows.push(...data);
            if (data.length === 0 || rows.length >= response.total) return rows;
            page += 1;
          }
        })(),
        listAllOrganizations(token),
      ]);

      setItems([...response].sort(newestCreatedFirst));
      setOrganizations(orgs);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memuat TMPMR.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const organizationMap = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization.name])),
    [organizations],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (periodFilter !== "all" && item.period !== periodFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;

      if (!query) return true;

      const orgName = organizationMap.get(item.organizationId)?.toLowerCase() ?? "";
      return [
        orgName,
        item.period.toLowerCase(),
        statusLabel[item.status].toLowerCase(),
        item.maturityLevel.toLowerCase(),
        item.score.toFixed(2),
      ].some((value) => value.includes(query));
    });
  }, [items, organizationMap, periodFilter, search, statusFilter]);

  const collectionSort = useCollectionSorting(filteredItems, {"Periode": r => r.period, "Organisasi": r => organizationMap.get(r.organizationId), "Skor": r => r.score, "Maturity": r => r.maturityLevel, "Status": r => r.status, "Diperbarui": r => sortDate(r.updatedAt)}, () => setPage(1));
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const paginatedItems = useMemo(
    () => collectionSort.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [collectionSort.rows, page],
  );

  const availablePeriods = useMemo(() => getFilteredPeriods(items), [items]);

  useEffect(() => {
    setPage(1);
  }, [search, periodFilter, statusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const summary = useMemo(
    () => ({
      total: items.length,
      draft: items.filter((item) => item.status === "draft").length,
      submitted: items.filter((item) => item.status === "submitted").length,
      reviewed: items.filter((item) => item.status === "reviewed").length,
      approved: items.filter((item) => item.status === "approved").length,
    }),
    [items],
  );

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
                containerClassName="w-full sm:w-[28rem] sm:flex-none"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari organisasi, skor, maturity level, atau periode"
                aria-label="Cari TMPMR"
              />
            }
            fields={[
              {
                id: "period",
                label: "Periode",
                value: periodFilter,
                onChange: setPeriodFilter,
                options: [
                  { value: "all", label: "Semua periode" },
                  ...availablePeriods.map((period) => ({ value: period, label: period })),
                ],
              },
              {
                id: "status",
                label: "Status",
                value: statusFilter,
                onChange: (value) => setStatusFilter(value as TMPMRStatus | "all"),
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
                  {paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="!p-0">
                        <CollectionEmptyState
                          title="Belum ada assessment yang cocok dengan filter ini"
                          description="Coba ubah filter atau buat assessment baru."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((item) => {
                      const orgName =
                        organizationMap.get(item.organizationId) ?? item.organizationId;
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
                            {formatDateTime(item.updatedAt)}
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

              {shouldShowCollectionPagination(filteredItems.length) ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-table-footer px-5 py-3 text-sm">
                  <p className="text-secondary-foreground">
                    Menampilkan {filteredItems.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
                    {" "}
                    hingga {Math.min(page * PAGE_SIZE, filteredItems.length)} dari {filteredItems.length}
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
