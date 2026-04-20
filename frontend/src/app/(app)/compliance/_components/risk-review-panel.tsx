"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Minus,
  RefreshCcw,
  Search,
  Send,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  listAllOrganizations,
  type OrganizationListItem,
} from "@/lib/api/organizations";
import { useAuth } from "@/contexts/auth-context";
import { filterToAccessibleOrgs } from "@/lib/organization";
import type {
  RiskCycleComparisonItem,
  RiskReviewQueueItem,
  RiskReviewStatus,
  RiskReviewSummary,
} from "@/types/risk";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getBobot, calculateNilai, getRiskLevelFromNilai } from "@/lib/risk";

type OrganizationOption = OrganizationListItem;

const reviewStatusMeta: Record<string, { label: string; className: string }> = {
  due: {
    label: "Due",
    className: "bg-muted text-muted-foreground border-border",
  },
  in_draft: {
    label: "In Draft",
    className: "bg-primary/15 text-primary border-primary/20",
  },
  pending_approval: {
    label: "Pending Approval",
    className: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  },
  approved: {
    label: "Approved",
    className: "bg-success/15 text-success border-success/20",
  },
  overdue: {
    label: "Overdue",
    className: "bg-destructive/15 text-destructive border-destructive/20",
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

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

function formatRiskLevel(level?: string | null) {
  if (!level) return "-";
  return level === "extreme"
    ? "Sangat Tinggi"
    : level === "high"
      ? "Tinggi"
      : level === "medium"
        ? "Sedang"
        : "Rendah";
}

function dedupeOrganizations(items: OrganizationOption[]) {
  const seen = new Set<string>();
  const result: OrganizationOption[] = [];

  for (const item of items) {
    const id = item.id?.trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push({ ...item, id });
  }

  return result;
}

function getHeatmapCellClass(
  count: number,
  prob: number,
  impact: number,
  mode: "intensity" | "riskLevel",
): string {
  if (mode === "riskLevel") {
    const bobot = getBobot(prob, impact);
    const nilai = calculateNilai(prob, impact, bobot);
    const level = getRiskLevelFromNilai(nilai);
    const colorClass = {
      sangat_rendah: "heatmap-sangat-rendah border-transparent",
      rendah: "heatmap-rendah border-transparent",
      sedang: "heatmap-sedang border-transparent",
      tinggi: "heatmap-tinggi border-transparent",
      sangat_tinggi: "heatmap-sangat-tinggi border-transparent",
    }[level];

    if (count === 0) return cn(colorClass, "opacity-40 font-normal");
    return cn(colorClass, "font-bold");
  }

  // mode === "intensity"
  if (count === 0) return "border-border bg-muted/20 text-muted-foreground";
  if (count <= 2)
    return "border-primary/20 bg-primary/15 text-foreground font-semibold";
  if (count <= 5)
    return "border-primary/30 bg-primary/30 text-foreground font-bold";
  return "border-primary/40 bg-primary/50 font-bold text-foreground";
}

export function RiskReviewPanel() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [items, setItems] = useState<RiskReviewQueueItem[]>([]);
  const [comparisons, setComparisons] = useState<RiskCycleComparisonItem[]>([]);
  const [summaryData, setSummaryData] = useState<RiskReviewSummary | null>(
    null,
  );
  const [previousHeatmapData, setPreviousHeatmapData] = useState<number[][]>([]);
  const [currentHeatmapData, setCurrentHeatmapData] = useState<number[][]>([]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparisonLoading, setComparisonLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [status, setStatus] = useState<RiskReviewStatus | "all">("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<"intensity" | "riskLevel">(
    "riskLevel",
  );
  const [selectedRisk, setSelectedRisk] = useState<RiskReviewQueueItem | null>(
    null,
  );
  const cycle = useMemo(() => currentGlobalCycle(), []);
  const previousCycle = useMemo(() => previousGlobalCycle(cycle), [cycle]);

  useEffect(() => {
    if (user?.role === "unit" && user.organizationId) {
      setOrgFilter(user.organizationId);
    }
  }, [user]);

  useEffect(() => {
    if (!token) return;

    const loadOrganizations = async () => {
      try {
        const data = await listAllOrganizations(token);
        const uniqueOrgs = dedupeOrganizations(data);
        const filteredOrgs = user?.isGlobal
          ? uniqueOrgs
          : filterToAccessibleOrgs(uniqueOrgs, user?.accessibleOrgIds || []);
        setOrganizations(filteredOrgs);
      } catch (error) {
        console.error(error);
      }
    };

    loadOrganizations();
  }, [token]);

  useEffect(() => {
    setPage(1);
  }, [status, orgFilter, deferredSearch]);

  useEffect(() => {
    if (!token) return;

    const loadQueue = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ cycle });
        if (status !== "all") params.set("status", status);
        if (orgFilter !== "all") params.set("org_id", orgFilter);
        if (deferredSearch.trim()) params.set("search", deferredSearch.trim());
        params.set("page", page.toString());
        params.set("limit", limit.toString());

        const result = await api.get<{
          data: RiskReviewQueueItem[];
          total: number;
          page: number;
          limit: number;
        }>(`/risks/review-queue?${params.toString()}`, token);
        setItems(result.data);
        setTotal(result.total);
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Queue review belum berhasil dimuat.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadQueue();
  }, [token, status, cycle, orgFilter, deferredSearch, page, limit]);

  useEffect(() => {
    if (!token) return;

    const loadComparisons = async () => {
      setComparisonLoading(true);
      try {
        const params = new URLSearchParams({ from: previousCycle, to: cycle });
        if (orgFilter !== "all") params.set("org_id", orgFilter);
        const data = await api.get<RiskCycleComparisonItem[]>(
          `/risks/compare?${params.toString()}`,
          token,
        );
        setComparisons(data);
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Perbandingan semester belum berhasil dimuat.",
        );
      } finally {
        setComparisonLoading(false);
      }
    };

    loadComparisons();
  }, [token, previousCycle, cycle, orgFilter]);

  useEffect(() => {
    if (!token) return;

    const loadSummary = async () => {
      setSummaryLoading(true);
      try {
        const params = new URLSearchParams({ cycle });
        if (orgFilter !== "all") params.set("org_id", orgFilter);
        const buildHeatmapPath = (heatmapCycle: string) => {
          const heatmapParams = new URLSearchParams({ cycle: heatmapCycle });
          if (orgFilter !== "all") heatmapParams.set("org_id", orgFilter);
          return `/dashboard/heatmap?${heatmapParams.toString()}`;
        };

        const [summaryResult, previousHeatmapResult, currentHeatmapResult] =
          await Promise.allSettled([
            api.get<RiskReviewSummary>(
              `/dashboard/risk-review-summary?${params.toString()}`,
              token,
            ),
            api.get<number[][]>(buildHeatmapPath(previousCycle), token),
            api.get<number[][]>(buildHeatmapPath(cycle), token),
          ]);

        if (summaryResult.status === "fulfilled") {
          setSummaryData(summaryResult.value);
        } else {
          console.error(summaryResult.reason);
          toast.error(
            summaryResult.reason instanceof Error
              ? summaryResult.reason.message
              : "Ringkasan semester belum berhasil dimuat.",
          );
        }

        if (previousHeatmapResult.status === "fulfilled") {
          setPreviousHeatmapData(previousHeatmapResult.value);
        } else {
          console.error(previousHeatmapResult.reason);
          setPreviousHeatmapData([]);
        }

        if (currentHeatmapResult.status === "fulfilled") {
          setCurrentHeatmapData(currentHeatmapResult.value);
        } else {
          console.error(currentHeatmapResult.reason);
          setCurrentHeatmapData([]);
        }
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Ringkasan semester belum berhasil dimuat.",
        );
      } finally {
        setSummaryLoading(false);
      }
    };

    loadSummary();
  }, [token, previousCycle, cycle, orgFilter]);

  const summary = useMemo(() => {
    const counts = {
      due: 0,
      in_draft: 0,
      pending_approval: 0,
      approved: 0,
      overdue: 0,
    };
    for (const item of items) {
      if (item.reviewStatus in counts) {
        counts[item.reviewStatus as keyof typeof counts] += 1;
      }
    }
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => item.reviewStatus !== "approved");
  }, [items]);

  const movementSummary = useMemo(() => {
    const result = { up: 0, down: 0, stable: 0 };
    for (const item of comparisons) {
      if (item.movement === "up") result.up += 1;
      else if (item.movement === "down") result.down += 1;
      else result.stable += 1;
    }
    return result;
  }, [comparisons]);

  const handleOpenConfirmDialog = (item: RiskReviewQueueItem) => {
    setSelectedRisk(item);
    setConfirmDialogOpen(true);
  };

  const handleCreateReassessment = async () => {
    if (!token || !selectedRisk) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }

    setConfirmDialogOpen(false);

    toast.promise(
      (async () => {
        const result = await api.post<{ id: string }>(
          `/risks/${selectedRisk.riskId}/reassess`,
          { cycle },
          token,
        );
        router.push(`/risk/register/${result.id}`);
      })(),
      {
        loading: `Membuat draft reassessment ${cycle}...`,
        success: `Draft reassessment ${cycle} berhasil dibuat.`,
        error: (error) =>
          error instanceof Error
            ? error.message
            : "Draft reassessment belum berhasil dibuat.",
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Due", value: summary.due, icon: CalendarClock },
          { label: "In Draft", value: summary.in_draft, icon: RefreshCcw },
          { label: "Pending", value: summary.pending_approval, icon: Send },
          { label: "Approved", value: summary.approved, icon: CheckCircle2 },
          { label: "Overdue", value: summary.overdue, icon: AlertCircle },
        ].map((metric) => (
          <Card key={metric.label} className="border-border/50 bg-card/80">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {metric.label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {metric.value}
                </p>
              </div>
              <metric.icon className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Risk Review Queue
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Cycle aktif {cycle}. Risiko yang belum approved diklasifikasikan
              menjadi due, in draft, pending approval, atau overdue.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Entry point reassessment ada di tombol{" "}
              <span className="font-medium text-foreground">
                Mulai Pemantauan
              </span>{" "}
              untuk item berstatus Due atau Overdue.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari kode, judul, unit..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-muted/30 border-none"
              />
            </div>
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-full md:w-[240px]">
                <SelectValue placeholder="Filter unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Unit</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as RiskReviewStatus | "all")
              }
            >
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Filter status review" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="due">Due</SelectItem>
                <SelectItem value="in_draft">In Draft</SelectItem>
                <SelectItem value="pending_approval">
                  Pending Approval
                </SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Memuat queue reassessment...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24 whitespace-nowrap">Kode</TableHead>
                  <TableHead className="whitespace-nowrap">Risiko</TableHead>
                  <TableHead className="w-32 whitespace-nowrap">Unit</TableHead>
                  <TableHead className="w-28 text-center whitespace-nowrap">
                    Score
                  </TableHead>
                  <TableHead className="w-28 text-center whitespace-nowrap">
                    Candidate
                  </TableHead>
                  <TableHead className="w-32 whitespace-nowrap">
                    Review Status
                  </TableHead>
                  <TableHead className="w-32 whitespace-nowrap">
                    Next Review
                  </TableHead>
                  <TableHead className="w-36 text-right whitespace-nowrap">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24">
                      <div className="flex flex-col gap-1 text-left">
                        <p className="text-sm font-medium text-muted-foreground">Belum ada risiko untuk filter ini</p>
                        <p className="text-xs text-muted-foreground/70">Ubah filter pencarian Anda untuk melihat data</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const meta =
                      reviewStatusMeta[item.reviewStatus] ||
                      reviewStatusMeta.due;
                    return (
                      <TableRow key={item.versionGroupId}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {item.code || "-"}
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="space-y-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {item.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {item.changeReason ||
                                item.reviewSummary ||
                                "Belum ada ringkasan perubahan pada cycle ini."}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.orgName || "-"}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          <span className="font-semibold">
                            {item.currentScore}
                          </span>
                          <span className="ml-1 text-muted-foreground">
                            {formatRiskLevel(item.currentLevel)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {item.candidateScore ? (
                            <>
                              <span className="font-semibold">
                                {item.candidateScore}
                              </span>
                              <span className="ml-1 text-muted-foreground">
                                {formatRiskLevel(item.candidateLevel)}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("border font-normal", meta.className)}
                          >
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.nextReviewDate || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {item.reviewStatus === "due" ||
                            item.reviewStatus === "overdue" ? (
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                onClick={() => handleOpenConfirmDialog(item)}
                              >
                                <RefreshCcw className="size-3.5" />
                                Reassessment
                              </Button>
                            ) : null}
                            <Link
                              href={`/risk/register/${item.candidateRiskId || item.riskId}`}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 text-xs"
                              >
                                <ShieldAlert className="size-3.5" />
                                Buka
                              </Button>
                            </Link>
                            {item.reviewStatus === "pending_approval" ? (
                              <Link
                                href={`/inbox?status=pending&type=risk&search=${encodeURIComponent(item.code)}`}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1 text-xs text-primary"
                                >
                                  <Send className="size-3.5" /> Inbox
                                </Button>
                              </Link>
                            ) : null}
                            {item.reviewStatus === "in_draft" ||
                            item.reviewStatus === "pending_approval" ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 text-[11px] text-muted-foreground">
                                <Clock3 className="size-3" />{" "}
                                {item.reviewStatus === "pending_approval"
                                  ? "Menunggu"
                                  : "Berjalan"}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
          {!loading && filteredItems.length > 0 && (
            <div className="flex items-center justify-between border-t border-border/30 px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Baris per halaman:
                  </span>
                  <Select
                    value={limit.toString()}
                    onValueChange={(val) => {
                      setLimit(Number(val));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 w-[65px] border-none bg-muted/30 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50, 100].map((pageSize) => (
                        <SelectItem key={pageSize} value={pageSize.toString()}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Menampilkan {total === 0 ? 0 : (page - 1) * limit + 1} -{" "}
                  {Math.min(page * limit, total)} dari {total} risiko
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground"
                  disabled={page === 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <span className="px-2 text-xs font-medium text-primary">
                  {page}
                </span>
                <span className="text-xs text-muted-foreground">
                  dari {Math.ceil(total / limit) || 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground"
                  disabled={
                    page >= (Math.ceil(total / limit) || 1) ||
                    total === 0 ||
                    loading
                  }
                  onClick={() =>
                    setPage((p) =>
                      Math.min(Math.ceil(total / limit) || 1, p + 1),
                    )
                  }
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-semibold text-foreground">
              Completion Rate per Unit
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Persentase risiko yang sudah selesai dinilai ulang dan approved
              pada cycle {cycle}.
            </p>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                Memuat completion rate...
              </div>
            ) : (
              <div className="h-[320px] overflow-y-auto rounded-md border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Unit</TableHead>
                      <TableHead className="w-24 text-center whitespace-nowrap">
                        Assigned
                      </TableHead>
                      <TableHead className="w-24 text-center whitespace-nowrap">
                        Done
                      </TableHead>
                      <TableHead className="w-24 text-center whitespace-nowrap">
                        Pending
                      </TableHead>
                      <TableHead className="w-24 text-center whitespace-nowrap">
                        Overdue
                      </TableHead>
                      <TableHead className="w-48 text-right whitespace-nowrap">
                        Rate
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(summaryData?.unitCompletion.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24">
                          <div className="flex flex-col gap-1 text-left">
                            <p className="text-sm font-medium text-muted-foreground">Belum ada data unit completion untuk cycle ini</p>
                            <p className="text-xs text-muted-foreground/70">Tunggu sampai ada unit completion yang disubmit</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      summaryData?.unitCompletion.map((unit) => (
                        <TableRow key={unit.orgName}>
                          <TableCell className="max-w-[200px] text-sm font-medium text-foreground">
                            <span className="block truncate">
                              {unit.orgName || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {unit.totalAssigned}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {unit.completed}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {unit.pending}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {unit.overdue}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            <div className="flex items-center gap-2">
                              <Progress
                                value={unit.completionRate}
                                className="h-2 flex-1"
                              />
                              <span className="w-12 text-right font-semibold">
                                {unit.completionRate.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80">
          <CardHeader className="flex flex-col space-y-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold text-foreground">
                Heatmap Compare
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Distribusi risiko approved pada {previousCycle} dan {cycle}.
              </p>
            </div>
            <Tabs
              value={heatmapMode}
              onValueChange={(v) =>
                setHeatmapMode(v as "intensity" | "riskLevel")
              }
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-2 sm:w-[240px]">
                <TabsTrigger value="intensity">Intensitas</TabsTrigger>
                <TabsTrigger value="riskLevel">Level Risiko</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {summaryLoading ? (
              <div className="md:col-span-2 flex h-40 items-center justify-center text-sm text-muted-foreground">
                Memuat heatmap compare...
              </div>
            ) : (
              <>
                {[
                  { label: previousCycle, grid: previousHeatmapData },
                  { label: cycle, grid: currentHeatmapData },
                ].map((heatmap) => (
                  <div key={heatmap.label} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {heatmap.label}
                    </p>
                    <div className="grid grid-cols-5 gap-1">
                      {[...heatmap.grid].reverse().flatMap((row, rowIndex) =>
                        row.map((count, colIndex) => (
                          <div
                            key={`${heatmap.label}-${rowIndex}-${colIndex}`}
                            className={cn(
                              "flex aspect-square items-center justify-center rounded-md border text-xs font-semibold",
                              getHeatmapCellClass(
                                count,
                                5 - rowIndex,
                                colIndex + 1,
                                heatmapMode,
                              ),
                            )}
                          >
                            {heatmapMode === "riskLevel" && count === 0 ? "" : count}
                          </div>
                        )),
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardHeader className="space-y-1">
          <CardTitle className="text-base font-semibold text-foreground">
            Perbandingan Cycle {previousCycle} ke {cycle}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Fokus pada perubahan skor dan level antar semester untuk reviewer
            dan pimpinan.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Naik
              </p>
              <div className="mt-2 flex items-center gap-2 text-destructive">
                <TrendingUp className="size-4" />
                <span className="text-2xl font-semibold">
                  {movementSummary.up}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-success/20 bg-success/5 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Turun
              </p>
              <div className="mt-2 flex items-center gap-2 text-success">
                <TrendingDown className="size-4" />
                <span className="text-2xl font-semibold">
                  {movementSummary.down}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Tetap
              </p>
              <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                <Minus className="size-4" />
                <span className="text-2xl font-semibold text-foreground">
                  {movementSummary.stable}
                </span>
              </div>
            </div>
          </div>

          {comparisonLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Memuat perbandingan semester...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24 whitespace-nowrap">Kode</TableHead>
                  <TableHead className="whitespace-nowrap">Risiko</TableHead>
                  <TableHead className="w-40 whitespace-nowrap">Unit</TableHead>
                  <TableHead className="w-24 text-center whitespace-nowrap">
                    {previousCycle}
                  </TableHead>
                  <TableHead className="w-12 text-center whitespace-nowrap" />
                  <TableHead className="w-24 text-center whitespace-nowrap">
                    {cycle}
                  </TableHead>
                  <TableHead className="w-24 text-center whitespace-nowrap">
                    Delta
                  </TableHead>
                  <TableHead className="w-24 text-center whitespace-nowrap">
                    Tren
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24">
                      <div className="flex flex-col gap-1 text-left">
                        <p className="text-sm font-medium text-muted-foreground">
                          Belum ada pasangan data approved antara {previousCycle} dan {cycle}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          Data perbandingan akan muncul setelah ada risiko yang disetujui di kedua cycle
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  comparisons.slice(0, 12).map((item) => (
                    <TableRow key={`${item.versionGroupId}-${item.code}`}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.code}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="space-y-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {item.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.changeReason ||
                              "Tidak ada alasan perubahan yang tercatat."}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.orgName || "-"}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {item.previousScore}{" "}
                        <span className="text-muted-foreground">
                          {formatRiskLevel(item.previousLevel)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        <ArrowRight className="mx-auto size-3.5" />
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {item.currentScore}{" "}
                        <span className="text-muted-foreground">
                          {formatRiskLevel(item.currentLevel)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm font-semibold">
                        {item.scoreDelta > 0
                          ? `+${item.scoreDelta}`
                          : item.scoreDelta}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.movement === "up" ? (
                          <TrendingUp className="mx-auto size-4 text-destructive" />
                        ) : null}
                        {item.movement === "down" ? (
                          <TrendingDown className="mx-auto size-4 text-success" />
                        ) : null}
                        {item.movement === "stable" ? (
                          <Minus className="mx-auto size-4 text-muted-foreground" />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Reassessment</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan memulai pemantauan untuk risiko berikut. Tindakan ini
              akan membuat draft pemantauan baru yang dapat Anda edit sebelum
              diajukan untuk persetujuan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-sm">
              <span className="font-medium text-foreground">Kode: </span>
              <span className="font-mono text-xs text-muted-foreground">
                {selectedRisk?.code || "-"}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-foreground">Judul: </span>
              <span className="text-muted-foreground">
                {selectedRisk?.title || "-"}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-foreground">Cycle: </span>
              <span className="text-muted-foreground">{cycle}</span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateReassessment}>
              Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
