"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
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

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { listWorkingPapers } from "@/lib/api/working-papers";
import { useAuth } from "@/contexts/auth-context";
import { InherentResidualTrend } from "./_components/inherent-residual-trend";
import { CriticalRiskRateTrend } from "./_components/critical-risk-rate-trend";
import { RiskMovementByOrg } from "./_components/risk-movement-by-org";
import { OrganizationLatestProgressChart } from "./_components/organization-latest-progress-chart";
import { RiskCategoryDistributionCard } from "./_components/risk-category-distribution-card";
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
  buildDashboardRiskCategoryData,
  buildInherentResidualTrendData,
  buildCriticalRiskRateTrendData,
  buildMovementByOrgData,
  buildLatestOrganizationProgressData,
  type MovementSnapshotDatum,
  type MovementByOrgSortKey,
} from "@/lib/dashboard-insights";
import {
  buildRiskTrendData,
  type RiskTrendSourceItem,
  type RiskTrendWindow,
} from "@/lib/risk-report-trend";
import type {
  DashboardRiskCategoryItem,
  Risk,
  RiskCycleComparisonItem,
} from "@/types/risk";
import type { WorkingPaper } from "@/types/working-paper";

type RiskCycleSnapshotItem = RiskExportItem & {
  assessmentCycle?: string;
  status?: string;
};

const trendColors: Record<string, string> = {
  Rendah: "oklch(0.72 0.17 155)",
  Sedang: "oklch(0.78 0.16 85)",
  Tinggi: "oklch(0.70 0.18 40)",
  "Sangat Tinggi": "oklch(0.62 0.22 27)",
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
  {
    key: "incident-xlsx",
    title: "Laporan Insiden (Excel)",
    description: "Ekspor insiden belum diaktifkan pada delivery ini",
    icon: FileSpreadsheet,
    format: "XLSX",
    isEnabled: false,
  },
  // {
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
    title: "Pergerakan per Unit (Excel)",
    description:
      "Tabel pergerakan risiko per organisasi dengan warna indikator",
    icon: FileSpreadsheet,
    format: "XLSX",
    isEnabled: true,
  },
];

function currentGlobalCycle() {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? "H1" : "H2";
  return `${year}-${half}`;
}

function previousGlobalCycle(cycle: string) {
  const [yearPart, half] = cycle.split("-");
  const year = Number(yearPart);
  if (half === "H1") return `${year - 1}-H2`;
  return `${year}-H1`;
}

function buildRecentCycleOptions(count = 6) {
  const now = new Date();
  let year = now.getFullYear();
  let half = now.getMonth() < 6 ? 1 : 2;
  const result: string[] = [];

  for (let i = 0; i < count; i += 1) {
    result.push(`${year}-H${half}`);
    if (half === 1) {
      half = 2;
      year -= 1;
    } else {
      half = 1;
    }
  }

  return result;
}

const WORKING_PAPER_PAGE_SIZE = 100;

async function listAllWorkingPapers(token: string): Promise<WorkingPaper[]> {
  const firstPage = await listWorkingPapers(token, {
    page: 1,
    limit: WORKING_PAPER_PAGE_SIZE,
  });
  const initialData = firstPage.data ?? [];
  const pageSize = firstPage.limit ?? WORKING_PAPER_PAGE_SIZE;
  const totalPages = Math.max(
    1,
    Math.ceil((firstPage.total ?? initialData.length) / pageSize),
  );

  if (totalPages === 1) {
    return initialData;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      listWorkingPapers(token, {
        page: index + 2,
        limit: pageSize,
      }),
    ),
  );

  return [...initialData, ...remainingPages.flatMap((page) => page.data ?? [])];
}

export default function ReportsPage() {
  const { token } = useAuth();
  const [trendRisks, setTrendRisks] = useState<RiskTrendSourceItem[]>([]);
  const [cycleRisks, setCycleRisks] = useState<Risk[]>([]);
  const [previousCycleRisks, setPreviousCycleRisks] = useState<Risk[]>([]);
  const [comparisons, setComparisons] = useState<RiskCycleComparisonItem[]>([]);
  const [trendWindow, setTrendWindow] = useState<RiskTrendWindow>("4s");
  const [exportCycle, setExportCycle] = useState(currentGlobalCycle());
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<
    MovementSnapshotDatum["key"] | null
  >(null);
  const [riskCategoryData, setRiskCategoryData] = useState<
    ReturnType<typeof buildDashboardRiskCategoryData>
  >([]);
  const [riskCategoryLoading, setRiskCategoryLoading] = useState(true);
  const [riskCategoryError, setRiskCategoryError] = useState(false);
  const [movementByOrgSort, setMovementByOrgSort] =
    useState<MovementByOrgSortKey>("total");
  const [workingPapers, setWorkingPapers] = useState<WorkingPaper[]>([]);

  const cycleOptions = useMemo(() => buildRecentCycleOptions(), []);
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
  const inherentResidualData = useMemo(
    () => buildInherentResidualTrendData(trendRisks),
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
  const organizationProgressData = useMemo(
    () => buildLatestOrganizationProgressData(workingPapers),
    [workingPapers],
  );
  const hasTrendData = trendData.length > 0;
  const hasMovementData = movementData.some((item) => item.value > 0);
  const hasExposureData = unitExposureData.length > 0;

  const toggleUnitFilter = (orgName: string) => {
    setSelectedUnit((current) => (current === orgName ? null : orgName));
  };

  const toggleMovementFilter = (key: MovementSnapshotDatum["key"]) => {
    setSelectedMovement((current) => (current === key ? null : key));
  };

  useEffect(() => {
    setSelectedUnit(null);
    setSelectedMovement(null);
  }, [exportCycle]);

  useEffect(() => {
    if (!token) {
      setRiskCategoryLoading(false);
      return;
    }

    Promise.allSettled([
      api.get<RiskTrendSourceItem[]>("/risks/trend", token),
      api.get<DashboardRiskCategoryItem[]>(
        `/dashboard/risk-categories?cycle=${exportCycle}`,
        token,
      ),
      api.get<Risk[]>(
        `/risks/cycle-snapshot?cycle=${encodeURIComponent(exportCycle)}`,
        token,
      ),
      api.get<Risk[]>(
        `/risks/cycle-snapshot?cycle=${encodeURIComponent(previousCycle)}`,
        token,
      ),
      api.get<RiskCycleComparisonItem[]>(
        `/risks/compare?from=${previousCycle}&to=${exportCycle}`,
        token,
      ),
      listAllWorkingPapers(token),
    ]).then(
      ([
        riskResult,
        riskCategoryResult,
        cycleRiskResult,
        previousCycleRiskResult,
        comparisonResult,
        workingPaperResult,
      ]) => {
        if (riskResult.status === "fulfilled") {
          setTrendRisks(riskResult.value);
        } else {
          console.error(riskResult.reason);
          setTrendRisks([]);
        }

        if (riskCategoryResult.status === "fulfilled") {
          setRiskCategoryData(
            buildDashboardRiskCategoryData(riskCategoryResult.value),
          );
          setRiskCategoryError(false);
        } else {
          console.error(riskCategoryResult.reason);
          setRiskCategoryData([]);
          setRiskCategoryError(true);
        }
        setRiskCategoryLoading(false);

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

        if (workingPaperResult.status === "fulfilled") {
          setWorkingPapers(workingPaperResult.value);
        } else {
          console.error(workingPaperResult.reason);
          setWorkingPapers([]);
        }
      },
    );
  }, [token, exportCycle, previousCycle]);

  const handleExport = async (key: string) => {
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }

    if (key === "risk-pdf") {
      setIsExporting("risk-pdf");
      try {
        const API_BASE =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
        const response = await fetch(
          `${API_BASE}/reports/risk-pdf?cycle=${encodeURIComponent(exportCycle)}`,
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
          `/risks/cycle-snapshot?cycle=${encodeURIComponent(exportCycle)}`,
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

        const approvedRisks = await api.get<RiskCycleSnapshotItem[]>(
          "/risks?status=approved",
          token,
        );
        risks = approvedRisks.filter(
          (risk) => risk.assessmentCycle === exportCycle,
        );
      }

      if (!risks || risks.length === 0) {
        toast.error(`Belum ada risk approved untuk cycle ${exportCycle}.`);
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analisis Risiko</h1>
        <p className="text-sm text-muted-foreground">
          Untuk telaah analitis, perbandingan antar siklus, dan ekspor formal.
          Pembaruan operasional mitigasi/KRI tetap dilakukan di Monitoring.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-primary/25 bg-primary/5 px-4 py-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Untuk analisis & unduhan
          </p>
          <p className="text-xs text-muted-foreground">
            Halaman ini dipakai untuk analisis dan unduhan data. Untuk
            memperbarui mitigasi atau KRI, gunakan Monitoring.
          </p>
        </div>
        <Link
          href="/compliance/monitoring"
          className="inline-flex h-8 items-center rounded-md border border-border/60 bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
        >
          Buka Monitoring
        </Link>
      </div>

      {/* Export Section */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Download className="size-4" />
              Export Data
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Cycle</span>
              <Select value={exportCycle} onValueChange={setExportCycle}>
                <SelectTrigger className="h-8 w-28 text-[10px] bg-muted/30 border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cycleOptions.map((cycle) => (
                    <SelectItem key={cycle} value={cycle}>
                      {cycle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col">
          <div className="grid flex-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {exportOptions.map((opt) => (
              <button
                key={opt.title}
                onClick={() => handleExport(opt.key)}
                disabled={!opt.isEnabled || isExporting !== null}
                className={cn(
                  "flex items-stretch gap-3 rounded-lg border border-border/50 p-3 text-left transition-all group h-full",
                  opt.isEnabled
                    ? "hover:bg-muted/30 hover:border-primary/30"
                    : "cursor-not-allowed opacity-65",
                )}
              >
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                    opt.isEnabled
                      ? "bg-primary/10 group-hover:bg-primary/15"
                      : "bg-muted/60",
                  )}
                >
                  {isExporting === opt.key ? (
                    <Loader2 className="size-4 text-primary animate-spin" />
                  ) : (
                    <opt.icon className="size-4 text-primary" />
                  )}
                </div>
                <div className="flex flex-col justify-between flex-1 min-w-0">
                  <div>
                    <p
                      className={cn(
                        "text-xs font-semibold transition-colors",
                        opt.isEnabled && "group-hover:text-primary",
                      )}
                    >
                      {opt.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                      {opt.description}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[8px] h-4 px-1 mt-2 self-start"
                  >
                    {isExporting === opt.key
                      ? opt.key === "risk-pdf"
                        ? "Downloading..."
                        : "Exporting..."
                      : opt.isEnabled
                        ? opt.format
                        : "Disabled"}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <section id="risk-analytics" className="space-y-4 scroll-mt-24">
        <RiskCategoryDistributionCard
          data={riskCategoryData}
          loading={riskCategoryLoading}
          error={riskCategoryError}
          cycle={exportCycle}
        />

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Analisis Cycle
            </p>
            <p className="text-xs text-muted-foreground">
              Fokus pada perubahan risiko dari {previousCycle} ke {exportCycle}.
            </p>
          </div>
          <Badge variant="outline" className="h-6 px-2 text-[10px]">
            {`${previousCycle} ke ${exportCycle}`}
          </Badge>
        </div>

        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Laporan Pergerakan Risiko
                </CardTitle>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Perbandingan pergerakan dari {previousCycle} ke {exportCycle}.
                </p>
              </div>
              <Badge variant="outline" className="h-5 px-2 text-[10px]">
                {`${previousCycle} ke ${exportCycle}`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {hasMovementData ? (
              <>
                <div className="grid gap-3 pb-4 md:grid-cols-5">
                  {movementSnapshotData.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleMovementFilter(item.key)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left transition-colors",
                        selectedMovement === item.key
                          ? "border-primary/40 bg-primary/10"
                          : "border-border/50 bg-muted/20 hover:bg-muted/30",
                      )}
                    >
                      <p className="text-[10px] text-muted-foreground">
                        {item.label}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-2xl font-semibold tracking-tight text-foreground">
                          {item.value}
                        </p>
                        {selectedMovement === item.key ? (
                          <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-[9px]"
                          >
                            Aktif
                          </Badge>
                        ) : null}
                      </div>
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
                        formatter={(value) => [`${value ?? 0} risiko`, "Jumlah"]}
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
              <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                Perbandingan cycle belum tersedia
              </div>
            )}
          </CardContent>
        </Card>

        <RiskMovementByOrg
          data={movementByOrgData}
          currentSort={movementByOrgSort}
          onSortChange={setMovementByOrgSort}
        />
      </section>

      <section id="risk-exposure-trend" className="space-y-6 scroll-mt-24">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Paparan Risiko
                  </CardTitle>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Peringkat unit berdasarkan skor paparan berbobot untuk siklus{" "}
                    {exportCycle}.
                  </p>
                </div>
                <Badge variant="outline" className="h-5 px-2 text-[10px]">
                  {exportCycle}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
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
                          fill="oklch(0.68 0.17 35)"
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
                <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                  Belum ada data risiko untuk menyusun ranking unit prioritas.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <TrendingUp className="size-4" />
                  Tren Risiko
                </CardTitle>
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
                    <SelectItem value="2s">2 Semester</SelectItem>
                    <SelectItem value="4s">4 Semester</SelectItem>
                    <SelectItem value="all">Semua</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
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
                            radius={
                              key === "Sangat Tinggi"
                                ? [3, 3, 0, 0]
                                : [0, 0, 0, 0]
                            }
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
                <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                  Belum ada data semester untuk menampilkan tren risiko.
                </div>
              )}
            </CardContent>
          </Card>
          <CriticalRiskRateTrend data={criticalRiskRateData} />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Analisis Tren
            </p>
            <p className="text-xs text-muted-foreground">
              Tren skor risiko dan tingkat kekritisan antar semester.
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          <InherentResidualTrend data={inherentResidualData} />
          <OrganizationLatestProgressChart data={organizationProgressData} />
        </div>
      </section>

      {selectedUnit || selectedMovement ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Drilldown aktif:</span>
          {selectedUnit ? (
            <Badge variant="outline">Unit: {selectedUnit}</Badge>
          ) : null}
          {selectedMovement ? (
            <Badge variant="outline">Movement: {selectedMovement}</Badge>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setSelectedUnit(null);
              setSelectedMovement(null);
            }}
            className="ml-auto text-[11px] font-medium text-primary hover:underline"
          >
            Reset filter
          </button>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/reports/compliance-monitoring"
          className="group rounded-2xl border border-border/60 bg-card/70 p-5 transition-colors hover:border-primary/30 hover:bg-primary/5"
        >
          <p className="text-sm font-semibold text-foreground">
            Monitoring Kepatuhan
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Buka overdue mitigasi, breach KRI, dan waktu respons unit.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
            Buka halaman
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </Link>

        <Link
          href="/reports/cycle-detail"
          className="group rounded-2xl border border-border/60 bg-card/70 p-5 transition-colors hover:border-primary/30 hover:bg-primary/5"
        >
          <p className="text-sm font-semibold text-foreground">
            Detail Siklus Risiko
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Telusuri perubahan risiko antar periode secara rinci.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
            Buka halaman
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </Link>
      </section>
    </div>
  );
}
