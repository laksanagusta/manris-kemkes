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
  PieChart,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart as RPieChart,
  Pie,
  Cell,
} from "recharts";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { RiskCycleDetailReport } from "./risk-cycle-detail-report";
import {
  exportRiskBulkCSV,
  exportRiskBulkXLSX,
  type RiskExportItem,
} from "@/lib/risk-export";

type RiskCycleSnapshotItem = RiskExportItem & {
  assessmentCycle?: string;
  status?: string;
};
import {
  buildRiskTrendData,
  type RiskPiePoint,
  type RiskTrendPoint,
  type RiskTrendSourceItem,
  type RiskTrendWindow,
} from "@/lib/risk-report-trend";

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
  const [trendData, setTrendData] = useState<RiskTrendPoint[]>([]);
  const [pieData, setPieData] = useState<RiskPiePoint[]>([]);
  const [trendWindow, setTrendWindow] = useState<RiskTrendWindow>("4s");
  const [exportCycle, setExportCycle] = useState(currentGlobalCycle());
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const visiblePieData = pieData.filter((item) => item.value > 0);
  const renderedPieData = visiblePieData.length > 0 ? visiblePieData : pieData;
  const piePaddingAngle = visiblePieData.length > 1 ? 3 : 0;
  const cycleOptions = useMemo(() => buildRecentCycleOptions(), []);

  useEffect(() => {
    if (!token) return;

    api.get<RiskTrendSourceItem[]>("/risks", token)
      .then(risks => {
        const result = buildRiskTrendData(risks, trendWindow, trendColors);
        setTrendData(result.trendData);
        setPieData(result.pieData);
      })
      .catch(console.error);
  }, [token, trendWindow]);

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

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Risk Trend */}
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
            <div className="flex items-center justify-center gap-4 mt-3">
              {Object.entries(trendColors).map(([key, color]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-[10px] text-muted-foreground">{key}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risk Distribution Pie */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieChart className="size-4" />
              Distribusi Risiko Saat Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RPieChart>
                  <Pie
                    data={renderedPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={piePaddingAngle}
                    dataKey="value"
                    stroke="none"
                  >
                    {renderedPieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      background: "oklch(0.98 0.003 170 / 95%)",
                      border: "1px solid oklch(0.91 0.008 170)",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                </RPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full" style={{ background: item.color }} />
                  <span className="text-[10px] text-muted-foreground">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <RiskCycleDetailReport />
    </div>
  );
}
