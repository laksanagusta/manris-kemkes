"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  RefreshCw,
  Activity,
  ArrowDown,
  ArrowUp,
  Minus,
  Sparkles,
  Plus,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

interface KRI {
  id: string;
  name: string;
  description: string;
  riskCode: string;
  riskTitle: string;
  unit: string;
  currentValue: number;
  thresholdMin: number;
  thresholdMax: number;
  metric: string;
  frequency: string;
  direction: "higher_worse" | "lower_worse";
  trend: "up" | "down" | "stable";
  lastUpdated: string;
}

export default function KRIPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [kris, setKris] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    Promise.all([
      api.get<any[]>("/kris", token),
      api.get<any>("/kris/dashboard", token),
    ]).then(([data, sum]) => {
      setKris(data || []);
      setSummary(sum || { total: 0, safe: 0, warning: 0, breached: 0 });
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setError(err instanceof Error ? err.message : "Gagal memuat data KRI. Silakan coba lagi.");
      setLoading(false);
    });
  }, [token]);

function getKRIStatus(kri: KRI): "safe" | "warning" | "breach" {
  if (kri.direction === "higher_worse") {
    if (kri.currentValue > kri.thresholdMax) return "breach";
    if (kri.currentValue > kri.thresholdMax * 0.8) return "warning";
    return "safe";
  } else {
    if (kri.currentValue < kri.thresholdMin) return "breach";
    if (kri.currentValue < kri.thresholdMin * 1.1) return "warning";
    return "safe";
  }
}

const statusConfig = {
  safe: {
    label: "Aman",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
    icon: CheckCircle,
  },
  warning: {
    label: "Peringatan",
    color: "text-risk-medium",
    bg: "bg-risk-medium/10",
    border: "border-risk-medium/20",
    icon: AlertCircle,
  },
  breach: {
    label: "Dilanggar",
    color: "text-risk-extreme",
    bg: "bg-risk-extreme/10",
    border: "border-risk-extreme/20",
    icon: AlertCircle,
  },
};

function getProgressValue(kri: KRI): number {
  const range = kri.thresholdMax - kri.thresholdMin;
  if (range === 0) return 100;
  const normalized = ((kri.currentValue - kri.thresholdMin) / range) * 100;
  return Math.max(0, Math.min(100, normalized));
}



  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KRI Monitor</h1>
          <p className="text-sm text-muted-foreground">
            Key Risk Indicators — Monitoring indikator risiko kunci secara berkala
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/compliance/kri/new">
            <Button variant="outline" className="gap-2 text-xs h-8">
              <Sparkles className="size-3.5" />
              AI Generate KRI
            </Button>
          </Link>
          <Link href="/compliance/kri/new">
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="size-4" />
              Tambah KRI
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="size-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Gagal Memuat Data</p>
              <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="gap-2">
              <RefreshCw className="size-3.5" />
              Muat Ulang
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {!loading && !error && (
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total KRI</p>
            <p className="text-2xl font-bold mt-1">{summary?.total || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Aman</p>
              <p className="text-2xl font-bold mt-1 text-success">{summary?.safe || 0}</p>
            </div>
            <CheckCircle className="size-5 text-success" />
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Peringatan</p>
              <p className="text-2xl font-bold mt-1 text-risk-medium">{summary?.warning || 0}</p>
            </div>
            <Clock className="size-5 text-risk-medium" />
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Dilanggar</p>
              <p className="text-2xl font-bold mt-1 text-risk-extreme">{summary?.breached || 0}</p>
            </div>
            <AlertCircle className="size-5 text-risk-extreme" />
          </CardContent>
        </Card>
      </div>
      )}

      <Card className="border-border/50 bg-card/80 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daftar KRI</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Memuat indikator KRI...</div>
          ) : kris.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Tidak ada KRI yang ditemukan.</div>
          ) : (
            <div className="divide-y divide-border/50">
              {kris.map((kri) => {
                const status = getKRIStatus(kri);
                const config = statusConfig[status];
                const StatusIcon = config.icon;

                return (
                  <button
                    key={kri.id}
                    type="button"
                    onClick={() => router.push(`/compliance/kri/${kri.id}`)}
                    className={cn(
                      "group flex w-full flex-col gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/40",
                      status === "breach" && "bg-risk-extreme/[0.03]"
                    )}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {kri.id.substring(0, 8)}
                          </span>
                          <span className="text-[10px] font-mono text-primary">{kri.riskCode}</span>
                          <Badge
                            className={cn(
                              "text-[9px] font-semibold border h-5 px-1.5",
                              config.bg,
                              config.color,
                              config.border
                            )}
                          >
                            <StatusIcon className="mr-1 size-2.5" />
                            {config.label}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                            {kri.name}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {kri.description || kri.riskTitle}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Activity className="size-3" />
                            {kri.frequency}
                          </span>
                          <span>{kri.direction === "higher_worse" ? "↑ = buruk" : "↓ = buruk"}</span>
                          <span>{kri.unit || "—"}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-4 lg:min-w-[320px] lg:justify-end">
                        <div className="min-w-0 flex-1 space-y-2 lg:max-w-[240px]">
                          <div className="flex items-end justify-between gap-4">
                            <div>
                              <p className="text-[10px] text-muted-foreground">Nilai Saat Ini</p>
                              <div className="flex items-baseline gap-1.5">
                                <span className={cn("text-xl font-bold", config.color)}>
                                  {kri.currentValue}
                                </span>
                                <span className="text-[11px] text-muted-foreground">{kri.metric}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-muted-foreground">Threshold</p>
                              <p className="text-xs font-medium">
                                {kri.thresholdMin} — {kri.thresholdMax} {kri.metric}
                              </p>
                            </div>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                status === "safe" && "bg-success",
                                status === "warning" && "bg-risk-medium",
                                status === "breach" && "bg-risk-extreme"
                              )}
                              style={{ width: `${Math.min(getProgressValue(kri), 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-center">
                          {kri.trend === "up" && <ArrowUp className="size-3.5 text-risk-high" />}
                          {kri.trend === "down" && <ArrowDown className="size-3.5 text-success" />}
                          {kri.trend === "stable" && <Minus className="size-3.5 text-muted-foreground" />}
                          <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
