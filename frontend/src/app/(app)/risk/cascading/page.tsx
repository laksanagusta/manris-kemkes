"use client";
import { CollectionCode } from "@/components/shared/design-system/collections/collection-code";
import { useCollectionSorting } from "@/components/shared/design-system/collections/collection-sorting";
import { newestCreatedFirst } from "@/lib/collection-created-at";
import { CreatedAtHead, CreatedAtCell } from "@/components/shared/design-system/collections/collection-created-at";


import { DynamicTableFilters } from "@/components/shared/design-system/collections/dynamic-table-filters";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "@/components/shared/icons";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import {
  deleteRiskCascade,
  listRiskCascades,
  type ListRiskCascadesParams,
} from "@/lib/api/risk-cascades";
import type { RiskCascadeRecord, RiskCascadeType } from "@/types/risk-cascade";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const params: ListRiskCascadesParams = {
        page: 1,
        limit: 100,
      };
      const response = await listRiskCascades(token, params);
      const allItems = [...(response.data ?? [])];
      for (let nextPage = 2; allItems.length < response.total; nextPage += 1) {
        const next = await listRiskCascades(token, { ...params, page: nextPage });
        if (!next.data?.length) break;
        allItems.push(...next.data);
      }
      setItems([...allItems].sort(newestCreatedFirst));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal memuat eskalasi.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return items.filter((item) => (statusFilter === "all" || item.status === statusFilter) && (typeFilter === "all" || item.cascadeType === typeFilter)).filter((item) => !query ||
      [
        item.sourceRiskCode,
        item.sourceRiskTitle,
        item.sourceOrgName,
        item.targetOrgName,
        item.analysisNote,
        item.decisionNote,
        item.cascadeType,
        item.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [deferredSearch, items, statusFilter, typeFilter]);

  const collectionSort = useCollectionSorting(filteredItems, {"Risiko": r => formatCascadeTitle(r), "Organisasi asal": r => r.sourceOrgName, "Jenis": r => cascadeTypeLabels[r.cascadeType], "Status": r => statusLabels[r.status], "Adopsi": r => r.adoptionType}, () => setPage(1));
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(
    () => collectionSort.rows.slice((page - 1) * pageSize, page * pageSize),
    [collectionSort.rows, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

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

  const summary = useMemo(() => {
    const total = items.length;
    const pending = items.filter((item) =>
      ["proposed", "analyzed"].includes(item.status),
    ).length;
    const approved = items.filter((item) =>
      ["accepted", "implemented"].includes(item.status),
    ).length;
    const bottomUp = items.filter(
      (item) => item.cascadeType === "bottom_up_escalation",
    ).length;
    return { total, pending, approved, bottomUp };
  }, [items]);

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
    if (
      !window.confirm(
        "Hapus draft eskalasi ini? Aksi ini tidak bisa dibatalkan.",
      )
    ) {
      return;
    }
    try {
      await deleteRiskCascade(token, item.id);
      toast.success("Draft eskalasi dihapus.");
      await loadData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal menghapus eskalasi.";
      toast.error(message);
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="rounded-lg bg-state-surface px-4 py-8 text-center text-sm text-state-foreground">
        Memuat eskalasi risiko...
      </div>
    );
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari kode risiko, organisasi, status, atau catatan..."
              aria-label="Cari eskalasi"
            />
            } fields={[
              { id: "status", label: "Status", value: statusFilter, onChange: setStatusFilter, options: [{ value: "all", label: "Semua status" }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))] },
              { id: "type", label: "Jenis", value: typeFilter, onChange: setTypeFilter, options: [{ value: "all", label: "Semua jenis" }, ...Object.entries(cascadeTypeLabels).map(([value, label]) => ({ value, label: value === "mandatory_top_down" ? "Top-down wajib" : value === "recommended_top_down" ? "Top-down rekomendasi" : label }))] },
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
                {paginatedItems.length === 0 ? (
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
                  paginatedItems.map((item) => {
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
                                canDelete ? () => handleDelete(item) : undefined
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
          total={filteredItems.length}
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
    </PageStack>
  );
}
