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
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { RiskCycleDetailReport } from "./risk-cycle-detail-report";
import { cn } from "@/lib/utils";
import {
  exportRiskBulkCSV,
  exportRiskBulkXLSX,
  type RiskExportItem,
} from "@/lib/risk-export";
import {
  buildMovementChartData,
  buildMovementSnapshotData,
  buildUnitExposureData,
  type MovementSnapshotDatum,
} from "@/lib/dashboard-insights";
import {
  buildRiskTrendData,
  type RiskTrendSourceItem,
  type RiskTrendWindow,
} from "@/lib/risk-report-trend";
import type { Risk, RiskCycleComparisonItem } from "@/types/risk";

type RiskCycleSnapshotItem = RiskExportItem & {
  assessmentCycle?: string;
  status?: string;
};

const trendColors: Record<string, string> = {
  Rendah: "oklch(0.72 0.17 155)",
  Sedang: "oklch(0.78 0.16 85)",
  Tinggi: "oklch(0.70 0.18 40)",
  Ekstrem: "oklch(0.62 0.22 27)",
};

const exportOptions = [
  {
    key: "risk-csv",
    title: "Risk Register (CSV)",
    description: "Export seluruh risiko ke format CSV",
    icon: FileSpreadsheet,
    format: "CSV",
  },
  {
    key: "risk-xlsx",
    title: "Risk Register (Excel)",
    description: "Export seluruh risiko ke format Excel lengkap",
    icon: FileSpreadsheet,
    format: "XLSX",
  },
  {
    key: "incident-xlsx",
    title: "Incident Report (Excel)",
    description: "Export seluruh insiden ke format Excel",
    icon: FileSpreadsheet,
    format: "XLSX",
  },
  {
    key: "kri-xlsx",
    title: "KRI Summary (Excel)",
    description: "Export ringkasan KRI dengan status threshold",
    icon: FileSpreadsheet,
    format: "XLSX",
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
  const [selectedMovement, setSelectedMovement] = useState<MovementSnapshotDatum["key"] | null>(null);

  const cycleOptions = useMemo(() => buildRecentCycleOptions(), []);
  const previousCycle = useMemo(() => previousGlobalCycle(exportCycle), [exportCycle]);
  const trendData = useMemo(
    () => buildRiskTrendData(trendRisks, trendWindow, trendColors).trendData,
    [trendRisks, trendWindow],
  );
  const unitExposureData = useMemo(() => buildUnitExposureData(cycleRisks, 5), [cycleRisks]);
  const movementData = useMemo(() => buildMovementChartData(comparisons), [comparisons]);
  const movementSnapshotData = useMemo(
    () => buildMovementSnapshotData({ currentRisks: cycleRisks, previousRisks: previousCycleRisks, comparisons }),
    [cycleRisks, previousCycleRisks, comparisons],
  );
  const hasTrendData = trendData.length > 0;
  const hasMovementData = movementData.some((item) => item.value > 0);
  const hasExposureData = unitExposureData.length > 0;

  const toggleUnitFilter = (orgName: string) => {
    setSelectedUnit((current) => current === orgName ? null : orgName);
  };

  const toggleMovementFilter = (key: MovementSnapshotDatum["key"]) => {
    setSelectedMovement((current) => current === key ? null : key);
  };

  useEffect(() => {
    setSelectedUnit(null);
    setSelectedMovement(null);
  }, [exportCycle]);

  useEffect(() => {
    if (!token) return;

    Promise.allSettled([
      api.get<RiskTrendSourceItem[]>("/risks", token),
      api.get<Risk[]>(`/risks/cycle-snapshot?cycle=${encodeURIComponent(exportCycle)}`, token),
      api.get<Risk[]>(`/risks/cycle-snapshot?cycle=${encodeURIComponent(previousCycle)}`, token),
      api.get<RiskCycleComparisonItem[]>(`/risks/compare?from=${previousCycle}&to=${exportCycle}`, token),
    ]).then(([riskResult, cycleRiskResult, previousCycleRiskResult, comparisonResult]) => {
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
    });
  }, [token, exportCycle, previousCycle]);

  const handleExport = async (key: string) => {
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
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
        risks = await api.get<RiskExportItem[]>(`/risks/cycle-snapshot?cycle=${encodeURIComponent(exportCycle)}`, token);
      } catch (error) {
        const shouldFallback =
          error instanceof ApiError &&
          (error.status === 404 || error.message.toLowerCase().includes("invalid risk id"));

        if (!shouldFallback) {
          throw error;
        }

        const approvedRisks = await api.get<RiskCycleSnapshotItem[]>("/risks?status=approved", token);
        risks = approvedRisks.filter((risk) => risk.assessmentCycle === exportCycle);
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
      toast.error(error instanceof Error ? error.message : "Gagal export risk.");
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Export data dan generate laporan risiko
        </p>
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
                    <SelectItem key={cycle} value={cycle}>{cycle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {exportOptions.map((opt) => (
              <button
                key={opt.title}
                onClick={() => handleExport(opt.key)}
                className="flex items-start gap-3 rounded-lg border border-border/50 p-3 text-left transition-all hover:bg-muted/30 hover:border-primary/30 group"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <opt.icon className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold group-hover:text-primary transition-colors">
                    {opt.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {opt.key.startsWith("risk-") ? `${opt.description} untuk cycle ${exportCycle}` : opt.description}
                  </p>
                  <Badge variant="outline" className="text-[8px] h-4 px-1 mt-1.5">
                    {isExporting === opt.key ? "Exporting..." : opt.format}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Analisis Cycle</p>
          <p className="text-xs text-muted-foreground">
            Fokus pada perubahan risiko dari {previousCycle} ke {exportCycle}.
          </p>
        </div>
        <Badge variant="outline" className="h-6 px-2 text-[10px]">
          {`${previousCycle} ke ${exportCycle}`}
        </Badge>
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold">Risk Movement Report</CardTitle>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Perbandingan movement dari {previousCycle} ke {exportCycle}.
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
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-2xl font-semibold tracking-tight text-foreground">{item.value}</p>
                      {selectedMovement === item.key ? (
                        <Badge variant="outline" className="h-5 px-1.5 text-[9px]">Aktif</Badge>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={movementData} margin={{ top: 8, right: 12, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 8%)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
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
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
              Perbandingan cycle belum tersedia, jadi pergerakan risiko belum bisa diringkas.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold">Top Unit Exposure</CardTitle>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Ranking unit berdasarkan weighted exposure score untuk cycle {exportCycle}.
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
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={unitExposureData}
                      margin={{ top: 0, right: 16, left: 16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 8%)" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis
                        dataKey="orgName"
                        type="category"
                        width={132}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value: string) =>
                          value.length > 18 ? `${value.slice(0, 18)}…` : value
                        }
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip
                        formatter={(value) => [`${value ?? 0} poin`, "Exposure"]}
                        contentStyle={{
                          background: "oklch(0.98 0.003 170 / 95%)",
                          border: "1px solid oklch(0.91 0.008 170)",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                      />
                      <Bar dataKey="exposureScore" fill="oklch(0.68 0.17 35)" radius={[0, 6, 6, 0]} />
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
                        <p className="font-medium text-foreground">{item.orgName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {item.extreme} ekstrem, {item.high} tinggi
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
              <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                Belum ada data risiko untuk menyusun ranking unit prioritas.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="size-4" />
                Risk Trend Report
              </CardTitle>
              <Select value={trendWindow} onValueChange={(value) => setTrendWindow(value as RiskTrendWindow)}>
                <SelectTrigger className="h-7 w-28 text-[10px] bg-muted/30 border-none">
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
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 8%)" vertical={false} />
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
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
                          radius={key === "Ekstrem" ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex items-center justify-center gap-4">
                  {Object.entries(trendColors).map(([key, color]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <div className="size-2.5 rounded-full" style={{ background: color }} />
                      <span className="text-[10px] text-muted-foreground">{key}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                Belum ada data semester untuk menampilkan tren risiko.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(selectedUnit || selectedMovement) ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Drilldown aktif:</span>
          {selectedUnit ? <Badge variant="outline">Unit: {selectedUnit}</Badge> : null}
          {selectedMovement ? <Badge variant="outline">Movement: {selectedMovement}</Badge> : null}
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

      <RiskCycleDetailReport
        fromCycle={previousCycle}
        toCycle={exportCycle}
        externalOrgName={selectedUnit}
        externalMovement={selectedMovement}
      />
    </div>
  );
}
