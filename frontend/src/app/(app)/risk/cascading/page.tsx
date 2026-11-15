"use client";
import { PageLoadingSkeleton, TableLoadingSkeleton } from "@/components/shared/design-system/feedback/loading-skeleton";
import { useOrganizationFilter } from "@/hooks/use-organization-filter";
import { ActionConfirmationDialog } from "@/components/shared/design-system/actions/action-confirmation-dialog";
import { CollectionCode } from "@/components/shared/design-system/collections/collection-code";
import { useRemoteCollectionSorting } from "@/components/shared/design-system/collections/collection-sorting";
import { CreatedAtHead, CreatedAtCell } from "@/components/shared/design-system/collections/collection-created-at";


import { DynamicTableFilters } from "@/components/shared/design-system/collections/dynamic-table-filters";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "@/components/shared/icons";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import {
  deleteRiskCascade,
  listRiskCascades,
  type ListRiskCascadesParams,
} from "@/lib/api/risk-cascades";
import type { RiskCascadeRecord, RiskCascadeType, RiskCascadeSummary } from "@/types/risk-cascade";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { RiskCascadeActionDialog } from "@/components/risk/risk-cascade-action-dialog";
import {
  CollectionPagination,
  CollectionEmptyState,
  CollectionErrorState,
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  CollectionPageHeader,
  CollectionToolbar,
  CollectionSearchField,
  KpiCard,
  MetricGrid,
} from "@/components/shared/design-system";
import {
  AccentButton,
  PageStack,
} from "@/components/shared/design-system";
import { RiskCascadeRowActions } from "@/components/shared/risk-cascade-row-actions";
import { getStatusBadgeClassName, toBadgeVariant, type StatusTone } from "@/lib/badge-variant";

const cascadeTypeLabels: Record<RiskCascadeType, string> = {
  mandatory_top_down: "Top-down",
  recommended_top_down: "Top-down",
  bottom_up_escalation: "Bottom-up",
};

const statusLabels: Record<string, string> = {
  proposed: "Menunggu Tinjauan",
  analyzed: "Sedang Ditinjau",
  accepted: "Disetujui",
  rejected: "Ditolak",
  implemented: "Selesai",
};

const statusTone: Record<string, StatusTone> = {
  proposed: "warning",
  analyzed: "progress",
  accepted: "success",
  rejected: "danger",
  implemented: "success",
};

function formatCascadeTitle(item: RiskCascadeRecord) {
  return item.sourceRiskTitle || "—";
}

export default function RiskCascadingPage() {
  const { token, user } = useAuth();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<RiskCascadeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<RiskCascadeSummary>({ total: 0, pending: 0, approved: 0, bottomUp: 0 });
  const requestVersion = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deletingItem, setDeletingItem] = useState<RiskCascadeRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createCascadeType, setCreateCascadeType] =
    useState<RiskCascadeType>("bottom_up_escalation");
  const [decisionItem, setDecisionItem] = useState<RiskCascadeRecord | null>(
    null,
  );

  const deferredSearch = useDeferredValue(search);
  const initialSourceRiskId = searchParams.get("sourceRiskId") || "";
  const initialMode = searchParams.get("mode");

  useEffect(() => {
    if (searchParams.get("sourceRiskId") || initialMode === "bottom-up") {
      setCreateOpen(true);
    }
    if (initialMode === "bottom-up") {
      setCreateCascadeType("bottom_up_escalation");
    }
  }, [initialMode, searchParams]);

  const organizationFilter = useOrganizationFilter(() => setPage(1));
  const collectionSort = useRemoteCollectionSorting({
    "Risiko": "risk", "Organisasi asal": "source_organization", "Jenis": "cascade_type",
    "Status": "status", "Adopsi": "adoption_type",
  }, () => setPage(1));

  const loadData = useCallback(async () => {
    if (!token) return;
    const request = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const params: ListRiskCascadesParams = {
        page, limit: pageSize,
        q: deferredSearch.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        cascade_type: typeFilter === "all" ? undefined : typeFilter,
        organizationId: organizationFilter.organizationId === "all" ? undefined : organizationFilter.organizationId,
        sort_by: collectionSort.sortBy,
        sort_order: collectionSort.sortOrder,
      };
      const response = await listRiskCascades(token, params);
      if (request !== requestVersion.current) return;
      const lastPage = Math.max(1, Math.ceil(response.total / pageSize));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setItems(response.data ?? []);
      setTotal(response.total);
      setSummary(response.summary);
    } catch (err) {
      if (request !== requestVersion.current) return;
      const message = err instanceof Error ? err.message : "Gagal memuat eskalasi.";
      setError(message);
      toast.error(message);
    } finally {
      if (request === requestVersion.current) setLoading(false);
    }
  }, [token, page, pageSize, deferredSearch, statusFilter, typeFilter, organizationFilter.organizationId, collectionSort.sortBy, collectionSort.sortOrder]);

  useEffect(() => {
    void loadData();
    return () => { requestVersion.current += 1; };
  }, [loadData]);

  const canReviewCascade = (item: RiskCascadeRecord) => {
    if (!["proposed", "analyzed"].includes(item.status)) {
      return false;
    }

    if (user?.isGlobal) {
      return true;
    }

    return Boolean(
      user?.accessibleOrgIds?.includes(item.targetOrgId) ||
        user?.organizationId === item.targetOrgId,
    );
  };

  const kpiCards = useMemo(
    () => [
      {
        label: "Total Eskalasi",
        value: String(summary.total),
      },
      {
        label: "Menunggu Tinjauan",
        value: String(summary.pending),
      },
      {
        label: "Sudah Disetujui",
        value: String(summary.approved),
      },
      {
        label: "Bottom-up",
        value: String(summary.bottomUp),
      },
    ],
    [summary],
  );

  const handleDelete = async (item: RiskCascadeRecord) => {
    if (!token) return;
    try {
      await deleteRiskCascade(token, item.id);
      toast.success("Draft eskalasi dihapus.");
      await loadData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal menghapus eskalasi.";
      toast.error(message);
      return false;
    }
  };

  if (loading && items.length === 0) {
    return <PageLoadingSkeleton><TableLoadingSkeleton message="Memuat eskalasi risiko…" /></PageLoadingSkeleton>;
  }

  return (
    <PageStack>
      <CollectionPageHeader title="Eskalasi Risiko" />

      <MetricGrid>
        {kpiCards.map((card) => (
          <KpiCard
            key={card.label}
            label={card.label}
            value={card.value}
            tone="white"
          />
        ))}
      </MetricGrid>

      <div className="space-y-4">
        <CollectionToolbar
          className="w-full"
          leading={
            <DynamicTableFilters search={
            <CollectionSearchField
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Cari kode risiko, organisasi, status, atau catatan..."
              aria-label="Cari eskalasi"
            />
            } fields={[
                organizationFilter.field,
              { id: "status", label: "Status", value: statusFilter, onChange: (value) => { setStatusFilter(value); setPage(1); }, options: [{ value: "all", label: "Semua status" }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))] },
              { id: "type", label: "Jenis", value: typeFilter, onChange: (value) => { setTypeFilter(value); setPage(1); }, options: [{ value: "all", label: "Semua jenis" }, ...Object.entries(cascadeTypeLabels).map(([value, label]) => ({ value, label: value === "mandatory_top_down" ? "Top-down wajib" : value === "recommended_top_down" ? "Top-down rekomendasi" : label }))] },
            ]} />
          }
          actions={
            <AccentButton
              icon={<Plus className="size-4" />}
              onClick={() => {
                setCreateCascadeType("bottom_up_escalation");
                setCreateOpen(true);
              }}
            >
              Eskalasi
            </AccentButton>
          }
        />

        {error ? <CollectionErrorState message={error} /> : null}

        <CollectionTableCard stickyActions sorting={collectionSort.controls}>
          <Table className="min-w-[1884px] table-fixed">
            <colgroup>
              <col style={{ width: 168 }} />
              <col style={{ width: 168 }} />
              <col style={{ width: 258 }} />
              <col style={{ width: 190 }} />
              <col style={{ width: 208 }} />
              <col style={{ width: 112 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 128 }} />
              <col style={{ width: 198 }} />
              <col style={{ width: 208 }} />
              <col style={{ width: 116 }} />
            </colgroup>
            <CollectionTableHeader>
              <CollectionTableHeaderRow>
                  <CollectionTableHead>Kode risiko asal</CollectionTableHead>
                  <CollectionTableHead>Kode risiko target</CollectionTableHead>
                  <CollectionTableHead>Risiko</CollectionTableHead>
                  <CollectionTableHead >
                    Organisasi asal
                  </CollectionTableHead>
                  <CollectionTableHead>Organisasi tujuan</CollectionTableHead>
                  <CollectionTableHead >
                    Jenis
                  </CollectionTableHead>
                  <CollectionTableHead >
                    Status
                  </CollectionTableHead>
                  <CollectionTableHead >
                    Adopsi
                  </CollectionTableHead>
                  <CollectionTableHead >
                    Catatan
                  </CollectionTableHead>
                  <CreatedAtHead />
                  <CollectionTableHead data-collection-action="" className="text-right">
                    <span data-collection-action="" className="sr-only">Aksi</span>
                  </CollectionTableHead>
                </CollectionTableHeaderRow>
              </CollectionTableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="text-center"
                    >
                      <CollectionEmptyState
                        title="Belum ada eskalasi yang cocok"
                        description="Coba ubah kata kunci atau sesuaikan filter."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => {
                    const canReview = canReviewCascade(item);
                    const canDelete = item.status === "proposed";
                    const statusLabel =
                      statusLabels[item.status] || item.status;
                    return (
                      <TableRow key={item.id}>
                        <TableCell><CollectionCode code={item.sourceRiskCode} href={item.sourceRiskId ? `/risk/register/${item.sourceRiskId}` : undefined} /></TableCell>
                        <TableCell><CollectionCode code={item.targetRiskCode} href={item.targetRiskId ? `/risk/register/${item.targetRiskId}` : undefined} /></TableCell>
                        <TableCell className="font-medium">{formatCascadeTitle(item)}</TableCell>
                        <TableCell>{item.sourceOrgName || "—"}</TableCell>
                        <TableCell>{item.targetOrgName || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {cascadeTypeLabels[item.cascadeType]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={toBadgeVariant(statusTone[item.status])} className={`capitalize ${getStatusBadgeClassName(statusTone[item.status])}`}>
                            {statusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="">
                          {item.adoptionType || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.decisionNote || item.analysisNote || "—"}</TableCell>
                        <CreatedAtCell record={item} />
                        <TableCell data-collection-action="" className="text-right">
                          <div className="flex justify-end">
                            <RiskCascadeRowActions
                              item={item}
                              onReview={
                                canReview
                                  ? () => setDecisionItem(item)
                                  : undefined
                              }
                              onDelete={
                                canDelete ? () => setDeletingItem(item) : undefined
                              }
                            />
                            {!canReview && !canDelete && (
                              <span className="text-xs text-muted-foreground">
                                Tidak ada aksi
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
        <CollectionPagination
          itemLabel="eskalasi"
          page={page}
          pageSize={pageSize}
          total={total}
          disabled={loading}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
        />
        </CollectionTableCard>
      </div>

      <RiskCascadeActionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        initialSourceRiskId={initialSourceRiskId}
        initialCascadeType={createCascadeType}
        onSaved={loadData}
      />
      <RiskCascadeActionDialog
        open={Boolean(decisionItem)}
        onOpenChange={(open) => {
          if (!open) setDecisionItem(null);
        }}
        mode="decision"
        cascade={decisionItem}
        onSaved={loadData}
      />
      <ActionConfirmationDialog
        open={Boolean(deletingItem)} onOpenChange={(open) => { if (!open) setDeletingItem(null); }}
        title="Hapus draf eskalasi?" description={deletingItem ? formatCascadeTitle(deletingItem) : "Periksa draf eskalasi yang akan dihapus."}
        confirmLabel="Hapus draf eskalasi" variant="destructive"
        onConfirm={() => deletingItem ? handleDelete(deletingItem) : false}
      >
        Draf eskalasi beserta isinya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
      </ActionConfirmationDialog>
    </PageStack>
  );
}
