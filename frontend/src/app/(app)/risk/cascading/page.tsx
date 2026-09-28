"use client";

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
  const code = item.sourceRiskCode || "Risk";
  const title = item.sourceRiskTitle || "-";
  return `${code} · ${title}`;
}

export default function RiskCascadingPage() {
  const { token, user } = useAuth();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<RiskCascadeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
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
      setItems(response.data ?? []);
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
    if (!query) return items;
    return items.filter((item) =>
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
  }, [deferredSearch, items]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(
    () => filteredItems.slice((page - 1) * pageSize, page * pageSize),
    [filteredItems, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

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
            <CollectionSearchField
              containerClassName="w-full sm:w-80 sm:flex-none"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari kode risiko, organisasi, status, atau catatan..."
              aria-label="Cari eskalasi"
            />
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

        <CollectionTableCard>
          <Table className="min-w-[1120px] table-fixed">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[18%]" />
              <col className="w-[11%]" />
              <col className="w-[12%]" />
              <col className="w-[11%]" />
              <col className="w-[20%]" />
              <col className="w-[6%]" />
            </colgroup>
            <CollectionTableHeader>
              <CollectionTableHeaderRow>
                  <CollectionTableHead className="px-24">
                    Risiko
                  </CollectionTableHead>
                  <CollectionTableHead >
                    Organisasi
                  </CollectionTableHead>
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
                  <CollectionTableHead className="text-right">
                    <span className="sr-only">Aksi</span>
                  </CollectionTableHead>
                </CollectionTableHeaderRow>
              </CollectionTableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
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
                        <TableCell className="px-24">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">
                              {formatCascadeTitle(item)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.targetRiskCode
                                ? `Target: ${item.targetRiskCode}`
                                : "Belum ada risiko target"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <p>{item.sourceOrgName || "-"}</p>
                            <p className="text-xs text-muted-foreground">
                              → {item.targetOrgName || "-"}
                            </p>
                          </div>
                        </TableCell>
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
                        <TableCell className="max-w-[320px]">
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {item.decisionNote || item.analysisNote || "-"}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
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
