"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Risk } from "@/types/risk";
import { RiskExportButton } from "@/components/shared/design-system/actions/risk-export-button";
import {
  archiveRisk,
  listRiskRegister,
  restoreRisk,
  type RiskRegisterCategoryFilter,
  type RiskRegisterLifecycleFilter,
  type RiskRegisterListItem,
  type RiskRegisterStatusFilter,
} from "@/lib/api/risk-register";
import { startMonitoring } from "@/lib/api/risk-monitoring";
import { useAuth } from "@/contexts/auth-context";
import { isReadOnlyForOrg } from "@/lib/auth-helpers";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { getStatusBadgeClassName, toBadgeVariant, type StatusTone } from "@/lib/badge-variant";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AccentButton,
  ActionButton,
  ActionIconButton,
  CollectionPageHeader,
  CollectionSearchField,
  CollectionToolbar,
  DestructiveButton,
  EmptyStateIllustration,
  IllustratedEmptyState,
  PopoverSelectField,
  PageStack,
} from "@/components/shared/design-system";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  currentMonitoringCycle,
  getAssessmentCycleFilterOptions,
  getDefaultMonitoringCycle,
  getSelectableMonitoringCyclesForDate,
  isCurrentMonitoringCycleAvailable,
  isMonitoringCycleApplicable,
  isMonitoringCycleAfterPreviousEligible,
  shiftMonitoringCycle,
} from "@/lib/risk-cycle-options";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  riskCategoryLabels,
  getRiskLevelFromNilai,
  getRiskLevelDisplayLabel,
  levelToColor,
} from "@/lib/risk";
import {
  buildRiskRegisterQueryString,
  parseRiskRegisterQueryState,
  shouldReplaceRiskRegisterUrl,
} from "@/lib/risk-register-query";
import {
  formatMonitoringNilai,
  getMonitoringCycleBadgeStatus,
} from "@/lib/risk-register-monitoring";
import { RegisterMonitoringInsights } from "./_components/register-monitoring-insights";
import {
  CollectionPagination,
  CollectionErrorState,
  CollectionDialogCancel,
  CollectionLoadingState,
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  MonitoringTransactionProgress,
  MonitoringCycleSelect,
  RiskCategoryIndicator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/shared/design-system";
import {
  Plus,
  Trash2,
  Upload,
  Archive,
  RefreshCcw,
  RotateCcw,
} from "@/components/shared/icons";

import { readMotionDuration } from "@/lib/motion-timing";
import { RegisterSortIcon } from "@/components/shared/design-system/motion/register-motion";

const registerStatusTone: Record<string, StatusTone> = {
  draft: "neutral",
  final: "success",
  finalized: "success",
  archived: "neutral",
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  final: "Final",
  finalized: "Final",
};

function getRiskRegisterPeriodOptions(selectedCycle: string) {
  return getAssessmentCycleFilterOptions(new Date(), selectedCycle);
}

type RiskListItem = RiskRegisterListItem;

function getRiskMonitoringStatusForCycle(
  risk: RiskListItem | null,
  cycle: string,
  currentCycle: string,
) {
  if (!risk) return null;

  const [cycleYear, cycleQuarter] = cycle.split("-Q");
  const [currentYear] = currentCycle.split("-Q");
  if (cycle === shiftMonitoringCycle(currentCycle, -1) && cycleYear !== currentYear) {
    return risk.previousQuarterMonitoringStatus ?? null;
  }
  if (cycleYear !== currentYear) return null;

  const sameYearStatuses = {
    "1": risk.semesterMonitoring?.q1,
    "2": risk.semesterMonitoring?.q2,
    "3": risk.semesterMonitoring?.q3,
    "4": risk.semesterMonitoring?.q4,
  };
  return sameYearStatuses[cycleQuarter as keyof typeof sameYearStatuses] ?? null;
}

type RiskRegisterFilterToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchAriaLabel: string;
  assessmentCycleFilter: string;
  onAssessmentCycleFilterChange: (value: string) => void;
  statusFilter: RiskRegisterStatusFilter;
  onStatusFilterChange: (value: RiskRegisterStatusFilter) => void;
  categoryFilter: RiskRegisterCategoryFilter;
  onCategoryFilterChange: (value: RiskRegisterCategoryFilter) => void;
  assessmentCycleOptions: { value: string; label: string }[];
};

function RiskRegisterFilterToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  assessmentCycleFilter,
  onAssessmentCycleFilterChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  assessmentCycleOptions,
}: RiskRegisterFilterToolbarProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <CollectionSearchField
        containerClassName="w-full sm:w-64 sm:flex-none"
        className="placeholder:text-tertiary-foreground"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchAriaLabel}
      />
      <div className="w-full sm:w-fit">
        <PopoverSelectField
          fitContent
          value={statusFilter}
          onValueChange={(value) =>
            onStatusFilterChange(value as RiskRegisterStatusFilter)
          }
          options={[
            { value: "all", label: "Semua Status" },
            { value: "draft", label: "Draf Risiko" },
            { value: "final", label: "Final" },
          ]}
          placeholder="Status"
          ariaLabel="Filter status risiko"
          contentClassName="register-motion-menu"
          triggerClassName="h-8 rounded-lg bg-card text-sm"
        />
      </div>

      <div className="w-full sm:w-fit">
        <PopoverSelectField
          fitContent
          value={assessmentCycleFilter || "all"}
          onValueChange={(value) =>
            onAssessmentCycleFilterChange(value === "all" ? "" : value)
          }
          options={assessmentCycleOptions}
          placeholder="Semua Periode"
          ariaLabel="Filter periode kuartal"
          side="bottom"
          avoidCollisions={false}
          contentClassName="register-motion-menu"
          triggerClassName="h-8 rounded-lg bg-card text-sm"
        />
      </div>

      <div className="w-full sm:w-fit">
        <PopoverSelectField
          fitContent
          value={categoryFilter}
          onValueChange={(value) =>
            onCategoryFilterChange(value as RiskRegisterCategoryFilter)
          }
          options={[
            { value: "all", label: "Semua Kategori" },
            { value: "kebijakan", label: riskCategoryLabels.kebijakan },
            { value: "reputasi", label: riskCategoryLabels.reputasi },
            { value: "fraud_korupsi", label: riskCategoryLabels.fraud_korupsi },
            { value: "legal", label: riskCategoryLabels.legal },
            { value: "kepatuhan", label: riskCategoryLabels.kepatuhan },
            { value: "operasional", label: riskCategoryLabels.operasional },
          ]}
          placeholder="Kategori"
          ariaLabel="Filter kategori risiko"
          contentClassName="register-motion-menu"
          triggerClassName="h-8 rounded-lg bg-card text-sm"
        />
      </div>
    </div>
  );
}

function RiskRowActions({
  risk,
  isReadOnly,
  onContinueMonitoring,
  onStartMonitoring,
  onArchive,
  onRestore,
  onDeleteDraft,
}: {
  risk: RiskListItem;
  isReadOnly: boolean;
  onContinueMonitoring?: () => void;
  onStartMonitoring?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onDeleteDraft?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ActionIconButton
          className="text-muted-foreground"
          aria-label={`Aksi risiko ${risk.code || risk.title || risk.id}`}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="register-motion-menu w-52">
        {onContinueMonitoring && (
          <DropdownMenuItem onClick={onContinueMonitoring}>
            <RefreshCcw className="size-3.5" />
            Lanjutkan Pemantauan
          </DropdownMenuItem>
        )}
        {onStartMonitoring && (
          <DropdownMenuItem onClick={onStartMonitoring}>
            <RefreshCcw className="size-3.5" />
            Mulai Pemantauan
          </DropdownMenuItem>
        )}
        {onArchive && (
          <DropdownMenuItem onClick={onArchive}>
            <Archive className="size-3.5" />
            Arsipkan
          </DropdownMenuItem>
        )}
        {onRestore && (
          <DropdownMenuItem onClick={onRestore}>
            <RotateCcw className="size-3.5" />
            Pulihkan
          </DropdownMenuItem>
        )}
        {onDeleteDraft && !isReadOnly && (
          <DropdownMenuItem variant="destructive" onClick={onDeleteDraft}>
            <Trash2 className="size-3.5" />
            Hapus Draft
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function RiskRegisterPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const isApplyingSearchParamsRef = useRef(false);
  const [risks, setRisks] = useState<RiskListItem[]>([]);
  const [drafts, setDrafts] = useState<RiskListItem[]>([]);
  const [actionRisk, setActionRisk] = useState<RiskListItem | null>(null);
  const [archiveReasonInvalid, setArchiveReasonInvalid] = useState(false);
  const archiveReasonRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(
    () =>
      parseRiskRegisterQueryState(new URLSearchParams(searchParams.toString()))
        .search,
  );
  const [statusFilter, setStatusFilter] = useState<RiskRegisterStatusFilter>(
    () =>
      parseRiskRegisterQueryState(new URLSearchParams(searchParams.toString()))
        .statusFilter,
  );
  const [lifecycleFilter, setLifecycleFilter] =
    useState<RiskRegisterLifecycleFilter>(
      () =>
        parseRiskRegisterQueryState(
          new URLSearchParams(searchParams.toString()),
        ).lifecycleFilter,
    );
  const [categoryFilter, setCategoryFilter] =
    useState<RiskRegisterCategoryFilter>(
      () =>
        parseRiskRegisterQueryState(
          new URLSearchParams(searchParams.toString()),
        ).categoryFilter,
    );
  const [assessmentCycleFilter, setAssessmentCycleFilter] = useState(
    () =>
      parseRiskRegisterQueryState(new URLSearchParams(searchParams.toString()))
        .assessmentCycleFilter,
  );
  const assessmentCycleOptions = useMemo(
    () => getRiskRegisterPeriodOptions(assessmentCycleFilter),
    [assessmentCycleFilter],
  );
  const [createdAtFilter, setCreatedAtFilter] = useState(
    () =>
      parseRiskRegisterQueryState(new URLSearchParams(searchParams.toString()))
        .createdAtFilter,
  );
  const [page, setPage] = useState(
    () =>
      parseRiskRegisterQueryState(new URLSearchParams(searchParams.toString()))
        .page,
  );
  const [limit, setLimit] = useState(
    () =>
      parseRiskRegisterQueryState(new URLSearchParams(searchParams.toString()))
        .limit,
  );
  const [registerTotal, setRegisterTotal] = useState(0);
  const [exporting, setExporting] = useState(false);
  const exportInProgressRef = useRef(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedRiskForReassessment, setSelectedRiskForReassessment] =
    useState<RiskListItem | null>(null);
  const [selectedAssessmentCycle, setSelectedAssessmentCycle] = useState(
    () => getDefaultMonitoringCycle(),
  );
  const selectableMonitoringCycles = useMemo(
    () => getSelectableMonitoringCyclesForDate(),
    [],
  );
  const monitoringCycleOptions = useMemo(() => {
    const currentCycle = currentMonitoringCycle();
    return selectableMonitoringCycles.map((cycle) => ({
      ...cycle,
      status: getMonitoringCycleBadgeStatus(
        getRiskMonitoringStatusForCycle(
          selectedRiskForReassessment,
          cycle.value,
          currentCycle,
        ),
        cycle.value === currentCycle,
        isMonitoringCycleApplicable(
          cycle.value,
          selectedRiskForReassessment?.assessmentCycle,
        ),
      ),
    }));
  }, [selectableMonitoringCycles, selectedRiskForReassessment]);
  const selectedMonitoringCycleOption = monitoringCycleOptions.find(
    (cycle) => cycle.value === selectedAssessmentCycle,
  );
  const currentCycle = currentMonitoringCycle();
  const previousCycle = shiftMonitoringCycle(currentCycle, -1);
  const selectedPreviousCycleStatus = getRiskMonitoringStatusForCycle(
    selectedRiskForReassessment,
    previousCycle,
    currentCycle,
  );
  const canStartCurrentCycle = isMonitoringCycleAfterPreviousEligible(
    currentCycle,
    selectedPreviousCycleStatus,
    selectedRiskForReassessment?.assessmentCycle,
    true,
  );
  const [riskToArchive, setRiskToArchive] = useState<RiskListItem | null>(null);
  const [archiveReason, setArchiveReason] = useState("");

  const handleRegisterSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleRegisterAssessmentCycleChange = (value: string) => {
    setAssessmentCycleFilter(value);
    setPage(1);
  };

  const handleRegisterStatusChange = (value: RiskRegisterStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleRegisterCategoryChange = (value: RiskRegisterCategoryFilter) => {
    setCategoryFilter(value);
    setPage(1);
  };
  const [archiveNote, setArchiveNote] = useState("");
  const [riskToRestore, setRiskToRestore] = useState<RiskListItem | null>(null);
  const [riskToDeleteDraft, setRiskToDeleteDraft] =
    useState<RiskListItem | null>(null);
  const [sortBy, setSortBy] = useState<string>(
    () =>
      parseRiskRegisterQueryState(new URLSearchParams(searchParams.toString()))
        .sortBy,
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    () =>
      parseRiskRegisterQueryState(new URLSearchParams(searchParams.toString()))
        .sortOrder,
  );

  const deferredSearch = useDeferredValue(search);
  const deferredAssessmentCycleFilter = useDeferredValue(assessmentCycleFilter);

  const refreshRegisterData = async (
    activeToken: string,
    queryOverrides?: {
      q?: string;
      assessmentCycle?: string;
      createdAt?: string;
    },
  ) => {
    const normalizedSearch = (queryOverrides?.q ?? search).trim();
    const normalizedAssessmentCycle = (
      queryOverrides?.assessmentCycle ?? assessmentCycleFilter
    ).trim();
    const normalizedCreatedAt = (
      queryOverrides?.createdAt ?? createdAtFilter
    ).trim();

    const registerStatus =
      statusFilter === "all"
        ? undefined
        : statusFilter;

    const [allRisksResponse, draftRisks] = await Promise.all([
      listRiskRegister(activeToken, {
        q: normalizedSearch || undefined,
        lifecycle: lifecycleFilter,
        status: registerStatus,
        category: categoryFilter === "all" ? undefined : categoryFilter,
        assessment_cycle: normalizedAssessmentCycle || undefined,
        created_at: normalizedCreatedAt || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        limit,
      }),
      api.get<RiskListItem[]>("/risks?status=draft", activeToken),
    ]);

    setDrafts(draftRisks);
    setRisks(allRisksResponse.data ?? []);
    setRegisterTotal(allRisksResponse.total ?? 0);
    setPage(allRisksResponse.page ?? page);
    setLimit(allRisksResponse.limit ?? limit);

  };

  const handleExport = async () => {
    if (!token || exportInProgressRef.current) return;
    exportInProgressRef.current = true;
    setExporting(true);
    // Capture filters before awaiting so pagination and detail requests use one scope.
    const filters = {
      q: search.trim() || undefined,
      lifecycle: lifecycleFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      category: categoryFilter === "all" ? undefined : categoryFilter,
      assessment_cycle: assessmentCycleFilter.trim() || undefined,
      created_at: createdAtFilter.trim() || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
      limit: 100,
    };
    try {
      const { collectRiskExportItems, toRiskProfileExportRow } = await import("@/lib/risk-profile-export");
      const items = await collectRiskExportItems((page) => listRiskRegister(token, { ...filters, page }));
      if (!items.length) {
        toast.info("Tidak ada risiko yang sesuai filter untuk diekspor.");
        return;
      }
      // The paginated list omits mitigation owners and priority; load full details in bounded batches.
      const details: Risk[] = [];
      for (let offset = 0; offset < items.length; offset += 6) {
        details.push(...await Promise.all(items.slice(offset, offset + 6).map(async (item) => {
          const detail = await api.get<Risk>(`/risks/${item.id}`, token);
          return { ...detail, orgName: detail.orgName ?? item.orgName };
        })));
      }
      const { exportRiskProfile } = await import("@/lib/working-paper-export");
      await exportRiskProfile(details.map(toRiskProfileExportRow), assessmentCycleFilter);
      toast.success(`Excel berisi ${details.length} risiko berhasil diunduh.`);
    } catch {
      toast.error("Ekspor risiko gagal. Muat ulang data dan coba lagi.");
    } finally {
      exportInProgressRef.current = false;
      setExporting(false);
    }
  };

  useEffect(() => {
    const nextState = parseRiskRegisterQueryState(
      new URLSearchParams(searchParams.toString()),
    );

    isApplyingSearchParamsRef.current = true;

    setSearch((current) =>
      current === nextState.search ? current : nextState.search,
    );
    setStatusFilter((current) =>
      current === nextState.statusFilter ? current : nextState.statusFilter,
    );
    setLifecycleFilter((current) =>
      current === nextState.lifecycleFilter
        ? current
        : nextState.lifecycleFilter,
    );
    setCategoryFilter((current) =>
      current === nextState.categoryFilter ? current : nextState.categoryFilter,
    );
    setAssessmentCycleFilter((current) =>
      current === nextState.assessmentCycleFilter
        ? current
        : nextState.assessmentCycleFilter,
    );
    setCreatedAtFilter((current) =>
      current === nextState.createdAtFilter
        ? current
        : nextState.createdAtFilter,
    );
    setPage((current) =>
      current === nextState.page ? current : nextState.page,
    );
    setLimit((current) =>
      current === nextState.limit ? current : nextState.limit,
    );
    setSortBy((current) =>
      current === nextState.sortBy ? current : nextState.sortBy,
    );
    setSortOrder((current) =>
      current === nextState.sortOrder ? current : nextState.sortOrder,
    );
  }, [searchParams]);

  useEffect(() => {
    const nextState = {
      search,
      lifecycleFilter,
      statusFilter,
      categoryFilter,
      assessmentCycleFilter,
      createdAtFilter,
      page,
      limit,
      sortBy,
      sortOrder,
    };
    const currentSearchParams = new URLSearchParams(searchParams.toString());

    if (
      !shouldReplaceRiskRegisterUrl({
        hasPendingUrlStateSync: isApplyingSearchParamsRef.current,
        currentSearchParams,
        nextState,
      })
    ) {
      isApplyingSearchParamsRef.current = false;
      return;
    }

    isApplyingSearchParamsRef.current = false;
    const nextQueryString = buildRiskRegisterQueryString(nextState);
    const nextUrl = nextQueryString
      ? `${pathname}?${nextQueryString}`
      : pathname;

    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }, [
    assessmentCycleFilter,
    categoryFilter,
    createdAtFilter,
    limit,
    lifecycleFilter,
    page,
    pathname,
    router,
    search,
    searchParams,
    startTransition,
    statusFilter,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setError(null);
        setLoading(true);

        await refreshRegisterData(token, {
          q: deferredSearch,
          assessmentCycle: deferredAssessmentCycleFilter,
          createdAt: createdAtFilter,
        });
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Gagal memuat data risiko. Silakan coba lagi.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [
    token,
    lifecycleFilter,
    statusFilter,
    categoryFilter,
    createdAtFilter,
    deferredSearch,
    deferredAssessmentCycleFilter,
    page,
    limit,
    sortBy,
    sortOrder,
  ]);


  useEffect(() => {
    if (riskToArchive) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const closeMs = readMotionDuration(document.documentElement, "--modal-close-dur", 150);
    const timer = window.setTimeout(() => {
      setArchiveReason("");
      setArchiveNote("");
      setArchiveReasonInvalid(false);
    }, reduced ? 0 : closeMs);
    return () => window.clearTimeout(timer);
  }, [riskToArchive]);

  const handleArchiveRisk = async () => {
    if (!token || !riskToArchive) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }
    if (!archiveReason.trim()) {
      setArchiveReasonInvalid(true);
      const input = archiveReasonRef.current;
      if (input) {
        input.classList.remove("is-shaking");
        void input.offsetWidth;
        input.classList.add("is-shaking");
        input.focus();
      }
      return;
    }

    const current = riskToArchive;
    setRiskToArchive(null);

    toast.promise(
      (async () => {
        await archiveRisk(token, current.id, {
          reason: archiveReason.trim(),
          note: archiveNote.trim() || undefined,
        });
        await refreshRegisterData(token);
      })(),
      {
        loading: "Mengarsipkan risiko...",
        success: "Risiko berhasil diarsipkan.",
        error: (err) =>
          err instanceof Error
            ? err.message
            : "Risiko belum berhasil diarsipkan.",
      },
    );
  };

  const handleRestoreRisk = async (risk: RiskListItem) => {
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }

    toast.promise(
      (async () => {
        await restoreRisk(token, risk.id);
        await refreshRegisterData(token);
      })(),
      {
        loading: "Memulihkan risiko...",
        success: "Risiko berhasil dipulihkan.",
        error: (err) =>
          err instanceof Error
            ? err.message
            : "Risiko belum berhasil dipulihkan.",
      },
    );
  };

  const handleDeleteDraft = async () => {
    if (!token || !riskToDeleteDraft) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }

    const current = riskToDeleteDraft;
    setRiskToDeleteDraft(null);

    toast.promise(
      (async () => {
        await api.delete(`/risks/${current.id}`, undefined, token);
        await refreshRegisterData(token);
      })(),
      {
        loading: "Menghapus draft...",
        success: "Draft berhasil dihapus.",
        error: (err) =>
          err instanceof Error
            ? err.message
            : "Draft belum berhasil dihapus.",
      },
    );
  };

  const handleOpenConfirmDialog = (risk: RiskListItem) => {
    setSelectedRiskForReassessment(risk);
    const currentCycle = currentMonitoringCycle();
    const previousCycle = shiftMonitoringCycle(currentCycle, -1);
    const previousStatus = getRiskMonitoringStatusForCycle(
      risk,
      previousCycle,
      currentCycle,
    );
    const currentStatus = getRiskMonitoringStatusForCycle(
      risk,
      currentCycle,
      currentCycle,
    );
    const ongoingCycle =
      currentStatus === "draft"
        ? currentCycle
        : previousStatus === "draft"
          ? previousCycle
          : null;
    setSelectedAssessmentCycle(
      ongoingCycle &&
        (ongoingCycle !== currentCycle ||
          isCurrentMonitoringCycleAvailable())
        ? ongoingCycle
        : getDefaultMonitoringCycle(
            currentCycle,
            previousStatus,
            risk.assessmentCycle,
          ),
    );
    setConfirmDialogOpen(true);
  };

  const handleCreateReassessment = async () => {
    if (!token || !selectedRiskForReassessment) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }

    const currentRisk = selectedRiskForReassessment;
    setConfirmDialogOpen(false);

    toast.promise(
      (async () => {
        const result = await startMonitoring(
          token,
          currentRisk.id,
          selectedAssessmentCycle,
        );
        await refreshRegisterData(token);

        router.push(
          result.redirectUrl || `/risk/monitoring/${result.monitoring.id}`,
        );

        return result;
      })(),
      {
        loading: `Memulai transaksi pemantauan ${selectedAssessmentCycle}...`,
        success: (result) =>
          result.existingDraft
            ? `Melanjutkan transaksi pemantauan ${selectedAssessmentCycle} yang sudah ada.`
            : `Transaksi pemantauan ${selectedAssessmentCycle} berhasil dibuat.`,
        error: (err) =>
          err instanceof Error
            ? err.message
            : "Transaksi pemantauan belum berhasil dibuat.",
      },
    );
  };

  useEffect(() => {
    const smoothElements = document.querySelectorAll("[data-smooth]");
    smoothElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const { width, height } = htmlEl.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      const rawRadius = htmlEl.getAttribute("data-smooth-radius");
      const radius = rawRadius
        ? Math.min(parseInt(rawRadius, 10), height / 2)
        : height / 2;
      const d = appleCornerPath({ width, height, radius, smoothing: 60 });
      htmlEl.style.clipPath = `path("${d}")`;
      htmlEl.style.borderRadius = "0";
    });
  }, []);

  if (
    loading &&
    risks.length === 0 &&
    drafts.length === 0
  ) {
    return (
      <PageStack data-register-motion data-busy={loading || isPending}>
        <div data-register-state><CollectionLoadingState message="Memuat daftar risiko..." /></div>
      </PageStack>
    );
  }

  if (error) {
    return (
      <PageStack data-register-motion data-busy={loading || isPending}>
        <div data-register-state><CollectionErrorState
          title="Gagal Memuat Data"
          message={error}
          onReload={() => window.location.reload()}
        /></div>
      </PageStack>
    );
  }
  const scoreAriaSort =
    sortBy === "nilai"
      ? sortOrder === "asc"
        ? "ascending"
        : "descending"
      : "none";
  const hasAppliedFilters =
    Boolean(search.trim()) ||
    statusFilter !== "all" ||
    lifecycleFilter !== "active" ||
    categoryFilter !== "all" ||
    Boolean(assessmentCycleFilter.trim()) ||
    Boolean(createdAtFilter.trim());
  return (
    <PageStack data-register-motion data-busy={loading || isPending}>
      <CollectionPageHeader title="Risiko" />
      <RegisterMonitoringInsights refreshKey={risks} />
      <div className="space-y-4">
        <CollectionToolbar
          leading={
            <RiskRegisterFilterToolbar
              search={search}
              onSearchChange={handleRegisterSearchChange}
              searchPlaceholder="Cari risiko..."
              searchAriaLabel="Cari risiko"
              assessmentCycleFilter={assessmentCycleFilter}
              onAssessmentCycleFilterChange={handleRegisterAssessmentCycleChange}
              assessmentCycleOptions={assessmentCycleOptions}
              statusFilter={statusFilter}
              onStatusFilterChange={handleRegisterStatusChange}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={handleRegisterCategoryChange}
            />
          }
          actions={
            <>
              <RiskExportButton
                loading={exporting}
                disabled={loading || !!error || registerTotal === 0 || isPending || search !== deferredSearch || assessmentCycleFilter !== deferredAssessmentCycleFilter}
                onClick={() => void handleExport()}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ActionButton variant="outline" className="gap-2">
                    <Upload className="size-3.5" strokeWidth={2.5} />
                    Import Risiko
                  </ActionButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="register-motion-menu w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/risk/register/bulk">Import file/template</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/risk/register/import-sop">
                      Ekstrak risiko dari SOP
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <AccentButton asChild>
                <Link href="/risk/register/new">
                  <Plus className="size-3.5" strokeWidth={2.5} />
                  Risiko Baru
                </Link>
              </AccentButton>
            </>
          }
        />
        <CollectionTableCard>
            <Table className="min-w-[1120px] table-fixed">
              <colgroup>
                <col style={{ width: "34%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "8%" }} />
              </colgroup>
              <CollectionTableHeader>
                <CollectionTableHeaderRow>
                  <CollectionTableHead>
                    Risiko
                  </CollectionTableHead>
                  <CollectionTableHead>
                    Kategori
                  </CollectionTableHead>
                  <CollectionTableHead
                    className="pe-6 text-right"
                    aria-sort={scoreAriaSort}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-end pr-0"
                      aria-label={`Urutkan berdasarkan skor, saat ini ${scoreAriaSort === "ascending" ? "menaik" : scoreAriaSort === "descending" ? "menurun" : "belum diurutkan"}`}
                      onClick={() => {
                        if (sortBy === "nilai") {
                          setSortOrder((prev) =>
                            prev === "asc" ? "desc" : "asc",
                          );
                        } else {
                          setSortBy("nilai");
                          setSortOrder("desc");
                        }
                      }}
                  >
                      {sortBy === "nilai" && <RegisterSortIcon descending={sortOrder === "desc"} />}
                      Skor
                    </Button>
                  </CollectionTableHead>
                  <CollectionTableHead className="pl-6">
                    Level
                  </CollectionTableHead>
                  <CollectionTableHead>
                    Status
                  </CollectionTableHead>
                  <CollectionTableHead>
                    Pemantauan
                  </CollectionTableHead>
                  <CollectionTableHead className="text-center">
                    <span className="sr-only">Aksi</span>
                  </CollectionTableHead>
                </CollectionTableHeaderRow>
              </CollectionTableHeader>
              <TableBody>
                {risks.length === 0 ? (
                  <TableRow>
                  <TableCell
                      colSpan={7}
                      className="text-left text-muted-foreground"
                    >
                      <div data-register-state className="flex min-h-24 flex-col items-center justify-center gap-1 py-6 text-center">
                        <EmptyStateIllustration className="mb-1 max-w-64" />
                        <p className="font-normal text-foreground">
                          {hasAppliedFilters
                            ? "Tidak ada risiko yang sesuai"
                            : "Belum ada risiko"}
                        </p>
                        <p className="max-w-lg text-xs text-muted-foreground">
                          {hasAppliedFilters
                            ? "Coba ubah kata kunci atau sesuaikan filter untuk menampilkan risiko lain."
                            : "Tambahkan risiko baru untuk memulai daftar risiko."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  risks.map((risk) => {
                    const isReadOnly = isReadOnlyForOrg(
                      user,
                      risk.organizationId || "",
                    );
                    const canArchive =
                      lifecycleFilter !== "archived" &&
                      risk.status === "final" &&
                      risk.isCurrent &&
                      !risk.archivedAt &&
                      !isReadOnly;
                    const canRestore = !!risk.archivedAt && !isReadOnly;
                    const canReassess =
                      risk.status === "final" &&
                      risk.isCurrent &&
                      !risk.archivedAt &&
                      !isReadOnly;
                    const statusText =
                      risk.archivedAt
                        ? "Diarsipkan"
                        : risk.status === "draft" &&
                            risk.versionNumber == 1
                          ? "Draft"
                          : statusLabel[risk.status || ""] ||
                            risk.status ||
                            "-";
                    const riskScore = risk.nilai ?? risk.inherentScore;
                    const riskLevel =
                      riskScore == null
                        ? null
                        : getRiskLevelFromNilai(riskScore);
                    const monitoringQuarters = [
                      { label: "Q1", status: risk.semesterMonitoring?.q1, score: risk.semesterMonitoring?.q1Nilai },
                      { label: "Q2", status: risk.semesterMonitoring?.q2, score: risk.semesterMonitoring?.q2Nilai },
                      { label: "Q3", status: risk.semesterMonitoring?.q3, score: risk.semesterMonitoring?.q3Nilai },
                      { label: "Q4", status: risk.semesterMonitoring?.q4, score: risk.semesterMonitoring?.q4Nilai },
                    ].filter((quarter) => quarter.status);
                    const latestFinalQuarter = [...monitoringQuarters]
                      .reverse()
                      .find((quarter) => quarter.status === "final" || quarter.status === "finalized");
                    const monitoringHistory = monitoringQuarters.map((quarter) => ({
                      ...quarter,
                      score:
                        quarter.score ??
                        (quarter.label === latestFinalQuarter?.label
                          ? risk.monitoringResultNilai
                          : undefined),
                    }));
                    return (
                      <TableRow
                        key={risk.id}
                      >
                        <TableCell>
                          <div className="flex min-w-0 flex-col items-start gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link
                                  href={`/risk/register/${risk.id}`}
                                  className="min-w-0 max-w-full truncate text-sm font-medium leading-5 text-foreground transition-colors hover:text-primary"
                                >
                                  {risk.title || "-"}
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent className="register-motion-tooltip" side="top" align="start">
                                {risk.title || "-"}
                              </TooltipContent>
                            </Tooltip>
                            <span className="font-sans text-sm leading-5 text-muted-foreground">
                              {risk.code || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <RiskCategoryIndicator category={risk.category} />
                        </TableCell>
                        <TableCell className="pe-6 text-right">
                          <span className="block text-right text-sm font-medium tabular-nums text-foreground">
                            {formatMonitoringNilai(
                              riskScore,
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="pl-6">
                          {riskLevel ? (
                            <Badge
                              variant="outline"
                              className={levelToColor(riskLevel)}
                            >
                              {getRiskLevelDisplayLabel(riskLevel)}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <Badge variant={toBadgeVariant(
                                risk.archivedAt
                                  ? registerStatusTone.archived
                                  : registerStatusTone[risk.status || ""] ||
                                    "neutral"
                              )} className={getStatusBadgeClassName(
                                risk.archivedAt
                                  ? registerStatusTone.archived
                                  : registerStatusTone[risk.status || ""] || "neutral"
                              )}
                            >
                              {statusText}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                role="group"
                                tabIndex={0}
                                aria-label={`Riwayat pemantauan ${new Date().getFullYear()}`}
                                className="inline-flex rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                              >
                                <MonitoringTransactionProgress
                                  data={risk.semesterMonitoring}
                                  showCount={false}
                                  nativeTitle={false}
                                />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              align="start"
                              sideOffset={8}
                              className="register-motion-tooltip block w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-sidebar p-1 text-foreground shadow-lg [&>span]:!hidden"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-3 px-2 pb-2 pt-2">
                                  <p className="text-xs font-medium uppercase text-tertiary-foreground">
                                    RIWAYAT PEMANTAUAN
                                  </p>
                                  <span className="shrink-0 text-xs tabular-nums text-tertiary-foreground">
                                    {new Date().getFullYear()}
                                  </span>
                                </div>
                                {monitoringQuarters.length === 0 ? (
                                  <IllustratedEmptyState
                                    title="Belum ada riwayat pemantauan tahun ini."
                                    size="compact"
                                    className="py-3"
                                  />
                                ) : (
                                  <div className="space-y-0.5 rounded-xl bg-card p-1.5">
                                    {monitoringHistory.map((quarter) => {
                                      const level =
                                        quarter.score == null
                                          ? undefined
                                          : getRiskLevelFromNilai(quarter.score);

                                      const scoreColor = level ? {
                                        sangat_rendah: "text-green-600 dark:text-green-400",
                                        rendah: "text-risk-low",
                                        sedang: "text-risk-medium",
                                        tinggi: "text-risk-high",
                                        sangat_tinggi: "text-risk-extreme",
                                      }[level] : "text-muted-foreground";

                                      return (
                                        <div
                                          key={quarter.label}
                                          className="flex min-h-10 items-center justify-between gap-4 px-1 py-1"
                                        >
                                          <span className="shrink-0 text-sm font-medium">
                                            {quarter.label}
                                          </span>
                                          {quarter.score != null && level ? (
                                            <span
                                              className={`min-w-10 shrink-0 text-end text-sm font-medium tabular-nums ${scoreColor}`}
                                              title={getRiskLevelDisplayLabel(level)}
                                            >
                                              {formatMonitoringNilai(quarter.score)}
                                            </span>
                                          ) : (
                                            <span className="min-w-10 shrink-0 text-end text-sm tabular-nums text-muted-foreground">
                                              -
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <RiskRowActions
                              risk={risk}
                              isReadOnly={isReadOnly}
                              onContinueMonitoring={
                                canReassess && risk.monitoringStatus === "draft"
                                  ? () => handleOpenConfirmDialog(risk)
                                  : undefined
                              }
                              onStartMonitoring={
                                canReassess && risk.monitoringStatus !== "draft"
                                  ? () => handleOpenConfirmDialog(risk)
                                  : undefined
                              }
                              onArchive={
                                canArchive
                                  ? () => { setArchiveReason(""); setArchiveNote(""); setArchiveReasonInvalid(false); setActionRisk(risk); setRiskToArchive(risk); }
                                  : undefined
                              }
                              onRestore={
                                canRestore
                                  ? () => { setActionRisk(risk); setRiskToRestore(risk); }
                                  : undefined
                              }
                              onDeleteDraft={
                                risk.status === "draft"
                                  ? () => { setActionRisk(risk); setRiskToDeleteDraft(risk); }
                                  : undefined
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                  </TableBody>
                </Table>
                <CollectionPagination
                  itemLabel="risiko"
                  page={page}
                  pageSize={limit}
                  total={registerTotal}
                  disabled={loading || isPending}
                  onPageChange={setPage}
                  onPageSizeChange={(nextLimit) => {
                    setLimit(nextLimit);
                    setPage(1);
                  }}
                />
        </CollectionTableCard>
      </div>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent className="register-motion-dialog max-w-lg no-scrollbar">
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pemantauan</AlertDialogTitle>
            <AlertDialogDescription>
              Periksa detail risiko dan pilih periode pemantauan. Kuartal
              berjalan tersedia mulai bulan ketiga.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  Kode
                </p>
                <p className="font-mono text-xs text-foreground">
                  {selectedRiskForReassessment?.code || "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  Skor
                </p>
                <p className="text-sm text-foreground">
                  {selectedRiskForReassessment
                    ? formatMonitoringNilai(
                        selectedRiskForReassessment.nilai ??
                          selectedRiskForReassessment.inherentScore,
                      )
                    : "-"}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                Judul
              </p>
              <p className="text-sm text-foreground">
                {selectedRiskForReassessment?.title || "-"}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm" htmlFor="monitoring-cycle">
                Periode Pemantauan
              </Label>
              <MonitoringCycleSelect
                contentClassName="register-motion-menu"
                id="monitoring-cycle"
                value={selectedAssessmentCycle}
                onValueChange={setSelectedAssessmentCycle}
                options={monitoringCycleOptions}
              />
            </div>
            {selectedAssessmentCycle === currentCycle ? (
              <Alert
                role="status"
                className="border-info-foreground/20 bg-info-foreground/5"
              >
                <AlertTitle className="text-info-foreground">
                  {selectedMonitoringCycleOption?.status === "completed"
                    ? "Pemantauan sudah selesai"
                    : !canStartCurrentCycle
                    ? `Selesaikan ${previousCycle} terlebih dahulu`
                    : selectedMonitoringCycleOption?.status === "in-progress"
                    ? "Pemantauan masih berjalan"
                    : "Kuartal masih berjalan"}
                </AlertTitle>
                <AlertDescription className="text-info-foreground">
                  {selectedMonitoringCycleOption?.status === "completed"
                    ? `Pemantauan ${selectedAssessmentCycle} sudah selesai. Pilih periode lain untuk memulai pemantauan baru.`
                    : !canStartCurrentCycle
                    ? `Pemantauan ${selectedAssessmentCycle} mengikuti urutan kuartal. Selesaikan pemantauan ${previousCycle} sebelum memulai periode ini.`
                    : selectedMonitoringCycleOption?.status === "in-progress"
                    ? `Pemantauan ${selectedAssessmentCycle} sudah dimulai. Anda akan melanjutkan catatan yang dapat diperbarui sampai kuartal berakhir.`
                    : `Pemantauan ${selectedAssessmentCycle} akan dimulai sebagai proses berjalan. Catatannya dapat diperbarui sampai kuartal berakhir.`}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              variant="outline"
              size="default"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="default"
              size="default"
              onClick={handleCreateReassessment}
              disabled={
                selectedMonitoringCycleOption?.status === "completed" ||
                (selectedAssessmentCycle === currentCycle &&
                  !canStartCurrentCycle)
              }
            >
              {selectedMonitoringCycleOption?.status === "in-progress"
                ? "Lanjutkan Pemantauan"
                : `Mulai Pemantauan ${selectedAssessmentCycle}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!riskToArchive}
        onOpenChange={(open) => {
          if (!open) {
            setRiskToArchive(null);
          }
        }}
      >
        <DialogContent className="register-motion-dialog max-w-lg no-scrollbar" showCloseButton={false}>
          <div className="flex min-h-0 flex-col gap-5">
            <DialogHeader>
              <DialogTitle>Arsipkan Risiko?</DialogTitle>
              <DialogDescription>
                Risiko akan dipindahkan dari daftar aktif. Isi alasan pengarsipan untuk melanjutkan.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  Risiko
                </p>
                <p className="text-sm font-medium text-foreground">
                  {(riskToArchive ?? actionRisk)?.title || "Tanpa judul"}
                </p>
                <p className="font-mono text-xs text-tertiary-foreground">
                  {(riskToArchive ?? actionRisk)?.code || (riskToArchive ?? actionRisk)?.id}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-sm" htmlFor="archive-reason">
                  Alasan utama arsip
                  <span aria-hidden="true" className="ml-0.5 text-destructive">
                    *
                  </span>
                </Label>
                <Input
                  data-motion-validation="manual"
                  id="archive-reason"
                  ref={archiveReasonRef}
                  aria-invalid={archiveReasonInvalid || undefined}
                  aria-describedby={archiveReasonInvalid ? "archive-reason-error" : undefined}
                  onAnimationEnd={() => archiveReasonRef.current?.classList.remove("is-shaking")}
                  value={archiveReason}
                  onChange={(event) => { setArchiveReason(event.target.value); setArchiveReasonInvalid(false); archiveReasonRef.current?.classList.remove("is-shaking"); }}
                  placeholder="Masukkan alasan pengarsipan"
                  className="t-input"
                  required
                />
                {archiveReasonInvalid && <p id="archive-reason-error" role="alert" className="text-sm text-destructive">Alasan arsip wajib diisi.</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-sm" htmlFor="archive-note">
                  Catatan tambahan
                </Label>
                <Textarea
                  id="archive-note"
                  value={archiveNote}
                  onChange={(event) => setArchiveNote(event.target.value)}
                  placeholder="Tambahkan konteks jika diperlukan"
                  className=""
                />
              </div>
            </div>
            <DialogFooter>
              <CollectionDialogCancel onClick={() => setRiskToArchive(null)}>
                Batal
              </CollectionDialogCancel>
              <AccentButton
                icon={<Archive className="size-3.5" />}
                onClick={handleArchiveRisk}
              >
                Arsipkan
              </AccentButton>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!riskToDeleteDraft}
        onOpenChange={(open) => !open && setRiskToDeleteDraft(null)}
      >
        <DialogContent className="register-motion-dialog">
          <DialogHeader>
            <DialogTitle>Hapus Draft Risiko?</DialogTitle>
            <DialogDescription>
              Draft yang dihapus tidak bisa dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-0.5 py-1 text-sm">
            <p className="font-medium">
              {(riskToDeleteDraft ?? actionRisk)?.title || "Tanpa judul"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {(riskToDeleteDraft ?? actionRisk)?.code || (riskToDeleteDraft ?? actionRisk)?.id}
            </p>
          </div>
          <DialogFooter>
            <CollectionDialogCancel
              onClick={() => setRiskToDeleteDraft(null)}
            >
              Batal
            </CollectionDialogCancel>
            <DestructiveButton
              onClick={handleDeleteDraft}
            >
              Hapus
            </DestructiveButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!riskToRestore}
        onOpenChange={(open) => !open && setRiskToRestore(null)}
      >
        <AlertDialogContent className="register-motion-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Pulihkan Risiko?</AlertDialogTitle>
            <AlertDialogDescription>
              Risiko akan kembali muncul di daftar aktif dengan status
              terakhirnya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg ring-1 ring-inset ring-border bg-muted px-3 py-2 text-sm">
            <p className="font-medium">
              {(riskToRestore ?? actionRisk)?.title || "Tanpa judul"}
            </p>
            <p className="text-xs text-muted-foreground">
              {(riskToRestore ?? actionRisk)?.code || (riskToRestore ?? actionRisk)?.id}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!riskToRestore) return;
                const current = riskToRestore;
                setRiskToRestore(null);
                void handleRestoreRisk(current);
              }}
            >
              Pulihkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageStack>
  );
}

function appleCornerPath({ width, height, radius, smoothing = 60 }: { width: number; height: number; radius: number; smoothing?: number }) {
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const r = clamp(radius, 0, Math.min(w, h) / 2);
  const s = clamp(smoothing, 0, 100) / 100;

  if (!w || !h) return "";
  if (!r) return `M0 0H${w}V${h}H0Z`;

  if (s <= 0.001) {
    const c = r * 0.5522847498307936;
    return `M${r} 0H${w - r}C${w - r + c} 0 ${w} ${r - c} ${w} ${r}V${h - r}C${w} ${h - r + c} ${w - r + c} ${h} ${w - r} ${h}H${r}C${r - c} ${h} 0 ${h - r + c} 0 ${h - r}V${r}C0 ${r - c} ${r - c} 0 ${r} 0Z`;
  }

  const exponent = 2 + s * 3.35;
  const steps = 22;
  const points: [number, number][] = [];

  const corner = (cx: number, cy: number, a0: number, a1: number) => {
    for (let i = 0; i <= steps; i += 1) {
      const a = a0 + (a1 - a0) * (i / steps);
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const x = cx + r * Math.sign(cos) * Math.abs(cos) ** (2 / exponent);
      const y = cy + r * Math.sign(sin) * Math.abs(sin) ** (2 / exponent);
      points.push([+x.toFixed(3), +y.toFixed(3)]);
    }
  };

  points.push([r, 0], [w - r, 0]);
  corner(w - r, r, -Math.PI / 2, 0);
  points.push([w, h - r]);
  corner(w - r, h - r, 0, Math.PI / 2);
  points.push([r, h]);
  corner(r, h - r, Math.PI / 2, Math.PI);
  points.push([0, r]);
  corner(r, r, Math.PI, Math.PI * 1.5);

  const deduped = points.filter((point, index, all) => {
    if (index === 0) return true;
    const prev = all[index - 1];
    return point[0] !== prev[0] || point[1] !== prev[1];
  });

  return `M${deduped.map(([x, y]) => `${x} ${y}`).join("L")}Z`;
}
