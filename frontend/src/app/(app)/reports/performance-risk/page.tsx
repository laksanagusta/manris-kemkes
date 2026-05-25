"use client";

import { useEffect, useMemo, useState } from "react";
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
  needsExplicitReportOrgSelection,
  resolveDefaultReportOrgId,
} from "@/lib/report-scope";
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
  type PerformanceRiskPlanningOption,
  type PerformanceRiskLevelFilter,
  type PerformanceRiskMitigationFilter,
} from "./_components/filter-bar";
import { PerformanceRiskNodeRankingTable } from "./_components/node-ranking-table";
import { PerformanceRiskSummaryCards } from "./_components/summary-cards";

function currentGlobalCycle() {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? "H1" : "H2";
  return `${year}-${half}`;
}

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

function matchesMitigationFilter(
  node: PerformanceRiskNode,
  filter: PerformanceRiskMitigationFilter,
) {
  switch (filter) {
    case "overdue":
      return node.mitigationOverdue > 0;
    case "pending":
      return node.mitigationPending > 0 && node.mitigationOverdue === 0;
    case "clear":
      return node.mitigationPending === 0 && node.mitigationOverdue === 0;
    default:
      return true;
  }
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
  const [organizationId, setOrganizationId] = useState("");
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
  const [riskLevelFilter, setRiskLevelFilter] =
    useState<PerformanceRiskLevelFilter>("all");
  const [mitigationFilter, setMitigationFilter] =
    useState<PerformanceRiskMitigationFilter>("all");
  const [showNoRisk, setShowNoRisk] = useState(false);
  const requiresOrganizationSelection = needsExplicitReportOrgSelection(user);

  useEffect(() => {
    if (!token) return;

    listAllOrganizations(token)
      .then((items) =>
        setOrganizations(buildSelectableReportOrganizations(user, items)),
      )
      .catch((error) => {
        console.error(error);
        toast.error("Gagal memuat daftar unit.");
      });
  }, [token, user]);

  useEffect(() => {
    if (!token) return;

    listPlanningObjectiveCompatibility(token, {
      organization_id: organizationId || undefined,
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
          return options.find((option) => option.status === "active")?.id ?? options[0]?.id ?? "";
        });
      })
      .catch((error) => {
        console.error(error);
        toast.error("Gagal memuat daftar perjanjian kinerja.");
      });
  }, [organizationId, token, user]);

  useEffect(() => {
    if (organizations.length === 0) return;

    if (user?.isGlobal) {
      setOrganizationId("");
      return;
    }

    const defaultOrgId = resolveDefaultReportOrgId(user);
    if (defaultOrgId) {
      setOrganizationId((current) => current || defaultOrgId);
      return;
    }

    if (requiresOrganizationSelection) {
      setOrganizationId("");
      return;
    }

    setOrganizationId((current) => current || organizations[0]?.id || "");
  }, [organizations, requiresOrganizationSelection, user]);

  useEffect(() => {
    if (
      !token ||
      !planningId ||
      (requiresOrganizationSelection && !organizationId)
    ) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setSelectedNode(null);
    setDetail(null);

    const query = {
      planningId: planningId || undefined,
      orgId: organizationId || undefined,
    };
    Promise.all([
      getPerformanceRiskSummary(token, query),
      listPerformanceRiskNodes(token, query),
      listPerformanceRiskUnlinkedRisks(token, query),
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
    planningId,
    organizationId,
    requiresOrganizationSelection,
    token,
  ]);

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (!showNoRisk && node.riskCount === 0) return false;
      if (!matchesSearch(node, searchText.trim())) return false;

      if (riskLevelFilter !== "all" && node.highestLevel !== riskLevelFilter) {
        return false;
      }

      if (!matchesMitigationFilter(node, mitigationFilter)) {
        return false;
      }

      return true;
    });
  }, [mitigationFilter, nodes, riskLevelFilter, searchText, showNoRisk]);

  const emptyState = summary
    ? classifyPerformanceRiskEmptyState(summary)
    : "ready";

  const handleSelectNode = async (node: PerformanceRiskNode) => {
    if (!token) return;

    setSelectedNode(node);
    setDetailLoading(true);
    try {
      const response = await getPerformanceRiskDetail(token, node.roId, {
        planningId: planningId || undefined,
        orgId: organizationId || undefined,
      });
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

      {requiresOrganizationSelection && !organizationId ? (
        <Card className="border-border/50 bg-card/90 shadow-sm">
          <CardContent className="flex min-h-40 items-center justify-center px-6 py-8 text-center">
            <div className="max-w-sm space-y-2">
              <p className="text-sm font-medium text-foreground">
                Pilih unit terlebih dahulu
              </p>
              <p className="text-sm text-muted-foreground">
                Analisis kinerja dan risiko lintas-unit baru bisa dibuka setelah
                unit dipilih.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <PerformanceRiskFilterBar
        planningId={planningId}
        planningOptions={planningOptions}
        onPlanningChange={setPlanningId}
        organizationId={organizationId}
        organizations={organizations}
        onOrganizationChange={setOrganizationId}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        riskLevelFilter={riskLevelFilter}
        onRiskLevelFilterChange={setRiskLevelFilter}
        mitigationFilter={mitigationFilter}
        onMitigationFilterChange={setMitigationFilter}
        showNoRisk={showNoRisk}
        onShowNoRiskChange={setShowNoRisk}
      />

      <PerformanceRiskSummaryCards summary={summary} />

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
