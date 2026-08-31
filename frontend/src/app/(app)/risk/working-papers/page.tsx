"use client";

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { listWorkingPapers } from "@/lib/api/working-papers";
import type { WorkingPaper, WorkingPaperStatus } from "@/types/working-paper";
import { WorkingPaperProgressCollapsible } from "./_components/working-paper-progress-collapsible";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { ChevronRight, Plus } from "@/components/ui/icons";
import {
  currentAssessmentCycle,
  shiftAssessmentCycle,
} from "@/lib/risk-cycle-options";
import {
  CollectionEmptyState,
  CollectionErrorState,
  CollectionFilterInput,
  CollectionFilterTrigger,
  CollectionLoadingState,
  CollectionPagination,
  CollectionPageHeader,
  CollectionSearchField,
  CollectionStatusBadge,
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
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <CollectionFilterTrigger />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[22rem] rounded-xl p-4"
      >
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium">Filter Kertas Kerja</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Atur status, siklus asesmen, dan tanggal dibuat.
            </p>
          </div>

          <div className="space-y-4">
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
                <SelectTrigger className="h-10 rounded-lg border border-input bg-card text-sm">
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
              <CollectionFilterInput
                value={assessmentCycleFilter}
                onChange={(event) =>
                  onAssessmentCycleFilterChange(event.target.value)
                }
                placeholder="Filter siklus asesmen"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Tanggal Dibuat
              </Label>
              <CollectionFilterInput
                type="date"
                value={createdAtFilter}
                onChange={(event) => onCreatedAtFilterChange(event.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onReset}
              className="shadow-none"
            >
              Reset
            </Button>
            <AccentButton
              type="button"
              size="md"
              onClick={() => onOpenChange(false)}
            >
              Terapkan
            </AccentButton>
          </div>
        </div>
      </PopoverContent>
    </Popover>
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
    <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
      <CollectionSearchField
        containerClassName="w-full sm:w-80 sm:flex-none"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchAriaLabel}
      />

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
    <div className="rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <WorkingPaperCode code={paper.code} />
            <CollectionStatusBadge
              tone={statusTones[paper.status]}
            >
              {statusLabels[paper.status] || paper.status}
            </CollectionStatusBadge>
          </div>
          <Link
            href={`/risk/working-papers/${paper.id}`}
            className="mt-1 line-clamp-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
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
    </div>
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
      countLabel="TTE"
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
  const deferredAssessmentCycleFilter = useDebouncedValue(
    assessmentCycleFilter,
    500,
  );

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("");

  const periodOptions: { value: string; label: string }[] = (() => {
    const currentCycle = currentAssessmentCycle();
    return [-1, 0, 1].map((delta) => {
      const value = shiftAssessmentCycle(currentCycle, delta);
      return { value, label: value };
    });
  })();

  const handleResetFilters = () => {
    setStatusFilter("all");
    setSearch("");
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

      <WorkingPaperProgressCollapsible
        workingPapers={papers}
        loading={loading}
      />

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
        }
        actions={
          <AccentButton
            onClick={() => {
              setSelectedPeriod(currentAssessmentCycle());
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
                      <CollectionTableHead className="pl-4 pr-3">
                        Judul
                      </CollectionTableHead>
                      <CollectionTableHead className="px-3">
                        Periode
                      </CollectionTableHead>
                      <CollectionTableHead className="px-3">
                        Status
                      </CollectionTableHead>
                      <CollectionTableHead className="px-3 text-center">
                        Risiko
                      </CollectionTableHead>
                      <CollectionTableHead className="px-3">
                        Progres TTE
                      </CollectionTableHead>
                      <CollectionTableHead className="px-3">
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
                          className="border-0 hover:bg-muted/50"
                        >
                          <TableCell className="min-w-[320px] py-2 pl-4 pr-3 align-middle">
                            <Link
                              href={`/risk/working-papers/${paper.id}`}
                              className="block text-sm font-semibold leading-relaxed text-foreground transition-colors hover:text-primary"
                              title={paper.title}
                            >
                              {paper.title || "Tanpa Judul"}
                            </Link>
                            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                              {paper.code}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-3 py-2 align-middle text-sm text-muted-foreground">
                            {paper.assessment_cycle || "-"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-3 py-2 align-middle">
                            <CollectionStatusBadge
                              tone={statusTones[paper.status]}
                            >
                              {statusLabels[paper.status] || paper.status}
                            </CollectionStatusBadge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-3 py-2 text-center align-middle text-sm font-medium tabular-nums text-foreground">
                            {paper.risks?.length || 0}
                          </TableCell>
                          <TableCell className="min-w-[180px] px-3 py-2 align-middle">
                            <WorkingPaperDesktopSigningProgress
                              signatories={paper.signatories}
                            />
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
