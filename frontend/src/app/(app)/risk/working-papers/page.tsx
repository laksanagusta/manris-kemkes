"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import {
  listWorkingPapers,
  deleteWorkingPaper,
  cancelWorkingPaper,
} from "@/lib/api/working-papers";
import type { WorkingPaper, WorkingPaperStatus } from "@/types/working-paper";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard, type KpiCardTone } from "@/components/ui/kpi-card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowUpRight,
  Calendar,
  Search,
} from "lucide-react";
import { getLinearStatusBadgeClass } from "@/lib/linear-status-badge";

type WorkingPaperStatusFilter = "all" | WorkingPaperStatus;

function getWorkingPaperStatusFilter(
  value: string | null,
): WorkingPaperStatusFilter {
  if (
    value === "draft" ||
    value === "signing" ||
    value === "completed" ||
    value === "cancelled"
  ) {
    return value;
  }

  return "all";
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

const statusVariant: Record<WorkingPaperStatus, string> = {
  draft: getLinearStatusBadgeClass("draft"),
  signing: getLinearStatusBadgeClass("signing"),
  completed: getLinearStatusBadgeClass("completed"),
  cancelled: getLinearStatusBadgeClass("cancelled"),
};

const statusLabels: Record<WorkingPaperStatus, string> = {
  draft: "Draft",
  signing: "Proses TTE",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

type WorkingPaperSummaryCard = {
  label: string;
  value: number;
  tone: KpiCardTone;
};

function formatWorkingPaperDate(
  value: string,
  options: Intl.DateTimeFormatOptions,
) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("id-ID", options);
}

export default function WorkingPapersPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [isPending, startTransition] = useTransition();

  const [papers, setPapers] = useState<WorkingPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<WorkingPaperStatusFilter>(
    () => getWorkingPaperStatusFilter(searchParams.get("status")),
  );
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [assessmentCycleFilter, setAssessmentCycleFilter] = useState(
    () => searchParams.get("assessment_cycle") ?? "",
  );
  const [createdAtFilter, setCreatedAtFilter] = useState(
    () => searchParams.get("created_at") ?? "",
  );
  const [page, setPage] = useState(() =>
    parsePositiveInt(searchParams.get("page"), 1),
  );
  const [limit, setLimit] = useState(() =>
    parsePositiveInt(searchParams.get("limit"), 10),
  );
  const [total, setTotal] = useState(0);

  const deferredSearch = useDeferredValue(search);
  const deferredAssessmentCycleFilter = useDeferredValue(assessmentCycleFilter);

  const [paperToDelete, setPaperToDelete] = useState<WorkingPaper | null>(null);
  const [paperToCancel, setPaperToCancel] = useState<WorkingPaper | null>(null);

  const fetchWorkingPapers = async (activeToken: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await listWorkingPapers(activeToken, {
        status: statusFilter === "all" ? undefined : statusFilter,
        q: deferredSearch.trim() || undefined,
        assessment_cycle: deferredAssessmentCycleFilter.trim() || undefined,
        created_at: createdAtFilter.trim() || undefined,
        page,
        limit,
      });
      setPapers(res.data ?? []);
      setTotal(res.total ?? 0);
      setPage(res.page ?? page);
      setLimit(res.limit ?? limit);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat daftar kertas kerja. Silakan coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchWorkingPapers(token);
    }
  }, [
    token,
    statusFilter,
    deferredSearch,
    deferredAssessmentCycleFilter,
    createdAtFilter,
    page,
    limit,
  ]);

  useEffect(() => {
    const nextStatusFilter = getWorkingPaperStatusFilter(
      searchParams.get("status"),
    );
    const nextSearch = searchParams.get("q") ?? "";
    const nextAssessmentCycleFilter =
      searchParams.get("assessment_cycle") ?? "";
    const nextCreatedAtFilter = searchParams.get("created_at") ?? "";
    const nextPage = parsePositiveInt(searchParams.get("page"), 1);
    const nextLimit = parsePositiveInt(searchParams.get("limit"), 10);

    setStatusFilter((current) =>
      current === nextStatusFilter ? current : nextStatusFilter,
    );
    setSearch((current) => (current === nextSearch ? current : nextSearch));
    setAssessmentCycleFilter((current) =>
      current === nextAssessmentCycleFilter
        ? current
        : nextAssessmentCycleFilter,
    );
    setCreatedAtFilter((current) =>
      current === nextCreatedAtFilter ? current : nextCreatedAtFilter,
    );
    setPage((current) => (current === nextPage ? current : nextPage));
    setLimit((current) => (current === nextLimit ? current : nextLimit));
  }, [searchParams]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    const normalizedSearch = search.trim();
    const normalizedAssessmentCycle = assessmentCycleFilter.trim();
    const normalizedCreatedAt = createdAtFilter.trim();

    if (statusFilter === "all") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", statusFilter);
    }

    if (normalizedSearch) {
      nextParams.set("q", normalizedSearch);
    } else {
      nextParams.delete("q");
    }

    if (normalizedAssessmentCycle) {
      nextParams.set("assessment_cycle", normalizedAssessmentCycle);
    } else {
      nextParams.delete("assessment_cycle");
    }

    if (normalizedCreatedAt) {
      nextParams.set("created_at", normalizedCreatedAt);
    } else {
      nextParams.delete("created_at");
    }

    if (page === 1) {
      nextParams.delete("page");
    } else {
      nextParams.set("page", page.toString());
    }

    if (limit === 10) {
      nextParams.delete("limit");
    } else {
      nextParams.set("limit", limit.toString());
    }

    const nextUrl = nextParams.toString()
      ? `${pathname}?${nextParams.toString()}`
      : pathname;
    const currentUrl = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    if (nextUrl === currentUrl) {
      return;
    }

    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }, [
    assessmentCycleFilter,
    createdAtFilter,
    limit,
    page,
    pathname,
    router,
    search,
    searchParams,
    startTransition,
    statusFilter,
  ]);

  const handleDelete = async () => {
    if (!paperToDelete || !token) return;
    toast.promise(
      (async () => {
        await deleteWorkingPaper(paperToDelete.id, token);
        await fetchWorkingPapers(token);
        setPaperToDelete(null);
      })(),
      {
        loading: "Menghapus kertas kerja...",
        success: "Kertas kerja berhasil dihapus.",
        error: (err) =>
          err instanceof Error ? err.message : "Gagal menghapus kertas kerja.",
      },
    );
  };

  const handleCancel = async () => {
    if (!paperToCancel || !token) return;
    toast.promise(
      (async () => {
        await cancelWorkingPaper(paperToCancel.id, token);
        await fetchWorkingPapers(token);
        setPaperToCancel(null);
      })(),
      {
        loading: "Membatalkan kertas kerja...",
        success: "Kertas kerja berhasil dibatalkan.",
        error: (err) =>
          err instanceof Error
            ? err.message
            : "Gagal membatalkan kertas kerja.",
      },
    );
  };

  const totalPages = Math.ceil(total / limit) || 1;

  if (loading && papers.length === 0) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-72 rounded-md bg-muted/60 animate-pulse" />
          </div>
          <div className="h-9 w-36 rounded-md bg-muted animate-pulse" />
        </div>
        {/* Stats skeleton */}
        <div className="grid gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-border/50 bg-card/80">
              <CardContent className="p-4 space-y-2">
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                <div className="h-7 w-10 rounded bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Table skeleton */}
        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <div className="p-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-3 border-b border-border/20 last:border-0"
              >
                <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
                <div className="h-4 w-20 rounded bg-muted/60 animate-pulse" />
                <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
                <div className="h-4 w-8 rounded bg-muted/60 animate-pulse" />
                <div className="h-1.5 w-16 rounded bg-muted animate-pulse" />
                <div className="h-4 w-20 rounded bg-muted/60 animate-pulse" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4 animate-fade-in">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Gagal Memuat Data</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="gap-2"
          >
            <ArrowUpRight className="size-4" />
            Muat Ulang Halaman
          </Button>
        </div>
      </div>
    );
  }

  const draftCount = papers.filter((p) => p.status === "draft").length;
  const signingCount = papers.filter((p) => p.status === "signing").length;
  const completedCount = papers.filter((p) => p.status === "completed").length;
  const cancelledCount = papers.filter((p) => p.status === "cancelled").length;

  const summaryCards: WorkingPaperSummaryCard[] = [
    {
      label: "Total",
      value: total,
      tone: "white" as const,
    },
    {
      label: "Draft",
      value: draftCount,
      tone: "zinc" as const,
    },
    {
      label: "Proses TTE",
      value: signingCount,
      tone: "zinc" as const,
    },
    {
      label: "Selesai",
      value: completedCount,
      tone: "emerald" as const,
    },
    {
      label: "Dibatalkan",
      value: cancelledCount,
      tone: "rose" as const,
    },
  ];
  const visiblePaperCount = papers.length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kertas Kerja</h1>
          <p className="text-sm text-muted-foreground">
            Kelola daftar kertas kerja untuk proses pengesahan profil risiko
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/risk/working-papers/new">
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="size-4" />
              Buat Kertas Kerja
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <KpiCard key={card.label} label={card.label} value={card.value} tone={card.tone} />
        ))}
      </div>

      <div className="space-y-3">
        <Tabs
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val as WorkingPaperStatusFilter);
            setPage(1);
          }}
        >
          <TabsList className="bg-muted/40 border border-border/50">
            <TabsTrigger value="all" className="gap-2 text-xs">
              Semua
            </TabsTrigger>
            <TabsTrigger value="draft" className="gap-2 text-xs">
              Draft
            </TabsTrigger>
            <TabsTrigger value="signing" className="gap-2 text-xs">
              Proses TTE
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2 text-xs">
              Selesai
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="gap-2 text-xs">
              Dibatalkan
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari judul kertas kerja..."
                  className="h-8 border border-border/50 bg-background/80 pl-8 text-xs"
                />
              </div>
              <div className="relative min-w-[200px] md:w-52">
                <Calendar className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={assessmentCycleFilter}
                  onChange={(event) => {
                    setAssessmentCycleFilter(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Filter siklus asesmen"
                  className="h-8 border border-border/50 bg-background/80 pl-8 text-xs"
                />
              </div>
              <div className="relative min-w-[160px] md:w-44">
                <Calendar className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={createdAtFilter}
                  onChange={(event) => {
                    setCreatedAtFilter(event.target.value);
                    setPage(1);
                  }}
                  className="h-8 border border-border/50 bg-background/80 pl-8 text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(24,24,27,0.05)] ring-1 ring-inset ring-zinc-200/80">
          <div className="flex flex-col gap-3 p-4 shadow-[inset_0_-1px_rgba(24,24,27,0.06)] md:flex-row md:items-start md:justify-between md:px-6">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold tracking-tight text-zinc-900 text-balance">
                  Daftar kertas kerja
                </h2>
                <p className="mt-1 text-xs text-zinc-500 text-pretty">
                  Dokumen kertas kerja risiko beserta status dan progres
                  penandatanganan untuk filter yang sedang aktif.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className="rounded-full bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-zinc-600 tabular-nums ring-1 ring-inset ring-zinc-200">
                {visiblePaperCount} kertas kerja
              </span>
            </div>
          </div>

          {papers.length === 0 ? (
            <div className="p-4">
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 px-4 py-8 text-left">
                <p className="text-sm font-medium text-zinc-700">
                  Belum ada kertas kerja yang sesuai filter
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Ubah filter pencarian atau tab status untuk melihat data lain.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3 p-4 md:hidden">
                {papers.map((wp) => {
                  const signedCount =
                    wp.signatories?.filter((s) => s.status === "signed")
                      .length || 0;
                  const totalSignatories = wp.signatories?.length || 0;
                  const progressPercent =
                    totalSignatories > 0
                      ? (signedCount / totalSignatories) * 100
                      : 0;
                  const progressText =
                    totalSignatories > 0
                      ? `${signedCount}/${totalSignatories}`
                      : "-";
                  const createdDate = formatWorkingPaperDate(wp.created_at, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <div
                      key={wp.id}
                      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/risk/working-papers/${wp.id}`}
                            className="line-clamp-2 text-sm font-semibold text-zinc-900 transition-colors hover:text-primary"
                          >
                            {wp.title || "Tanpa Judul"}
                          </Link>
                          <p className="mt-1 text-xs tabular-nums text-zinc-500">
                            {wp.assessment_cycle || "Tanpa siklus asesmen"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "px-2.5",
                            getLinearStatusBadgeClass(wp.status),
                          )}
                        >
                          {statusLabels[wp.status] || wp.status}
                          {wp.status === "completed" && wp.tte_skipped ? " (tanpa TTE)" : ""}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1 rounded-xl bg-zinc-50/80 px-3 py-2 ring-1 ring-inset ring-zinc-200/80">
                            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500 text-pretty">
                              Jumlah risiko
                            </p>
                            <div className="text-sm font-medium text-zinc-900 text-pretty">
                              {wp.risks?.length || 0} risiko
                            </div>
                          </div>
                          <div className="space-y-1 rounded-xl bg-zinc-50/80 px-3 py-2 ring-1 ring-inset ring-zinc-200/80">
                            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500 text-pretty">
                              Dibuat pada
                            </p>
                            <div className="text-sm text-zinc-900 text-pretty">
                              {createdDate}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 rounded-xl bg-zinc-50/80 px-3 py-3 ring-1 ring-inset ring-zinc-200/80">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500 text-pretty">
                              Progres TTE
                            </p>
                            <span className="text-sm font-medium text-zinc-900">
                              {progressText}
                            </span>
                          </div>
                          {totalSignatories > 0 ? (
                            <Progress
                              value={progressPercent}
                              className="h-2 bg-zinc-200"
                            />
                          ) : (
                            <p className="text-sm text-zinc-500">
                              Belum ada penandatangan.
                            </p>
                          )}
                        </div>
                      </div>

                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                      >
                        <Link href={`/risk/working-papers/${wp.id}`}>
                          Buka detail
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>

              <Table className="hidden min-w-[980px] md:table">
                <TableHeader className="[&_tr]:border-b [&_tr]:border-zinc-200">
                  <TableRow className="border-zinc-200 transition-colors hover:bg-transparent">
                    <TableHead className="h-10 whitespace-nowrap pl-4 pr-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 md:pl-6">
                      Judul
                    </TableHead>
                    <TableHead className="h-10 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Siklus
                    </TableHead>
                    <TableHead className="h-10 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Status
                    </TableHead>
                    <TableHead className="h-10 whitespace-nowrap px-2.5 text-center align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Risiko
                    </TableHead>
                    <TableHead className="h-10 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Progres TTE
                    </TableHead>
                    <TableHead className="h-10 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Dibuat
                    </TableHead>
                </TableRow>
              </TableHeader>
                <TableBody>
                  {papers.map((wp) => {
                    const signedCount =
                      wp.signatories?.filter((s) => s.status === "signed")
                        .length || 0;
                    const totalSignatories = wp.signatories?.length || 0;
                    const progressPercent =
                      totalSignatories > 0
                        ? (signedCount / totalSignatories) * 100
                        : 0;
                    const progressText =
                      totalSignatories > 0
                        ? `${signedCount}/${totalSignatories}`
                        : "-";
                    const createdDate = formatWorkingPaperDate(wp.created_at, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });

                    return (
                      <TableRow
                        key={wp.id}
                        className="border-zinc-200/80 transition-colors hover:bg-zinc-50/70"
                      >
                        <TableCell className="min-w-[320px] pl-4 pr-2.5 py-2.5 align-middle md:pl-6">
                          <Link
                            href={`/risk/working-papers/${wp.id}`}
                            className="block text-sm font-semibold leading-relaxed text-zinc-900 transition-colors hover:text-primary"
                            title={wp.title}
                          >
                            {wp.title || "Tanpa Judul"}
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap p-2.5 align-middle text-sm text-zinc-600">
                          {wp.assessment_cycle || "-"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap p-2.5 align-middle">
                          <Badge
                            className={cn(
                              "h-6 border px-2 py-0 text-xs font-semibold",
                              statusVariant[wp.status],
                            )}
                          >
                            {statusLabels[wp.status] || wp.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap p-2.5 text-center align-middle text-sm font-medium tabular-nums text-zinc-900">
                          {wp.risks?.length || 0}
                        </TableCell>
                        <TableCell className="min-w-[180px] p-2.5 align-middle">
                          {totalSignatories > 0 ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-zinc-900">
                                  {progressText}
                                </span>
                                <span className="text-xs text-zinc-500">
                                  Penandatangan
                                </span>
                              </div>
                              <Progress
                                value={progressPercent}
                                className="h-2 bg-zinc-200"
                              />
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-500">-</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap p-2.5 align-middle text-sm text-zinc-600">
                          {createdDate}
                        </TableCell>
                    </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            </>
          )}

          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">
                  Baris per halaman:
                </span>
                <Select
                  value={limit.toString()}
                  onValueChange={(val) => {
                    setLimit(Number(val));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-7 w-[65px] border-zinc-200 bg-white text-xs text-zinc-700">
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
              <p className="text-xs text-zinc-500">
                Menampilkan {total === 0 ? 0 : (page - 1) * limit + 1} -{" "}
                {Math.min(page * limit, total)} dari {total} kertas kerja
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                disabled={page === 1 || loading || isPending}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="px-2 text-xs text-zinc-500">
                Halaman {page} dari {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                disabled={
                  page === totalPages || total === 0 || loading || isPending
                }
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        open={!!paperToDelete}
        onOpenChange={(open) => !open && setPaperToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kertas Kerja?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus draft kertas kerja &quot;
              {paperToDelete?.title}&quot;? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!paperToCancel}
        onOpenChange={(open) => !open && setPaperToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Kertas Kerja?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin membatalkan kertas kerja &quot;
              {paperToCancel?.title}&quot;? Kertas kerja yang dibatalkan tidak
              dapat dilanjutkan proses TTE-nya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
