"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  RefreshCw,
  ArrowDown,
  ArrowUp,
  Minus,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
} from "lucide-react";

interface KRI {
  id: string;
  name: string;
  description?: string;
  riskCode?: string;
  riskTitle?: string;
  unit?: string;
  currentValue: number;
  thresholdMin: number;
  thresholdMax: number;
  metric?: string;
  frequency?: string;
  direction: "higher_worse" | "lower_worse";
  trend: "up" | "down" | "stable";
  lastUpdated?: string;
}

interface KRISummary {
  total: number;
  safe: number;
  warning: number;
  breached: number;
}

const emptySummary: KRISummary = {
  total: 0,
  safe: 0,
  warning: 0,
  breached: 0,
};

export function KRIMonitorPanel() {
  const router = useRouter();
  const { token } = useAuth();
  const [kris, setKris] = useState<KRI[]>([]);
  const [summary, setSummary] = useState<KRISummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [frequencyFilter, setFrequencyFilter] = useState("all");

  useEffect(() => {
    if (!token) return;

    let isCancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [data, sum] = await Promise.all([
          api.get<KRI[]>("/kris", token),
          api.get<KRISummary>("/kris/dashboard", token),
        ]);

        if (isCancelled) return;

        setKris(data || []);
        setSummary(sum || emptySummary);
      } catch (err) {
        if (isCancelled) return;

        console.error(err);
        setError(err instanceof Error ? err.message : "Gagal memuat data KRI. Silakan coba lagi.");
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isCancelled = true;
    };
  }, [token]);

  function getKRIStatus(kri: KRI): "safe" | "warning" | "breach" {
    if (kri.direction === "higher_worse") {
      if (kri.currentValue > kri.thresholdMax) return "breach";
      if (kri.currentValue > kri.thresholdMax * 0.8) return "warning";
      return "safe";
    }

    if (kri.currentValue < kri.thresholdMin) return "breach";
    if (kri.currentValue < kri.thresholdMin * 1.1) return "warning";
    return "safe";
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
  } as const;

  const frequencyOptions = useMemo(() => {
    return Array.from(
      new Set(kris.map((kri) => kri.frequency).filter((frequency): frequency is string => Boolean(frequency)))
    ).sort((a, b) => a.localeCompare(b, "id-ID"));
  }, [kris]);

  const filteredKris = useMemo(() => {
    return kris.filter((kri) => {
      const status = getKRIStatus(kri);
      const matchesSearch =
        !search ||
        kri.name?.toLowerCase().includes(search.toLowerCase()) ||
        kri.riskCode?.toLowerCase().includes(search.toLowerCase()) ||
        kri.riskTitle?.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (frequencyFilter !== "all" && kri.frequency !== frequencyFilter) return false;

      return true;
    });
  }, [frequencyFilter, kris, search, statusFilter]);

  const formatLastUpdated = (value?: string) => {
    if (!value) return "Belum ada data";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Belum ada data";

    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getTrendColor = (trend: KRI["trend"]) => {
    if (trend === "up") return "text-risk-high";
    if (trend === "down") return "text-success";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
            Pelaporan indikator
          </p>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Key Risk Indicator</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Tinjau kesehatan indikator risiko, cari ambang yang mulai menyimpang, lalu masuk ke detail
              indikator untuk melaporkan nilai berkala.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/compliance/kri/new">
            <Button className="h-9 gap-2 shadow-sm">
              <Plus className="size-4" />
              Key Risk Indicator
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="size-5 flex-shrink-0 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Gagal Memuat Data</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="gap-2">
              <RefreshCw className="size-3.5" />
              Muat Ulang
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total KRI</p>
              <p className="mt-1 text-2xl font-bold">{summary.total || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Aman</p>
                <p className="mt-1 text-2xl font-bold text-success">{summary.safe || 0}</p>
              </div>
              <CheckCircle className="size-5 text-success" />
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Peringatan</p>
                <p className="mt-1 text-2xl font-bold text-risk-medium">{summary.warning || 0}</p>
              </div>
              <Clock className="size-5 text-risk-medium" />
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Dilanggar</p>
                <p className="mt-1 text-2xl font-bold text-risk-extreme">{summary.breached || 0}</p>
              </div>
              <AlertCircle className="size-5 text-risk-extreme" />
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-border/50 bg-card/80">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Daftar indikator</p>
              <p className="text-xs text-muted-foreground">
                Filter indikator yang perlu perhatian dan buka detail untuk pelaporan nilai.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative min-w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari KRI atau kode risiko..."
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="safe">Aman</SelectItem>
                  <SelectItem value="warning">Peringatan</SelectItem>
                  <SelectItem value="breach">Dilanggar</SelectItem>
                </SelectContent>
              </Select>
              <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Frekuensi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua frekuensi</SelectItem>
                  {frequencyOptions.map((frequency) => (
                    <SelectItem key={frequency} value={frequency}>
                      {frequency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 bg-muted/20 hover:bg-muted/20">
                  <TableHead className="w-24 text-xs">Kode</TableHead>
                  <TableHead className="text-xs">Indikator</TableHead>
                  <TableHead className="w-28 text-xs">Unit</TableHead>
                  <TableHead className="w-36 text-xs">Frekuensi</TableHead>
                  <TableHead className="w-28 text-xs">Nilai</TableHead>
                  <TableHead className="w-28 text-xs">Threshold</TableHead>
                  <TableHead className="w-24 text-xs">Tren</TableHead>
                  <TableHead className="w-28 text-xs">Diperbarui</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      Memuat indikator KRI...
                    </TableCell>
                  </TableRow>
                ) : filteredKris.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      Tidak ada KRI yang ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredKris.map((kri) => {
                    const status = getKRIStatus(kri);
                    const config = statusConfig[status];

                    return (
                      <TableRow
                        key={kri.id}
                        onClick={() => router.push(`/compliance/kri/${kri.id}`)}
                        className="cursor-pointer border-border/40 transition-colors hover:bg-muted/20"
                      >
                        <TableCell className="text-xs font-medium text-muted-foreground">
                          {kri.riskCode || kri.id.substring(0, 8)}
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="space-y-1">
                            <Link
                              href={`/compliance/kri/${kri.id}`}
                              onClick={(event) => event.stopPropagation()}
                              className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                            >
                              <span className="truncate">{kri.name}</span>
                              <span
                                className={cn(
                                  "shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                  config.bg,
                                  config.border,
                                  config.color
                                )}
                              >
                                {config.label}
                              </span>
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">
                              {kri.description || kri.riskTitle || "Belum ada deskripsi indikator"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-foreground/80">{kri.unit || "—"}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5 text-xs text-muted-foreground">
                            <p>{kri.frequency || "—"}</p>
                            <p>{kri.direction === "higher_worse" ? "Naik = memburuk" : "Turun = memburuk"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-baseline gap-1.5">
                            <span className={cn("text-sm font-bold", config.color)}>{kri.currentValue}</span>
                            <span className="text-[10px] text-muted-foreground">{kri.metric}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {kri.thresholdMin} - {kri.thresholdMax} {kri.metric}
                        </TableCell>
                        <TableCell>
                          <div className={cn("flex items-center justify-center", getTrendColor(kri.trend))}>
                            {kri.trend === "up" && <ArrowUp className="size-4" />}
                            {kri.trend === "down" && <ArrowDown className="size-4" />}
                            {kri.trend === "stable" && <Minus className="size-4" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatLastUpdated(kri.lastUpdated)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && !error && (
            <p className="text-xs text-muted-foreground">
              Menampilkan {filteredKris.length} dari {kris.length} indikator
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
