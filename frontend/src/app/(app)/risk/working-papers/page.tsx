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
import { listWorkingPapers } from "@/lib/api/working-papers";
import type { WorkingPaper, WorkingPaperStatus } from "@/types/working-paper";
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";
import { WorkingPaperProgressCollapsible } from "./_components/working-paper-progress-collapsible";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Calendar as CalendarIcon, ChevronRight, Plus } from "@/components/shared/icons";
import { Badge } from "@/components/ui/badge";
import {
  currentAssessmentCycle,
  getAssessmentCycleFilterOptions,
  getSelectableMonitoringCyclesForDate,
  shiftAssessmentCycle,
} from "@/lib/risk-cycle-options";
import {
  CollectionEmptyState,
  CollectionErrorState,
  CollectionLoadingState,
  CollectionPagination,
  CollectionPageHeader,
  PopoverSelectField,
  CollectionSearchField,
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  CollectionToolbar,
  MonitoringTransactionProgress,
} from "@/components/shared/design-system";
import {
  AccentButton,
  PageStack,
} from "@/components/shared/design-system";
import {
  WorkingPaperCreateDialog,
} from "@/components/shared/working-paper-create-dialog";

type WorkingPaperStatusFilter = "all" | WorkingPaperStatus;

const createdAtFilterFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
});

function parseDateFilterValue(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : undefined;
}

function formatDateFilterValue(date?: Date): string {
  if (!date) return "";

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

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

const statusLabels: Record<WorkingPaperStatus, string> = {
  draft: "Draft",
  signing: "Proses TTE",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const statusTones = {
  draft: "neutral",
  signing: "progress",
  completed: "success",
  cancelled: "danger",
} as const;

type WorkingPaperFiltersToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchAriaLabel: string;
  statusFilter: WorkingPaperStatusFilter;
  onStatusFilterChange: (value: WorkingPaperStatusFilter) => void;
  assessmentCycleFilter: string;
  onAssessmentCycleFilterChange: (value: string) => void;
  assessmentCycleOptions: { value: string; label: string }[];
  createdAtFilter: string;
  onCreatedAtFilterChange: (value: string) => void;
  onReset: () => void;
};

function WorkingPaperFiltersToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  statusFilter,
  onStatusFilterChange,
  assessmentCycleFilter,
  onAssessmentCycleFilterChange,
  assessmentCycleOptions,
  createdAtFilter,
  onCreatedAtFilterChange,
  onReset,
}: WorkingPaperFiltersToolbarProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const createdAtDate = parseDateFilterValue(createdAtFilter);
  const hasActiveFilters = Boolean(
    search || statusFilter !== "all" || assessmentCycleFilter || createdAtFilter,
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <CollectionSearchField
        containerClassName="w-full sm:w-80 sm:flex-none"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchAriaLabel}
      />

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <PopoverSelectField
          fitContent
          value={statusFilter}
          onValueChange={(value) =>
            onStatusFilterChange(value as WorkingPaperStatusFilter)
          }
          options={[
            { value: "all", label: "Semua status" },
            ...Object.entries(statusLabels).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          placeholder="Semua status"
          ariaLabel="Filter status kertas kerja"
          triggerClassName="w-full sm:w-fit"
        />

        <PopoverSelectField
          fitContent
          value={assessmentCycleFilter || "all"}
          onValueChange={(value) =>
            onAssessmentCycleFilterChange(value === "all" ? "" : value)
          }
          options={assessmentCycleOptions}
          placeholder="Semua Periode"
          ariaLabel="Filter siklus asesmen"
          triggerClassName="w-full sm:w-fit"
        />

        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              aria-label={
                createdAtDate
                  ? `Filter tanggal dibuat, ${createdAtFilterFormatter.format(createdAtDate)}`
                  : "Filter tanggal dibuat"
              }
              className="w-full justify-start text-left font-normal sm:w-[168px]"
            >
              <CalendarIcon aria-hidden="true" data-icon="inline-start" />
              {createdAtDate
                ? createdAtFilterFormatter.format(createdAtDate)
                : "Tanggal dibuat"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={createdAtDate}
              onSelect={(date) => {
                onCreatedAtFilterChange(formatDateFilterValue(date));
                setDatePickerOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={!hasActiveFilters}
        >
          Reset
        </Button>
      </div>
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

function getWorkingPaperSigningProgress(paper: WorkingPaper) {
  const signedCount =
    paper.signatories?.filter((signatory) => signatory.status === "signed")
      .length || 0;
  const totalSignatories = paper.signatories?.length || 0;

  return {
    totalSignatories,
    progressPercent:
      totalSignatories > 0 ? (signedCount / totalSignatories) * 100 : 0,
    progressText:
      totalSignatories > 0 ? `${signedCount}/${totalSignatories}` : "-",
  };
}

type WorkingPaperCardProps = {
  paper: WorkingPaper;
};

function WorkingPaperCode({ code }: { code: string }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
      {code}
    </span>
  );
}

function WorkingPaperSigningProgress({
  totalSignatories,
  progressPercent,
  progressText,
}: {
  totalSignatories: number;
  progressPercent: number;
  progressText: string;
}) {
  if (totalSignatories === 0) return null;

  return (
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
  );
}

function WorkingPaperMobileCard({
  paper,
  totalSignatories,
  progressPercent,
  progressText,
  createdDate,
}: WorkingPaperCardProps & {
  totalSignatories: number;
  progressPercent: number;
  progressText: string;
  createdDate: string;
}) {
  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardContent>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <WorkingPaperCode code={paper.code} />
            <Badge variant={toBadgeVariant(statusTones[paper.status])}
              className={getStatusBadgeClassName(statusTones[paper.status])}
            >
              {statusLabels[paper.status] || paper.status}
            </Badge>
          </div>
          <Link
            href={`/risk/working-papers/${paper.id}`}
            className="mt-1 line-clamp-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            {paper.title || "Tanpa Judul"}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{paper.assessment_cycle || "Tanpa siklus"}</span>
            <span className="text-border">|</span>
            <span>{paper.risks?.length || 0} risiko</span>
            <span className="text-border">|</span>
            <span>{createdDate}</span>
          </div>
        </div>
        <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
      </div>
      <WorkingPaperSigningProgress
        totalSignatories={totalSignatories}
        progressPercent={progressPercent}
        progressText={progressText}
      />
      </CardContent>
    </Card>
  );
}

function WorkingPaperDesktopSigningProgress({
  signatories,
}: {
  signatories: WorkingPaper["signatories"];
}) {
  if (signatories.length === 0) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  const signedCount = signatories.filter(
    (signatory) => signatory.status === "signed",
  ).length;

  return (
    <MonitoringTransactionProgress
      items={signatories.map((signatory) => ({
        label: signatory.signer_name || `Penandatangan ${signatory.sequence_no}`,
        status: signatory.status === "signed" ? "final" : "draft",
      }))}
      showCount={false}
      ariaLabelOverride={`Progres TTE: ${signedCount} dari ${signatories.length} penandatangan sudah menandatangani.`}
    />
  );
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

  const debouncedSearch = useDebouncedValue(search, 500);
  const deferredAssessmentCycleFilter = useDebouncedValue(
    assessmentCycleFilter,
    500,
  );
  const assessmentCycleOptions = getAssessmentCycleFilterOptions(
    new Date(),
    assessmentCycleFilter,
  );

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [exportingPaperId, setExportingPaperId] = useState<string | null>(null);

  const periodOptions: {
    value: string;
    label: string;
    isCurrent?: boolean;
  }[] = (() => {
    const currentCycle = currentAssessmentCycle();
    const monitoringCycles = getSelectableMonitoringCyclesForDate();
    return monitoringCycles.map((cycle) => ({
      ...cycle,
      isCurrent: cycle.value === currentCycle,
    }));
  })();

  const handleResetFilters = () => {
    setStatusFilter("all");
    setSearch("");
    setAssessmentCycleFilter("");
    setCreatedAtFilter("");
    setPage(1);
  };

  const handleExport = useCallback(async (workingPaper: WorkingPaper) => {
    setExportingPaperId(workingPaper.id);
    try {
      const { exportWorkingPaper } = await import("@/lib/working-paper-export");
      await exportWorkingPaper(workingPaper);
      toast.success("Kertas kerja berhasil diunduh.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengunduh kertas kerja.",
      );
    } finally {
      setExportingPaperId(null);
    }
  }, []);

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
  }, [fetchWorkingPapers, token]);

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
    const normalizedSearch = debouncedSearch.trim();
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
    debouncedSearch,
    limit,
    page,
    pathname,
    router,
    searchParams,
    startTransition,
    statusFilter,
  ]);

  const showInitialLoading = loading && papers.length === 0;

  return (
    <PageStack>
      <CollectionPageHeader title="Kertas Kerja" />

      {error ? (
        <CollectionErrorState
          title="Gagal Memuat Data"
          message={error}
          onReload={() => window.location.reload()}
        />
      ) : null}

      <div className="space-y-4">
      <CollectionToolbar
        className="w-full"
        leading={
          <WorkingPaperFiltersToolbar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            searchPlaceholder="Cari judul kertas kerja..."
            searchAriaLabel="Cari judul kertas kerja"
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
            assessmentCycleOptions={assessmentCycleOptions}
            createdAtFilter={createdAtFilter}
            onCreatedAtFilterChange={(value) => {
              setCreatedAtFilter(value);
              setPage(1);
            }}
            onReset={handleResetFilters}
          />
        }
        actions={
          <AccentButton
            onClick={() => {
              setSelectedPeriod(
                getSelectableMonitoringCyclesForDate()[0]?.value ??
                  shiftAssessmentCycle(currentAssessmentCycle(), -1),
              );
              setCreateModalOpen(true);
            }}
          >
            <Plus className="size-3.5" strokeWidth={2.5} />
            Buat Kertas Kerja
          </AccentButton>
        }
      />

        <CollectionTableCard>

          {showInitialLoading ? (
            <CollectionLoadingState message="Memuat daftar kertas kerja..." />
          ) : papers.length === 0 ? (
            <CollectionEmptyState
              title="Belum ada kertas kerja yang sesuai filter"
              description="Ubah filter pencarian atau tab status untuk melihat data lain."
            />
          ) : (
            <>
              <div className="space-y-2 p-4 md:hidden">
                {papers.map((paper) => {
                  const { totalSignatories, progressPercent, progressText } =
                    getWorkingPaperSigningProgress(paper);
                  const createdDate = formatWorkingPaperDate(paper.created_at, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <WorkingPaperMobileCard
                      key={paper.id}
                      paper={paper}
                      totalSignatories={totalSignatories}
                      progressPercent={progressPercent}
                      progressText={progressText}
                      createdDate={createdDate}
                    />
                  );
                })}
              </div>

              <div className="hidden md:block">
                <Table className="min-w-[980px] table-fixed">
                  <colgroup>
                    <col className="w-[32%]" />
                    <col className="w-[14%]" />
                    <col className="w-[14%]" />
                    <col className="w-[10%]" />
                    <col className="w-[20%]" />
                    <col className="w-[14%]" />
                  </colgroup>
                  <CollectionTableHeader density="compact">
                    <CollectionTableHeaderRow>
                      <CollectionTableHead className="px-24">
                        Judul
                      </CollectionTableHead>
                      <CollectionTableHead >
                        Periode
                      </CollectionTableHead>
                      <CollectionTableHead >
                        Status
                      </CollectionTableHead>
                      <CollectionTableHead className="text-right">
                        Jumlah risiko
                      </CollectionTableHead>
                      <CollectionTableHead >
                        Progres TTE
                      </CollectionTableHead>
                      <CollectionTableHead >
                        Dibuat
                      </CollectionTableHead>
                    </CollectionTableHeaderRow>
                  </CollectionTableHeader>
                  <TableBody>
                    {papers.map((paper) => {
                      const createdDate = formatWorkingPaperDate(
                        paper.created_at,
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      );

                      return (
                        <TableRow
                          key={paper.id}
                          className="hover:bg-muted/50"
                        >
                          <TableCell className="min-w-[320px] px-24 align-middle">
                            <Link
                              href={`/risk/working-papers/${paper.id}`}
                              className="block max-w-full whitespace-normal break-words text-sm font-medium leading-relaxed text-foreground transition-colors hover:text-primary"
                              title={paper.title}
                            >
                              {paper.title || "Tanpa Judul"}
                            </Link>
                            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                              {paper.code}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap align-middle">
                            {paper.assessment_cycle || "-"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap align-middle">
                            <Badge variant={toBadgeVariant(statusTones[paper.status])}
                              className={getStatusBadgeClassName(statusTones[paper.status])}
                            >
                              {statusLabels[paper.status] || paper.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right align-middle tabular-nums">
                            {paper.risks?.length || 0}
                          </TableCell>
                          <TableCell className="min-w-[180px] align-middle">
                            <WorkingPaperDesktopSigningProgress
                              signatories={paper.signatories}
                            />
                          </TableCell>
                          <TableCell className="whitespace-nowrap align-middle">
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
          <CollectionPagination
            itemLabel="kertas kerja"
            page={page}
            pageSize={limit}
            total={total}
            disabled={loading || isPending}
            onPageChange={setPage}
            onPageSizeChange={(nextLimit) => {
              setLimit(nextLimit);
              setPage(1);
            }}
          />
      </CollectionTableCard>
      </div>
      <WorkingPaperProgressCollapsible
        workingPapers={papers}
        loading={loading}
        exportingPaperId={exportingPaperId}
        onExport={(workingPaper) => void handleExport(workingPaper)}
      />
      <WorkingPaperCreateDialog
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        selectedPeriod={selectedPeriod}
        onSelectedPeriodChange={setSelectedPeriod}
        periodOptions={periodOptions}
      />
    </PageStack>
  );
}
