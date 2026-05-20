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
import { getHeatmapCellClass } from "@/lib/heatmap-utils";
import { getVisibleRiskReviewItems } from "@/lib/risk-review-panel";
import { MultiPhaseHeatmapCompareCard } from "./multi-phase-heatmap-compare";

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
    label: "Pending Approval (Legacy)",
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

export function RiskReviewPanel() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [items, setItems] = useState<RiskReviewQueueItem[]>([]);
  const [comparisons, setComparisons] = useState<RiskCycleComparisonItem[]>([]);
  const [summaryData, setSummaryData] = useState<RiskReviewSummary | null>(
    null,
  );
  const [previousHeatmapData, setPreviousHeatmapData] = useState<number[][]>(
    [],
  );
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
  const [selectedRisk, setSelectedRisk] = useState<RiskReviewQueueItem | null>(
    null,
  );
  const cycle = useMemo(() => currentGlobalCycle(), []);
  const previousCycle = useMemo(() => previousGlobalCycle(cycle), [cycle]);
  const heatmapMode = "riskLevel" as const;

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
  }, [token, user?.accessibleOrgIds, user?.isGlobal]);

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
    return getVisibleRiskReviewItems(items);
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
          {
            label: "Pending (Legacy)",
            value: summary.pending_approval,
            icon: Send,
          },
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
                            <p className="text-sm font-medium text-muted-foreground">
                              Belum ada data unit completion untuk cycle ini
                            </p>
                            <p className="text-xs text-muted-foreground/70">
                              Tunggu sampai ada unit completion yang disubmit
                            </p>
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
                            {heatmapMode === "riskLevel" && count === 0
                              ? ""
                              : count}
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
                          Belum ada pasangan data approved antara{" "}
                          {previousCycle} dan {cycle}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          Data perbandingan akan muncul setelah ada risiko yang
                          disetujui di kedua cycle
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
              finalisasi.
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
