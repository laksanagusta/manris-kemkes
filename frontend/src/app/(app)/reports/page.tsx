"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReportScopePicker } from "@/components/report/report-scope-picker";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  TrendingUp,
  ArrowUpRight,
  ChevronDown,
} from "@/components/ui/icons";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  listAllOrganizations,
  type OrganizationListItem,
} from "@/lib/api/organizations";
import {
  listOrganizationGroups,
  type OrganizationGroupListItem,
} from "@/lib/api/organization-groups";
import { SemesterTargetTrend } from "./_components/inherent-residual-trend";
import { CriticalRiskRateTrend } from "./_components/critical-risk-rate-trend";
import { RiskMovementByOrg } from "./_components/risk-movement-by-org";
import { cn } from "@/lib/utils";
import {
  exportRiskBulkCSV,
  exportRiskBulkXLSX,
  downloadBlob,
  type RiskExportItem,
} from "@/lib/risk-export";
import { exportMovementByOrgXLSX } from "@/lib/risk-movement-by-org-export";
import {
  buildMovementChartData,
  buildMovementSnapshotData,
  buildUnitExposureData,
  buildSemesterScoreTargetTrendData,
  buildCriticalRiskRateTrendData,
  buildMovementByOrgData,
  type MovementSnapshotDatum,
  type MovementByOrgSortKey,
} from "@/lib/dashboard-insights";
import {
  buildRiskTrendData,
  type RiskTrendSourceItem,
  type RiskTrendWindow,
} from "@/lib/risk-report-trend";
import {
  buildSelectableReportOrganizations,
  buildSelectableReportOrganizationGroups,
  needsExplicitReportOrgSelection,
} from "@/lib/report-scope";
import {
  copyReportsFilterScope,
  resolveDefaultReportsFilterScope,
  type ReportsFilterScope,
} from "@/lib/reports-filter-sheet";
import type {
  Risk,
  RiskCycleComparisonItem,
} from "@/types/risk";
import { currentAssessmentCycle, shiftAssessmentCycle } from "@/lib/risk-cycle-options";
import {
  CollectionPageHeader,
  CollectionToolbar,
} from "@/components/shared/design-system";
import {
  AccentButton,
  ActionButton,
  PageStack,
} from "@/components/shared/design-system";
import {
  ReportDrilldownSummary,
  ReportEmptyState,
  ReportLinkGrid,
  ReportPanel,
} from "@/components/shared/design-system";

type RiskCycleSnapshotItem = RiskExportItem & {
  assessmentCycle?: string;
  status?: string;
};

const trendColors: Record<string, string> = {
  Rendah: "oklch(0.85 0.07 190)",
  Sedang: "oklch(0.78 0.10 190)",
  Tinggi: "oklch(0.72 0.13 190)",
  "Sangat Tinggi": "oklch(0.62 0.17 190)",
};

const EMPTY_REPORT_SCOPE: ReportsFilterScope = {
  organizationId: "",
  organizationGroupId: "",
  organizationIds: [],
};

const exportOptions = [
  {
    key: "risk-xlsx",
    title: "Daftar Risiko (Excel)",
    description: "Ekspor seluruh risiko ke format Excel lengkap",
    icon: FileSpreadsheet,
    format: "XLSX",
    isEnabled: true,
  },
  //   key: "kri-xlsx",
  //   title: "KRI Summary (Excel)",
  //   description: "Export KRI belum termasuk ruang lingkup delivery ini",
  //   icon: FileSpreadsheet,
  //   format: "XLSX",
  //   isEnabled: false,
  // },
  {
    key: "risk-pdf",
    title: "Laporan Risiko (PDF)",
    description: "Unduh laporan eksekutif lengkap dalam format PDF",
    icon: FileText,
    format: "PDF",
    isEnabled: true,
  },
  {
    key: "movement-by-org-xlsx",
    title: "Perubahan per Unit (Excel)",
    description: "Tabel perubahan risiko per unit",
    icon: FileSpreadsheet,
    format: "XLSX",
    isEnabled: true,
  },
];

function currentGlobalCycle() {
  return currentAssessmentCycle();
}

function previousGlobalCycle(cycle: string) {
  return shiftAssessmentCycle(cycle, -1);
}

export default function ReportsPage() {
  const { token, user } = useAuth();
  const [reportOrganizations, setReportOrganizations] = useState<
    OrganizationListItem[]
  >([]);
  const [reportOrganizationGroups, setReportOrganizationGroups] = useState<
    OrganizationGroupListItem[]
  >([]);
  const [appliedReportScope, setAppliedReportScope] =
    useState<ReportsFilterScope>(() => copyReportsFilterScope(EMPTY_REPORT_SCOPE));
  const [reportFilterOpen, setReportFilterOpen] = useState(false);
  const [draftReportScope, setDraftReportScope] =
    useState<ReportsFilterScope>(() => copyReportsFilterScope(EMPTY_REPORT_SCOPE));
  const reportScopeInitializedForTokenRef = useRef<string | null>(null);
  const [trendRisks, setTrendRisks] = useState<RiskTrendSourceItem[]>([]);
  const [cycleRisks, setCycleRisks] = useState<Risk[]>([]);
  const [previousCycleRisks, setPreviousCycleRisks] = useState<Risk[]>([]);
  const [comparisons, setComparisons] = useState<RiskCycleComparisonItem[]>([]);
  const [trendWindow, setTrendWindow] = useState<RiskTrendWindow>("4s");
  const [exportCycle] = useState(currentGlobalCycle());
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<
    MovementSnapshotDatum["key"] | null
  >(null);
  const [movementByOrgSort, setMovementByOrgSort] =
    useState<MovementByOrgSortKey>("total");

  const previousCycle = useMemo(
    () => previousGlobalCycle(exportCycle),
    [exportCycle],
  );
  const trendData = useMemo(
    () => buildRiskTrendData(trendRisks, trendWindow, trendColors).trendData,
    [trendRisks, trendWindow],
  );
  const unitExposureData = useMemo(
    () => buildUnitExposureData(cycleRisks, 5),
    [cycleRisks],
  );
  const movementData = useMemo(
    () => buildMovementChartData(comparisons),
    [comparisons],
  );
  const movementSnapshotData = useMemo(
    () =>
      buildMovementSnapshotData({
        currentRisks: cycleRisks,
        previousRisks: previousCycleRisks,
        comparisons,
      }),
    [cycleRisks, previousCycleRisks, comparisons],
  );
  const semesterTargetTrendData = useMemo(
    () => buildSemesterScoreTargetTrendData(trendRisks),
    [trendRisks],
  );
  const criticalRiskRateData = useMemo(
    () => buildCriticalRiskRateTrendData(trendRisks),
    [trendRisks],
  );
  const movementByOrgData = useMemo(
    () => buildMovementByOrgData(comparisons, movementByOrgSort),
    [comparisons, movementByOrgSort],
  );
  const reportOrgId = appliedReportScope.organizationId;
  const reportGroupId = appliedReportScope.organizationGroupId;
  const reportOrgIds = appliedReportScope.organizationIds;
  const hasTrendData = trendData.length > 0;
  const hasMovementData = movementData.some((item) => item.value > 0);
  const hasExposureData = unitExposureData.length > 0;
  const requiresReportOrgSelection = needsExplicitReportOrgSelection(user);
  const reportScopeQuery = reportOrgIds.length
    ? `&org_id=${encodeURIComponent(reportOrgIds.join(","))}`
    : "";
  const requiresReportScopeSelection =
    requiresReportOrgSelection && reportOrgIds.length === 0;
  const toggleUnitFilter = (orgName: string) => {
    setSelectedUnit((current) => (current === orgName ? null : orgName));
  };

  const toggleMovementFilter = (key: MovementSnapshotDatum["key"]) => {
    setSelectedMovement((current) => (current === key ? null : key));
  };

  useEffect(() => {
    setSelectedUnit(null);
    setSelectedMovement(null);
  }, [exportCycle, reportOrgId, reportGroupId]);

  useEffect(() => {
    if (!token) {
      setReportOrganizations([]);
      setReportOrganizationGroups([]);
      setReportFilterOpen(false);
      setAppliedReportScope(copyReportsFilterScope(EMPTY_REPORT_SCOPE));
      setDraftReportScope(copyReportsFilterScope(EMPTY_REPORT_SCOPE));
      reportScopeInitializedForTokenRef.current = null;
      return;
    }

    Promise.all([
      listAllOrganizations(token),
      listOrganizationGroups(token, {
        ownerOrganizationId: user?.isGlobal ? undefined : user?.organizationId ?? undefined,
        includeMembers: true,
        limit: 100,
        page: 1,
      }),
    ])
      .then(([items, groupsResponse]) => {
        const selectable = buildSelectableReportOrganizations(user, items);
        const selectableGroups = buildSelectableReportOrganizationGroups(
          user,
          groupsResponse.data ?? [],
        );
        setReportOrganizations(selectable);
        setReportOrganizationGroups(selectableGroups);
      })
      .catch((error) => {
        console.error(error);
      });
  }, [token, user]);

  useEffect(() => {
    const reportScopeInitKey = token
      ? `${token}:${user?.isGlobal ? "1" : "0"}:${user?.organizationId ?? ""}`
      : null;

    if (
      !reportScopeInitKey ||
      reportOrganizations.length === 0 ||
      reportScopeInitializedForTokenRef.current === reportScopeInitKey
    ) {
      return;
    }

    const defaultScope = resolveDefaultReportsFilterScope(
      user,
      reportOrganizations,
    );
    setAppliedReportScope(defaultScope);
    setDraftReportScope(copyReportsFilterScope(defaultScope));
    reportScopeInitializedForTokenRef.current = reportScopeInitKey;
  }, [reportOrganizations, token, user]);

  const handleReportFilterOpenChange = (open: boolean) => {
    setReportFilterOpen(open);
    if (open) {
      setDraftReportScope(copyReportsFilterScope(appliedReportScope));
    }
  };

  const handleResetReportFilter = () => {
    setDraftReportScope(
      resolveDefaultReportsFilterScope(user, reportOrganizations),
    );
  };

  const handleApplyReportFilter = () => {
    setAppliedReportScope(copyReportsFilterScope(draftReportScope));
    setReportFilterOpen(false);
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    if (requiresReportScopeSelection) {
      setTrendRisks([]);
      setCycleRisks([]);
      setPreviousCycleRisks([]);
      setComparisons([]);
      return;
    }

    Promise.allSettled([
      api.get<RiskTrendSourceItem[]>(
        `/risks/trend${reportScopeQuery ? `?${reportScopeQuery.slice(1)}` : ""}`,
        token,
      ),
      api.get<Risk[]>(
        `/risks/cycle-snapshot?cycle=${encodeURIComponent(exportCycle)}${reportScopeQuery}`,
        token,
      ),
      api.get<Risk[]>(
        `/risks/cycle-snapshot?cycle=${encodeURIComponent(previousCycle)}${reportScopeQuery}`,
        token,
      ),
      api.get<RiskCycleComparisonItem[]>(
        `/risks/compare?from=${previousCycle}&to=${exportCycle}${reportScopeQuery}`,
        token,
      ),
    ]).then(
      ([
        riskResult,
        cycleRiskResult,
        previousCycleRiskResult,
        comparisonResult,
      ]) => {
        if (riskResult.status === "fulfilled") {
          setTrendRisks(riskResult.value);
        } else {
          console.error(riskResult.reason);
          setTrendRisks([]);
        }

        if (cycleRiskResult.status === "fulfilled") {
          setCycleRisks(cycleRiskResult.value);
        } else {
          console.error(cycleRiskResult.reason);
          setCycleRisks([]);
        }

        if (previousCycleRiskResult.status === "fulfilled") {
          setPreviousCycleRisks(previousCycleRiskResult.value);
        } else {
          console.error(previousCycleRiskResult.reason);
          setPreviousCycleRisks([]);
        }

        if (comparisonResult.status === "fulfilled") {
          setComparisons(comparisonResult.value);
        } else {
          console.error(comparisonResult.reason);
          setComparisons([]);
        }
      },
    );
  }, [
    token,
    exportCycle,
    previousCycle,
    reportOrgId,
    reportGroupId,
    requiresReportScopeSelection,
    reportScopeQuery,
  ]);

  const handleExport = async (key: string) => {
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }

    if (requiresReportScopeSelection) {
      toast.error("Pilih unit terlebih dahulu untuk membuka laporan.");
      return;
    }

    if (key === "risk-pdf") {
      setIsExporting("risk-pdf");
      try {
        const API_BASE =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
        const response = await fetch(
          `${API_BASE}/reports/risk-pdf?cycle=${encodeURIComponent(exportCycle)}${reportScopeQuery}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
          if (response.status === 404) {
            toast.error(`Tidak ada data risiko untuk periode ${exportCycle}.`);
          } else if (response.status === 400) {
            toast.error("Parameter cycle tidak valid.");
          } else {
            toast.error("Gagal mengunduh laporan PDF.");
          }
          return;
        }
        const blob = await response.blob();
        downloadBlob(blob, `risk-report-${exportCycle}.pdf`);
        toast.success(`Laporan PDF ${exportCycle} berhasil diunduh.`);
      } catch {
        toast.error("Gagal mengunduh laporan PDF.");
      } finally {
        setIsExporting(null);
      }
      return;
    }

    if (key === "movement-by-org-xlsx") {
      setIsExporting("movement-by-org-xlsx");
      try {
        const orgData = buildMovementByOrgData(comparisons, movementByOrgSort);
        if (orgData.length === 0) {
          toast.error(`Belum ada data pergerakan risiko untuk ${exportCycle}.`);
          return;
        }
        await exportMovementByOrgXLSX(orgData, previousCycle, exportCycle);
        toast.success(
          `Export pergerakan risiko per unit ${exportCycle} berhasil.`,
        );
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Gagal export pergerakan risiko.",
        );
      } finally {
        setIsExporting(null);
      }
      return;
    }

    if (key !== "risk-csv" && key !== "risk-xlsx") {
      toast.info("Export ini belum diaktifkan.");
      return;
    }

    setIsExporting(key);
    try {
      let risks: RiskExportItem[] = [];
      try {
        risks = await api.get<RiskExportItem[]>(
          `/risks/cycle-snapshot?cycle=${encodeURIComponent(exportCycle)}${reportScopeQuery}`,
          token,
        );
      } catch (error) {
        const shouldFallback =
          error instanceof ApiError &&
          (error.status === 404 ||
            error.message.toLowerCase().includes("invalid risk id"));

        if (!shouldFallback) {
          throw error;
        }

        const finalRisks = await api.get<RiskCycleSnapshotItem[]>(
          `/risks?status=final${reportScopeQuery}`,
          token,
        );
        risks = finalRisks.filter(
          (risk) => risk.assessmentCycle === exportCycle,
        );
      }

      if (!risks || risks.length === 0) {
          toast.error(`Belum ada risk final untuk cycle ${exportCycle}.`);
        return;
      }

      if (key === "risk-csv") {
        exportRiskBulkCSV(risks, exportCycle);
      } else {
        await exportRiskBulkXLSX(risks, exportCycle);
      }
      toast.success(`Export risk ${exportCycle} berhasil dibuat.`);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Gagal export risk.",
      );
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <PageStack>
      <CollectionPageHeader
        title="Laporan"
        description="Ringkasan analitik risiko, monitoring, dan kinerja organisasi."
      />

      <CollectionToolbar
        actions={
          <>
        <Popover open={reportFilterOpen} onOpenChange={handleReportFilterOpenChange}>
          <PopoverTrigger asChild>
            <ActionButton variant="outline" size="md"
              disabled={reportOrganizations.length === 0 && reportOrganizationGroups.length === 0}>
              <Filter className="size-3.5" strokeWidth={2.5} />
              Filter
            </ActionButton>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            sideOffset={8}
            className="w-[22rem] rounded-xl p-4"
          >
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium">Filter Laporan</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Atur group dan unit. Perubahan baru diterapkan setelah menekan Terapkan.
                </p>
              </div>
              <ReportScopePicker
                organizationId={draftReportScope.organizationId}
                onOrganizationChange={(organizationId) =>
                  setDraftReportScope((current) => ({
                    ...current,
                    organizationId,
                  }))
                }
                selectedOrganizationIds={draftReportScope.organizationIds}
                onSelectedOrganizationIdsChange={(organizationIds) =>
                  setDraftReportScope((current) => ({
                    ...current,
                    organizationIds,
                  }))
                }
                organizations={reportOrganizations}
                organizationGroups={reportOrganizationGroups}
                organizationGroupId={draftReportScope.organizationGroupId}
                onOrganizationGroupChange={(organizationGroupId) =>
                  setDraftReportScope((current) => ({
                    ...current,
                    organizationGroupId,
                  }))
                }
                organizationPlaceholder="Pilih unit"
                organizationGroupPlaceholder="Pilih grup"
                orientation="vertical"
              />
              <div className="flex items-center justify-between pt-4">
                <ActionButton type="button" variant="ghost" size="md" onClick={handleResetReportFilter}>
                  Reset
                </ActionButton>
                <AccentButton
                  type="button"
                  size="md"
                  onClick={handleApplyReportFilter}
                >
                  Terapkan
                </AccentButton>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Export Section */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ActionButton variant="outline" size="md">
              <Download className="size-3.5" strokeWidth={2.5} />
              Export Data
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </ActionButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {exportOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.key}
                onClick={() => handleExport(opt.key)}
                disabled={!opt.isEnabled || isExporting !== null}
              >
                {isExporting === opt.key ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <opt.icon className="size-3.5" />
                )}
                <span>{opt.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
          </>
        }
      />

      <section id="risk-analytics" className="space-y-4 scroll-mt-24">
        <div className="grid gap-6 xl:grid-cols-12">
          <ReportPanel
            className="xl:col-span-7"
            title="Laporan Pergerakan Risiko"
            actions={
                <Badge variant="outline" className="h-5 px-2 text-[10px]">
                  {`${previousCycle} ke ${exportCycle}`}
                </Badge>
            }
          >
              {hasMovementData ? (
                <>
                  <div className="grid gap-3 pb-4 md:grid-cols-5">
                    {movementSnapshotData.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => toggleMovementFilter(item.key)}
                        className="text-left transition-colors"
                      >
                        <KpiCard
                          label={item.label}
                          value={item.value}
                          tone="white"
                          className="flex min-h-[96px] flex-col rounded-lg p-4"
                          labelClassName="capitalize tracking-normal"
                          valueClassName="font-medium"
                          description={
                            selectedMovement === item.key ? (
                              <Badge
                                variant="outline"
                                className="mt-2 h-5 px-1.5 text-[9px]"
                              >
                                Aktif
                              </Badge>
                            ) : undefined
                          }
                        />
                      </button>
                    ))}
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={movementData}
                        margin={{ top: 4, right: 12, left: -24, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="oklch(0.5 0 0 / 8%)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          formatter={(value) => [
                            `${value ?? 0} risiko`,
                            "Jumlah",
                          ]}
                          contentStyle={{
                            background: "oklch(0.98 0.003 170 / 95%)",
                            border: "1px solid oklch(0.91 0.008 170)",
                            borderRadius: "8px",
                            fontSize: "11px",
                          }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {movementData.map((item) => (
                            <Cell key={item.label} fill={item.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <ReportEmptyState
                  className="h-56"
                  description="Perbandingan kuartal belum tersedia"
                />
              )}
          </ReportPanel>

          <div className="xl:col-span-5">
            <RiskMovementByOrg
              data={movementByOrgData}
              currentSort={movementByOrgSort}
              onSortChange={setMovementByOrgSort}
            />
          </div>
        </div>
      </section>

      <section id="risk-exposure-trend" className="space-y-6 scroll-mt-24">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-12">
          <ReportPanel
            className="xl:col-span-4"
            title="Paparan Risiko"
            actions={
                <Badge variant="outline" className="h-5 px-2 text-[10px]">
                  {exportCycle}
                </Badge>
            }
          >
              {hasExposureData ? (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={unitExposureData}
                        margin={{ top: 4, right: 12, left: -24, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="oklch(0.5 0 0 / 8%)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="orgName"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value: string) =>
                            value.length > 16 ? `${value.slice(0, 16)}…` : value
                          }
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          formatter={(value) => [
                            `${value ?? 0} poin`,
                            "Exposure",
                          ]}
                          contentStyle={{
                            background: "oklch(0.98 0.003 170 / 95%)",
                            border: "1px solid oklch(0.91 0.008 170)",
                            borderRadius: "8px",
                            fontSize: "11px",
                          }}
                        />
                        <Bar
                          dataKey="exposureScore"
                          fill="oklch(0.72 0.13 190)"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-2">
                    {unitExposureData.slice(0, 3).map((item) => (
                      <button
                        key={item.orgName}
                        type="button"
                        onClick={() => toggleUnitFilter(item.orgName)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                          selectedUnit === item.orgName
                            ? "border-primary/40 bg-primary/10"
                            : "border-border/50 bg-muted/20 hover:bg-muted/30",
                        )}
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {item.orgName}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {item.extreme} sangat tinggi, {item.high} tinggi
                          </p>
                        </div>
                        <div className="flex items-center gap-1 font-semibold text-foreground">
                          {item.exposureScore}
                          <ArrowUpRight className="size-3.5 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <ReportEmptyState
                  className="h-48"
                  description="Belum ada data risiko untuk menyusun ranking unit prioritas."
                />
              )}
          </ReportPanel>

          <ReportPanel
            className="xl:col-span-4"
            title={
              <span className="flex items-center gap-2">
                  <TrendingUp className="size-4" />
                  Tren Risiko
              </span>
            }
            actions={
                <Select
                  value={trendWindow}
                  onValueChange={(value) =>
                    setTrendWindow(value as RiskTrendWindow)
                  }
                >
                  <SelectTrigger className="h-7 w-28 border-none bg-muted/30 text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2s">2 Kuartal</SelectItem>
                    <SelectItem value="4s">4 Kuartal</SelectItem>
                    <SelectItem value="all">Semua</SelectItem>
                  </SelectContent>
                </Select>
            }
          >
              {hasTrendData ? (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={trendData}
                        margin={{ top: 4, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="oklch(0.5 0 0 / 8%)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="period"
                          tick={{ fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            background: "oklch(0.98 0.003 170 / 95%)",
                            border: "1px solid oklch(0.91 0.008 170)",
                            borderRadius: "8px",
                            fontSize: "11px",
                            backdropFilter: "blur(8px)",
                          }}
                        />
                        {Object.entries(trendColors).map(([key, color]) => (
                          <Bar
                            key={key}
                            dataKey={key}
                            stackId="risk"
                            fill={color}
                            radius={[3, 3, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-4">
                    {Object.entries(trendColors).map(([key, color]) => (
                      <div key={key} className="flex items-center gap-1.5">
                        <div
                          className="size-2.5 rounded-full"
                          style={{ background: color }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {key}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <ReportEmptyState
                  className="h-48"
                  description="Belum ada data kuartal untuk menampilkan tren risiko."
                />
              )}
          </ReportPanel>
          <div className="xl:col-span-4">
            <CriticalRiskRateTrend data={criticalRiskRateData} />
          </div>
        </div>

        <div className="grid gap-6">
          <SemesterTargetTrend data={semesterTargetTrendData} />
        </div>
      </section>

      {selectedUnit || selectedMovement ? (
        <ReportDrilldownSummary
          onReset={() => {
            setSelectedUnit(null);
            setSelectedMovement(null);
          }}
        >
          {selectedUnit ? (
            <Badge variant="outline">Unit: {selectedUnit}</Badge>
          ) : null}
          {selectedMovement ? (
            <Badge variant="outline">Movement: {selectedMovement}</Badge>
          ) : null}
        </ReportDrilldownSummary>
      ) : null}

      <ReportLinkGrid
        items={[
          {
            href: "/reports/cycle-detail",
            title: "Detail Siklus Risiko",
          },
        ]}
      />
    </PageStack>
  );
}
