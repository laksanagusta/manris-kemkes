"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import {
  listOrganizationGroups,
  type OrganizationGroupListItem,
} from "@/lib/api/organization-groups";
import {
  listAllOrganizations,
  type OrganizationListItem,
} from "@/lib/api/organizations";
import { listPlanningObjectiveCompatibility } from "@/lib/api/planning";
import {
  getPerformanceRiskDetail,
  getPerformanceRiskSummary,
  listPerformanceRiskNodes,
  listPerformanceRiskUnlinkedRisks,
} from "@/lib/api/performance-risk";
import {
  classifyPerformanceRiskEmptyState,
  sortPerformanceRiskNodes,
} from "@/lib/performance-risk";
import { riskCategoryLabels } from "@/lib/risk";
import {
  buildSelectableReportOrganizations,
  buildSelectableReportOrganizationGroups,
  needsExplicitReportOrgSelection,
} from "@/lib/report-scope";
import {
  copyReportsFilterScope,
  resolveDefaultReportsFilterScope,
  resolveReportsFilterScopeOrgIds,
  type ReportsFilterScope,
} from "@/lib/reports-filter-sheet";
import type { PlanningObjectiveCompatibilityItem } from "@/types/planning";
import type {
  PerformanceRiskDetail,
  PerformanceRiskNode,
  PerformanceRiskRiskRow,
  PerformanceRiskSummary,
} from "@/types/performance-risk";
import { PerformanceRiskDetailPanel } from "./_components/detail-panel";
import {
  PerformanceRiskFilterBar,
} from "./_components/filter-bar";
import { PerformanceRiskNodeRankingTable } from "./_components/node-ranking-table";
import { PerformanceRiskSummaryCards } from "./_components/summary-cards";

const EMPTY_REPORT_SCOPE: ReportsFilterScope = {
  organizationId: "",
  organizationGroupId: "",
  organizationIds: [],
};

type PerformanceRiskPlanningOption = {
  id: string;
  title: string;
  status: string;
  period: string;
};

function buildPlanningOptions(items: PlanningObjectiveCompatibilityItem[]) {
  const options = new Map<string, PerformanceRiskPlanningOption>();

  for (const item of items) {
    if (!item.planningId || options.has(item.planningId)) continue;
    options.set(item.planningId, {
      id: item.planningId,
      title: item.planningTitle || "Perjanjian Kinerja",
      status: item.planningStatus || "draft",
      period: item.planningPeriod || item.period || "",
    });
  }

  return [...options.values()].sort((left, right) => {
    if (left.status !== right.status) {
      if (left.status === "active") return -1;
      if (right.status === "active") return 1;
    }
    return right.title.localeCompare(left.title);
  });
}

function matchesSearch(node: PerformanceRiskNode, query: string) {
  if (!query) return true;
  const needle = query.toLowerCase();
  return [
    node.roTitle,
    node.programTitle,
    node.activityTitle,
    node.ikuTitle,
    node.objectiveTitle,
    node.planningTitle,
  ].some((value) => (value ?? "").toLowerCase().includes(needle));
}

export default function PerformanceRiskPage() {
  const { token, user } = useAuth();
  const [planningId, setPlanningId] = useState("");
  const [planningOptions, setPlanningOptions] = useState<
    PerformanceRiskPlanningOption[]
  >([]);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    [],
  );
  const [organizationGroups, setOrganizationGroups] = useState<
    OrganizationGroupListItem[]
  >([]);
  const [appliedScope, setAppliedScope] = useState<ReportsFilterScope>(() =>
    copyReportsFilterScope(EMPTY_REPORT_SCOPE),
  );
  const [draftScope, setDraftScope] = useState<ReportsFilterScope>(() =>
    copyReportsFilterScope(EMPTY_REPORT_SCOPE),
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const scopeInitializedForTokenRef = useRef<string | null>(null);
  const [summary, setSummary] = useState<PerformanceRiskSummary | null>(null);
  const [nodes, setNodes] = useState<PerformanceRiskNode[]>([]);
  const [unlinkedRisks, setUnlinkedRisks] = useState<PerformanceRiskRiskRow[]>(
    [],
  );
  const [selectedNode, setSelectedNode] = useState<PerformanceRiskNode | null>(
    null,
  );
  const [detail, setDetail] = useState<PerformanceRiskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [showNoRisk, setShowNoRisk] = useState(false);

  const requiresOrganizationSelection = needsExplicitReportOrgSelection(user);
  const appliedScopeOrgIds = useMemo(
    () => resolveReportsFilterScopeOrgIds(appliedScope, organizationGroups),
    [appliedScope, organizationGroups],
  );
  const hasAppliedScope =
    appliedScopeOrgIds.length > 0 || Boolean(appliedScope.organizationGroupId);
  const requiresScopeSelection =
    requiresOrganizationSelection && !hasAppliedScope;
  const planningOrganizationId = useMemo(() => {
    if (appliedScopeOrgIds.length === 1) {
      return appliedScopeOrgIds[0];
    }
    return "";
  }, [appliedScopeOrgIds]);
  const performanceRiskQuery = useMemo(
    () => ({
      planningId: planningId || undefined,
      orgId:
        appliedScopeOrgIds.length > 0
          ? appliedScopeOrgIds.join(",")
          : undefined,
    }),
    [appliedScopeOrgIds, planningId],
  );

  useEffect(() => {
    if (!token) {
      setOrganizations([]);
      setOrganizationGroups([]);
      setAppliedScope(copyReportsFilterScope(EMPTY_REPORT_SCOPE));
      setDraftScope(copyReportsFilterScope(EMPTY_REPORT_SCOPE));
      setFilterOpen(false);
      scopeInitializedForTokenRef.current = null;
      return;
    }

    Promise.all([
      listAllOrganizations(token),
      listOrganizationGroups(token, {
        ownerOrganizationId: user?.isGlobal
          ? undefined
          : user?.organizationId ?? undefined,
        includeMembers: true,
        limit: 100,
        page: 1,
      }),
    ])
      .then(([items, groupsResponse]) => {
        setOrganizations(buildSelectableReportOrganizations(user, items));
        setOrganizationGroups(
          buildSelectableReportOrganizationGroups(
            user,
            groupsResponse.data ?? [],
          ),
        );
      })
      .catch((error) => {
        console.error(error);
        toast.error("Gagal memuat daftar unit.");
      });
  }, [token, user]);

  useEffect(() => {
    const scopeInitKey = token
      ? `${token}:${user?.isGlobal ? "1" : "0"}:${user?.organizationId ?? ""}`
      : null;

    if (
      !scopeInitKey ||
      organizations.length === 0 ||
      scopeInitializedForTokenRef.current === scopeInitKey
    ) {
      return;
    }

    const defaultScope = resolveDefaultReportsFilterScope(user, organizations);
    setAppliedScope(defaultScope);
    setDraftScope(copyReportsFilterScope(defaultScope));
    scopeInitializedForTokenRef.current = scopeInitKey;
  }, [organizations, token, user]);

  const handleFilterOpenChange = (open: boolean) => {
    setFilterOpen(open);
    if (open) {
      setDraftScope(copyReportsFilterScope(appliedScope));
    }
  };

  const handleCancelFilter = () => {
    setDraftScope(copyReportsFilterScope(appliedScope));
    setFilterOpen(false);
  };

  const handleResetFilter = () => {
    setDraftScope(resolveDefaultReportsFilterScope(user, organizations));
  };

  const handleApplyFilter = () => {
    setAppliedScope(copyReportsFilterScope(draftScope));
    setFilterOpen(false);
  };

  useEffect(() => {
    if (!token || !planningId) {
      setLoading(false);
      return;
    }

    if (requiresScopeSelection) {
      setLoading(false);
      setSummary(null);
      setNodes([]);
      setUnlinkedRisks([]);
      return;
    }

    setLoading(true);
    setSelectedNode(null);
    setDetail(null);

    Promise.all([
      getPerformanceRiskSummary(token, performanceRiskQuery),
      listPerformanceRiskNodes(token, performanceRiskQuery),
      listPerformanceRiskUnlinkedRisks(token, performanceRiskQuery),
    ])
      .then(([summaryResponse, nodesResponse, unlinkedResponse]) => {
        setSummary(summaryResponse);
        setNodes(sortPerformanceRiskNodes(nodesResponse));
        setUnlinkedRisks(unlinkedResponse);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Gagal memuat Analisis Kinerja & Risiko.");
      })
      .finally(() => setLoading(false));
  }, [
    performanceRiskQuery,
    planningId,
    requiresScopeSelection,
    token,
  ]);

  useEffect(() => {
    if (!token) return;

    listPlanningObjectiveCompatibility(token, {
      organization_id:
        planningOrganizationId || undefined,
      page: 1,
      limit: 100,
    })
      .then((response) => {
        const options = buildPlanningOptions(response.data ?? []);
        setPlanningOptions(options);
        setPlanningId((current) => {
          if (current && options.some((option) => option.id === current)) {
            return current;
          }
          return (
            options.find((option) => option.status === "active")?.id ??
            options[0]?.id ??
            ""
          );
        });
      })
      .catch((error) => {
        console.error(error);
        toast.error("Gagal memuat daftar perjanjian kinerja.");
      });
  }, [planningOrganizationId, token]);

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (!showNoRisk && node.riskCount === 0) return false;
      if (!matchesSearch(node, searchText.trim())) return false;
      return true;
    });
  }, [nodes, searchText, showNoRisk]);

  const emptyState = summary
    ? classifyPerformanceRiskEmptyState(summary)
    : "ready";

  const handleSelectNode = async (node: PerformanceRiskNode) => {
    if (!token) return;

    setSelectedNode(node);
    setDetailLoading(true);
    try {
      const response = await getPerformanceRiskDetail(
        token,
        node.roId,
        performanceRiskQuery,
      );
      setDetail(response);
    } catch (error) {
      console.error(error);
      toast.error("Gagal memuat detail RO.");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="max-w-3xl space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Analisis Kinerja & Risiko
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Memetakan paparan risiko inherent terhadap sasaran, IKU, program,
          kegiatan, dan RO.
        </p>
      </section>

      {requiresScopeSelection ? (
        <Card className="border-border/50 bg-card/90 shadow-sm">
          <CardContent className="flex min-h-40 items-center justify-center px-6 py-8 text-center">
            <div className="max-w-sm space-y-2">
              <p className="text-sm font-medium text-foreground">
                Pilih grup atau unit terlebih dahulu.
              </p>
              <p className="text-sm text-muted-foreground">
                Analisis kinerja dan risiko lintas-scope baru bisa dibuka setelah
                scope dipilih.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <PerformanceRiskSummaryCards summary={summary} />

      <PerformanceRiskFilterBar
        planningId={planningId}
        planningOptions={planningOptions}
        onPlanningChange={setPlanningId}
        filterOpen={filterOpen}
        onFilterOpenChange={handleFilterOpenChange}
        organizations={organizations}
        organizationGroups={organizationGroups}
        draftScope={draftScope}
        onDraftScopeChange={setDraftScope}
        onResetFilter={handleResetFilter}
        onCancelFilter={handleCancelFilter}
        onApplyFilter={handleApplyFilter}
        activeUnitCount={appliedScopeOrgIds.length}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        showNoRisk={showNoRisk}
        onShowNoRiskChange={setShowNoRisk}
      />

      {emptyState === "no_planning" ? (
        <Card className="border-border/50 bg-card/90 shadow-sm">
          <CardContent className="flex min-h-40 items-center justify-center px-6 py-8 text-center text-sm text-muted-foreground">
            Struktur RO belum tersedia untuk periode ini.
          </CardContent>
        </Card>
      ) : null}

      {emptyState === "no_linked_risk" ? (
        <Card className="border-border/50 bg-card/90 shadow-sm">
          <CardContent className="flex min-h-40 items-center justify-center px-6 py-8 text-center text-sm text-muted-foreground">
            Belum ada risiko approved yang terhubung ke RO pada periode ini.
          </CardContent>
        </Card>
      ) : null}

      {summary?.unlinkedRisks ? (
        <Card className="border-amber-200 bg-amber-50/70 shadow-sm">
          <CardContent className="space-y-4 px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-amber-950">
                  Data Quality: Risiko Tanpa RO
                </h2>
                <p className="text-sm text-amber-900/80">
                  {summary.unlinkedRisks} risiko approved belum memiliki relasi
                  ke RO.
                </p>
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-900/70">
                {unlinkedRisks.length} item
              </p>
            </div>
            <div className="overflow-hidden rounded-lg border border-amber-200 bg-white/70">
              <Table className="text-sm">
                <TableHeader className="[&_tr]:border-amber-200">
                  <TableRow className="border-amber-200 bg-amber-100/50 hover:bg-amber-100/50">
                    <TableHead className="w-24 px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-amber-950">
                      Kode
                    </TableHead>
                    <TableHead className="px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-amber-950">
                      Judul Risiko
                    </TableHead>
                    <TableHead className="w-56 px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-amber-950">
                      Unit
                    </TableHead>
                    <TableHead className="w-32 px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-amber-950">
                      Kategori
                    </TableHead>
                    <TableHead className="w-28 px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-amber-950">
                      Cycle
                    </TableHead>
                    <TableHead className="w-24 px-3 py-2 text-right text-xs font-medium uppercase tracking-[0.12em] text-amber-950">
                      Skor
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-amber-200">
                  {unlinkedRisks.map((risk) => (
                    <TableRow
                      key={risk.id}
                      className="border-amber-200 hover:bg-amber-100/30"
                    >
                      <TableCell className="px-3 py-2.5 font-medium text-amber-950">
                        {risk.code}
                      </TableCell>
                      <TableCell className="max-w-[420px] px-3 py-2.5">
                        <div className="line-clamp-2 text-amber-950">
                          {risk.title}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-amber-900/80">
                        {risk.organizationName}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-amber-900/80">
                        {riskCategoryLabels[
                          risk.category as keyof typeof riskCategoryLabels
                        ] || "Belum dikategorikan"}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-amber-900/80">
                        {risk.assessmentCycle || "-"}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right font-semibold tabular-nums text-amber-950">
                        {risk.inherentScore}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-4">
        {loading ? (
          <Card className="border-border/50 bg-card/90 shadow-sm">
            <CardContent className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              Memuat analisis...
            </CardContent>
          </Card>
        ) : filteredNodes.length > 0 ? (
          <PerformanceRiskNodeRankingTable
            nodes={filteredNodes}
            selectedROId={selectedNode?.roId}
            onSelect={handleSelectNode}
          />
        ) : (
          <Card className="border-border/50 bg-card/90 shadow-sm">
            <CardContent className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              Tidak ada RO yang cocok dengan filter aktif.
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Detail RO</h2>
        <PerformanceRiskDetailPanel detail={detail} loading={detailLoading} />
      </section>
    </div>
  );
}
