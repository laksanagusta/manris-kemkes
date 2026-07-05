"use client";

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard, type KpiCardTone } from "@/components/ui/kpi-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowUpRight,
  Search,
} from "lucide-react";
import { getLinearStatusBadgeClass } from "@/lib/linear-status-badge";
import { SearchInput } from "@/components/ui/search-input";
import { useSetHeaderActions } from "@/lib/header-actions-context";

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

type WorkingPaperFiltersSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusFilter: WorkingPaperStatusFilter;
  onStatusFilterChange: (value: WorkingPaperStatusFilter) => void;
  assessmentCycleFilter: string;
  onAssessmentCycleFilterChange: (value: string) => void;
  createdAtFilter: string;
  onCreatedAtFilterChange: (value: string) => void;
  onReset: () => void;
};

function WorkingPaperFiltersSidebar({
  open,
  onOpenChange,
  statusFilter,
  onStatusFilterChange,
  assessmentCycleFilter,
  onAssessmentCycleFilterChange,
  createdAtFilter,
  onCreatedAtFilterChange,
  onReset,
}: WorkingPaperFiltersSidebarProps) {
  return (
    <Sheet modal={false} open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="md" className="gap-2 shadow-none">
          <Filter className="size-3.5" strokeWidth={2.5} />
          Filter
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-[22rem] rounded-2xl"
      >
        <SheetHeader>
          <SheetTitle>Filter Kertas Kerja</SheetTitle>
          <SheetDescription>
            Atur status, siklus asesmen, dan tanggal dibuat. Search tetap
            tersedia di bawah KPI cards.
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Status
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                onStatusFilterChange(value as WorkingPaperStatusFilter)
              }
            >
              <SelectTrigger className="h-9 rounded-md border-0 bg-muted/50 text-sm">
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="signing">Proses TTE</SelectItem>
                <SelectItem value="completed">Selesai</SelectItem>
                <SelectItem value="cancelled">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Siklus Asesmen
            </Label>
            <Input
              value={assessmentCycleFilter}
              onChange={(event) =>
                onAssessmentCycleFilterChange(event.target.value)
              }
              placeholder="Filter siklus asesmen"
              className="h-9 border-0 bg-muted/50 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Tanggal Dibuat
            </Label>
            <Input
              type="date"
              value={createdAtFilter}
              onChange={(event) => onCreatedAtFilterChange(event.target.value)}
              className="h-9 border-0 bg-muted/50 text-sm"
            />
          </div>
        </div>

        <Separator />

        <SheetFooter className="sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" size="md" onClick={onReset} className="shadow-none">
            Reset
          </Button>
          <Button
            type="button"
            size="md"
            className="gap-1.5"
            style={{ '--primary': '#00b9ad', '--primary-foreground': '#ffffff' } as React.CSSProperties}
            onClick={() => onOpenChange(false)}
          >
            Terapkan
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type WorkingPaperFiltersToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchAriaLabel: string;
  filterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  statusFilter: WorkingPaperStatusFilter;
  onStatusFilterChange: (value: WorkingPaperStatusFilter) => void;
  assessmentCycleFilter: string;
  onAssessmentCycleFilterChange: (value: string) => void;
  createdAtFilter: string;
  onCreatedAtFilterChange: (value: string) => void;
  onReset: () => void;
};

function WorkingPaperFiltersToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  filterOpen,
  onFilterOpenChange,
  statusFilter,
  onStatusFilterChange,
  assessmentCycleFilter,
  onAssessmentCycleFilterChange,
  createdAtFilter,
  onCreatedAtFilterChange,
  onReset,
}: WorkingPaperFiltersToolbarProps) {
  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
      <div className="min-w-0 flex-1 sm:w-64 md:flex-none">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
          <SearchInput
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel}
            className="bg-muted pl-10 text-sm"
          />
        </div>
      </div>

      <WorkingPaperFiltersSidebar
        open={filterOpen}
        onOpenChange={onFilterOpenChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        assessmentCycleFilter={assessmentCycleFilter}
        onAssessmentCycleFilterChange={onAssessmentCycleFilterChange}
        createdAtFilter={createdAtFilter}
        onCreatedAtFilterChange={onCreatedAtFilterChange}
        onReset={onReset}
      />
    </div>
  );
}

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

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(handle);
  }, [delay, value]);

  return debouncedValue;
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
  const [filterOpen, setFilterOpen] = useState(false);
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

  const debouncedSearch = useDebouncedValue(search, 500);
  const deferredAssessmentCycleFilter = useDebouncedValue(assessmentCycleFilter, 500);

  const [paperToDelete, setPaperToDelete] = useState<WorkingPaper | null>(null);
  const [paperToCancel, setPaperToCancel] = useState<WorkingPaper | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState("");
  const setHeaderActions = useSetHeaderActions();

  const semesterOptions: { value: string; label: string }[] = (() => {
    const year = new Date().getFullYear();
    const half = new Date().getMonth() < 6 ? 1 : 2;
    if (half === 1) {
      return [
        { value: `${year - 1}-H2`, label: `${year - 1}-H2` },
        { value: `${year}-H1`, label: `${year}-H1` },
        { value: `${year}-H2`, label: `${year}-H2` },
      ];
    }
    return [
      { value: `${year}-H1`, label: `${year}-H1` },
      { value: `${year}-H2`, label: `${year}-H2` },
      { value: `${year + 1}-H1`, label: `${year + 1}-H1` },
    ];
  })();

  const currentSemester = (() => {
    const now = new Date();
    return `${now.getFullYear()}-H${now.getMonth() < 6 ? 1 : 2}`;
  })();

  const handleResetFilters = () => {
    setStatusFilter("all");
    setAssessmentCycleFilter("");
    setCreatedAtFilter("");
    setPage(1);
  };

  const fetchWorkingPapers = useCallback(
    async (activeToken: string) => {
      try {
        setLoading(true);
        setError(null);
        const res = await listWorkingPapers(activeToken, {
          status: statusFilter === "all" ? undefined : statusFilter,
          q: debouncedSearch.trim() || undefined,
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
    },
    [
      createdAtFilter,
      deferredAssessmentCycleFilter,
      debouncedSearch,
      limit,
      page,
      statusFilter,
    ],
  );

  useEffect(() => {
    if (token) {
      fetchWorkingPapers(token);
    }
  }, [
    fetchWorkingPapers,
    token,
    statusFilter,
    debouncedSearch,
    deferredAssessmentCycleFilter,
    createdAtFilter,
    page,
    limit,
  ]);

  useEffect(() => {
    const nextStatusFilter = getWorkingPaperStatusFilter(
      searchParams.get("status"),
    );
    const nextAssessmentCycleFilter =
      searchParams.get("assessment_cycle") ?? "";
    const nextCreatedAtFilter = searchParams.get("created_at") ?? "";
    const nextPage = parsePositiveInt(searchParams.get("page"), 1);
    const nextLimit = parsePositiveInt(searchParams.get("limit"), 10);

    setStatusFilter((current) =>
      current === nextStatusFilter ? current : nextStatusFilter,
    );
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
    const normalizedAssessmentCycle = assessmentCycleFilter.trim();
    const normalizedCreatedAt = createdAtFilter.trim();

    if (statusFilter === "all") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", statusFilter);
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
  const showInitialLoading = loading && papers.length === 0;

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

  useEffect(() => {
    if (!token) return;
    setHeaderActions(
      <div className="flex items-center gap-2">
        <Button
          size="md"
          className="gap-2 border-0"
          style={{ '--primary': '#00b9ad', '--primary-foreground': '#ffffff' } as React.CSSProperties}
          onClick={() => {
            setSelectedSemester(currentSemester);
            setCreateModalOpen(true);
          }}
        >
          <Plus className="size-3.5" strokeWidth={2.5} />
          Buat Kertas Kerja
        </Button>
      </div>,
    );
    return () => setHeaderActions(null);
  }, [token, setHeaderActions]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <KpiCard
            key={card.label}
            label={card.label}
            value={card.value}
            tone="white"
            className="flex min-h-[96px] flex-col rounded-lg ring-1 ring-inset ring-border p-4"
            labelClassName="capitalize tracking-normal"
            valueClassName="font-medium"
            valueWrapClassName="mt-auto"
          />
        ))}
      </div>

      <div className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-4 text-sm text-destructive">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold">Gagal Memuat Data</p>
                <p className="text-sm text-destructive/80">{error}</p>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="mt-2 gap-2 border-destructive/20 bg-background text-destructive shadow-none hover:bg-destructive/5"
                >
                  <ArrowUpRight className="size-4" />
                  Muat Ulang Halaman
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-lg gap-0 overflow-hidden ring-1 ring-inset ring-border bg-card p-4">
      <div className="flex flex-col gap-4 pb-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-medium tracking-tight text-foreground text-balance">
            Daftar Kertas Kerja
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
            Dokumen risiko dan progres penandatanganan
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <WorkingPaperFiltersToolbar
                search={search}
                onSearchChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                searchPlaceholder="Cari judul kertas kerja..."
                searchAriaLabel="Cari judul kertas kerja"
                filterOpen={filterOpen}
                onFilterOpenChange={setFilterOpen}
                statusFilter={statusFilter}
                onStatusFilterChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                assessmentCycleFilter={assessmentCycleFilter}
                onAssessmentCycleFilterChange={(value) => {
                  setAssessmentCycleFilter(value);
                  setPage(1);
                }}
                createdAtFilter={createdAtFilter}
                onCreatedAtFilterChange={(value) => {
                  setCreatedAtFilter(value);
                  setPage(1);
                }}
                onReset={handleResetFilters}
              />
            </div>
          </div>

          {showInitialLoading ? (
            <div className="p-4">
              <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-left">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Search className="size-4 animate-pulse" />
                  Memuat daftar kertas kerja...
                </div>
              </div>
            </div>
          ) : papers.length === 0 ? (
            <div className="p-4">
              <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-left">
                <p className="text-sm font-medium text-foreground">
                  Belum ada kertas kerja yang sesuai filter
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ubah filter pencarian atau tab status untuk melihat data lain.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2 p-4 md:hidden">
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
                      className="rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                              {wp.code}
                            </span>
                            <Badge
                              className={getLinearStatusBadgeClass(wp.status)}
                            >
                              {statusLabels[wp.status] || wp.status}
                            </Badge>
                          </div>
                          <Link
                            href={`/risk/working-papers/${wp.id}`}
                            className="mt-1 line-clamp-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                          >
                            {wp.title || "Tanpa Judul"}
                          </Link>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>{wp.assessment_cycle || "Tanpa siklus"}</span>
                            <span className="text-border">|</span>
                            <span>{wp.risks?.length || 0} risiko</span>
                            <span className="text-border">|</span>
                            <span>{createdDate}</span>
                          </div>
                        </div>
                        <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                      </div>

                      {totalSignatories > 0 && (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium tabular-nums text-muted-foreground">
                            {progressText} TTE
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            <div className="-mx-4 overflow-x-auto hidden md:block">
              <Table className="min-w-[980px]">
                <TableHeader className="[&_tr]:border-b [&_tr]:border-border">
                  <TableRow className="h-9 hover:bg-transparent">
                    <TableHead className="h-9 whitespace-nowrap pl-4 pr-3 text-left align-middle text-xs font-medium capitalize text-muted-foreground">
                      Judul
                    </TableHead>
                    <TableHead className="h-9 whitespace-nowrap px-3 text-left align-middle text-xs font-medium capitalize text-muted-foreground">
                      Siklus
                    </TableHead>
                    <TableHead className="h-9 whitespace-nowrap px-3 text-left align-middle text-xs font-medium capitalize text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="h-9 whitespace-nowrap px-3 text-center align-middle text-xs font-medium capitalize text-muted-foreground">
                      Risiko
                    </TableHead>
                    <TableHead className="h-9 whitespace-nowrap px-3 text-left align-middle text-xs font-medium capitalize text-muted-foreground">
                      Progres TTE
                    </TableHead>
                    <TableHead className="h-9 whitespace-nowrap px-3 text-left align-middle text-xs font-medium capitalize text-muted-foreground">
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
                        className="border-b border-border hover:bg-muted/50"
                      >
                        <TableCell className="min-w-[320px] py-2 pl-4 pr-3 align-middle">
                          <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                            {wp.code}
                          </div>
                          <Link
                            href={`/risk/working-papers/${wp.id}`}
                            className="block text-sm font-normal leading-relaxed text-foreground transition-colors hover:text-primary"
                            title={wp.title}
                          >
                            {wp.title || "Tanpa Judul"}
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-3 py-2 align-middle text-sm text-muted-foreground">
                          {wp.assessment_cycle || "-"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-3 py-2 align-middle">
                          <Badge
                            className={cn(
                              "h-6 rounded-lg border-0 px-2.5 text-xs",
                              statusVariant[wp.status],
                            )}
                          >
                            {statusLabels[wp.status] || wp.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-3 py-2 text-center align-middle text-sm font-medium tabular-nums text-foreground">
                          {wp.risks?.length || 0}
                        </TableCell>
                        <TableCell className="min-w-[180px] px-3 py-2 align-middle">
                          {totalSignatories > 0 ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-foreground">
                                  {progressText}
                                </span>
                              </div>
                              <Progress value={progressPercent} className="h-2 bg-muted" />
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-3 py-2 align-middle text-sm text-muted-foreground">
                          {createdDate}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            </>
          )}

          <div className="-mx-4 -mb-4 flex items-center justify-between border-t border-border/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  Baris:
                </span>
                <Select
                  value={limit.toString()}
                  onValueChange={(val) => {
                    setLimit(Number(val));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-6 w-[56px] rounded-md border-0 bg-transparent text-[11px] shadow-none">
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
              <p className="text-[11px] text-muted-foreground">
                {total === 0 ? 0 : (page - 1) * limit + 1}
                &ndash;{Math.min(page * limit, total)} dari{" "}
                {total}
              </p>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground shadow-none"
                disabled={page === 1 || loading || isPending}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="xs"
                className="bg-muted text-[11px] font-medium text-foreground shadow-none"
                disabled
              >
                {page}
              </Button>
              <span className="px-0.5 text-[11px] text-muted-foreground">
                / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground shadow-none"
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
        <AlertDialogContent className="sm:max-w-md rounded-2xl">
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
        <AlertDialogContent className="sm:max-w-md rounded-2xl">
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

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Pilih Periode Semester</DialogTitle>
            <DialogDescription>
              Tentukan semester untuk kertas kerja yang akan dibuat.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={selectedSemester}
              onValueChange={setSelectedSemester}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih semester" />
              </SelectTrigger>
              <SelectContent>
                {semesterOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="md"
              onClick={() => setCreateModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              size="md"
              onClick={() => {
                setCreateModalOpen(false);
                router.push(
                  `/risk/working-papers/new?cycle=${selectedSemester}`,
                );
              }}
              disabled={!selectedSemester}
              className="gap-2"
              style={{ '--primary': '#00b9ad', '--primary-foreground': '#ffffff' } as React.CSSProperties}
            >
              Lanjutkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
