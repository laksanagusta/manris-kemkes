"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { RiskCascadeActionDialog } from "@/components/risk/risk-cascade-action-dialog";
import {
  CollectionPagination,
  CollectionErrorState,
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  CollectionToolbar,
  DashboardKpiCard,
  ExpandableSearchField,
} from "@/components/shared/design-system";
import {
  AccentButton,
  PageStack,
} from "@/components/shared/design-system";
import { RiskCascadeRowActions } from "@/components/shared/risk-cascade-row-actions";

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

const statusTone: Record<string, string> = {
  proposed: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  analyzed: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  accepted: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  implemented: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
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
    useState<RiskCascadeType>("mandatory_top_down");
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
        title: "Total Eskalasi",
        value: String(summary.total),
        change: "Baru",
        trend: "unavailable" as const,
        tone: "neutral" as const,
      },
      {
        title: "Menunggu Tinjauan",
        value: String(summary.pending),
        change: "Baru",
        trend: "unavailable" as const,
        tone: "warning" as const,
      },
      {
        title: "Sudah Disetujui",
        value: String(summary.approved),
        change: "Baru",
        trend: "unavailable" as const,
        tone: "success" as const,
      },
      {
        title: "Bottom-up",
        value: String(summary.bottomUp),
        change: "Baru",
        trend: "unavailable" as const,
        tone: "neutral" as const,
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
      <div className="py-8 text-center text-sm text-muted-foreground">
        Memuat eskalasi risiko...
      </div>
    );
  }

  return (
    <PageStack>
      <CollectionToolbar
        actions={
          <AccentButton
            icon={<Plus className="size-4" />}
            onClick={() => {
              setCreateCascadeType("mandatory_top_down");
              setCreateOpen(true);
            }}
          >
            Eskalasi
          </AccentButton>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <DashboardKpiCard key={card.title} {...card} />
        ))}
      </div>

      <div className="space-y-5">
          <div className="flex justify-end">
            <ExpandableSearchField
              value={search}
              onChange={setSearch}
              placeholder="Cari kode risiko, organisasi, status, atau catatan..."
              ariaLabel="Cari eskalasi"
            />
          </div>

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
                  <CollectionTableHead className="pl-4 pr-3">
                    Risiko
                  </CollectionTableHead>
                  <CollectionTableHead className="px-3">
                    Organisasi
                  </CollectionTableHead>
                  <CollectionTableHead className="px-3">
                    Jenis
                  </CollectionTableHead>
                  <CollectionTableHead className="px-3">
                    Status
                  </CollectionTableHead>
                  <CollectionTableHead className="px-3">
                    Adopsi
                  </CollectionTableHead>
                  <CollectionTableHead className="px-3">
                    Catatan
                  </CollectionTableHead>
                  <CollectionTableHead className="px-3 text-right">
                    Aksi
                  </CollectionTableHead>
                </CollectionTableHeaderRow>
              </CollectionTableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Belum ada eskalasi yang cocok.
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
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">
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
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize",
                              statusTone[item.status],
                            )}
                          >
                            {statusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm capitalize">
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
