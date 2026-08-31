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
import { Button } from "@/components/ui/button";
import {
  AccentButton,
  ActionButton,
  CollectionPageHeader,
  CollectionSearchField,
  CollectionToolbar,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  currentMonitoringCycle,
  getSelectableMonitoringCycles,
} from "@/lib/risk-cycle-options";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
} from "@/lib/risk";
import {
  buildRiskRegisterQueryString,
  parseRiskRegisterQueryState,
  shouldReplaceRiskRegisterUrl,
} from "@/lib/risk-register-query";
import { formatMonitoringNilai } from "@/lib/risk-register-monitoring";
import {
  CollectionPagination,
  CollectionErrorState,
  CollectionDialogCancel,
  CollectionFilterInput,
  CollectionFilterTrigger,
  CollectionLoadingState,
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  MonitoringTransactionProgress,
} from "@/components/shared/design-system";
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Upload,
  Archive,
  MoreHorizontal,
  RefreshCcw,
  RotateCcw,
} from "@/components/ui/icons";

type BadgeTone = NonNullable<React.ComponentProps<typeof Badge>["tone"]>;

const registerStatusTone: Record<string, BadgeTone> = {
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

type RiskListItem = RiskRegisterListItem;

type RiskRegisterFilterToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchAriaLabel: string;
  filterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  assessmentCycleFilter: string;
  onAssessmentCycleFilterChange: (value: string) => void;
  createdAtFilter: string;
  onCreatedAtFilterChange: (value: string) => void;
  lifecycleFilter: RiskRegisterLifecycleFilter;
  onLifecycleFilterChange: (value: RiskRegisterLifecycleFilter) => void;
  statusFilter: RiskRegisterStatusFilter;
  onStatusFilterChange: (value: RiskRegisterStatusFilter) => void;
  categoryFilter: RiskRegisterCategoryFilter;
  onCategoryFilterChange: (value: RiskRegisterCategoryFilter) => void;
  onReset: () => void;
};

function RiskRegisterFilterToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  filterOpen,
  onFilterOpenChange,
  assessmentCycleFilter,
  onAssessmentCycleFilterChange,
  createdAtFilter,
  onCreatedAtFilterChange,
  lifecycleFilter,
  onLifecycleFilterChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  onReset,
}: RiskRegisterFilterToolbarProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
      <CollectionSearchField
        containerClassName="w-full sm:w-80 sm:flex-none"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchAriaLabel}
      />

      <RiskRegisterFiltersSidebar
        open={filterOpen}
        onOpenChange={onFilterOpenChange}
        assessmentCycleFilter={assessmentCycleFilter}
        onAssessmentCycleFilterChange={onAssessmentCycleFilterChange}
        createdAtFilter={createdAtFilter}
        onCreatedAtFilterChange={onCreatedAtFilterChange}
        lifecycleFilter={lifecycleFilter}
        onLifecycleFilterChange={onLifecycleFilterChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={onCategoryFilterChange}
        onReset={onReset}
      />
    </div>
  );
}

type RiskRegisterFiltersSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentCycleFilter: string;
  onAssessmentCycleFilterChange: (value: string) => void;
  createdAtFilter: string;
  onCreatedAtFilterChange: (value: string) => void;
  lifecycleFilter: RiskRegisterLifecycleFilter;
  onLifecycleFilterChange: (value: RiskRegisterLifecycleFilter) => void;
  statusFilter: RiskRegisterStatusFilter;
  onStatusFilterChange: (value: RiskRegisterStatusFilter) => void;
  categoryFilter: RiskRegisterCategoryFilter;
  onCategoryFilterChange: (value: RiskRegisterCategoryFilter) => void;
  onReset: () => void;
};

function RiskRegisterFiltersSidebar({
  open,
  onOpenChange,
  assessmentCycleFilter,
  onAssessmentCycleFilterChange,
  createdAtFilter,
  onCreatedAtFilterChange,
  lifecycleFilter,
  onLifecycleFilterChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  onReset,
}: RiskRegisterFiltersSidebarProps) {
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
            <h4 className="text-sm font-medium">Filter Daftar Risiko</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Atur filter untuk daftar risiko.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">
                Periode Kuartal
              </Label>
              <CollectionFilterInput
                placeholder="YYYY-QN"
                value={assessmentCycleFilter}
                onChange={(event) =>
                  onAssessmentCycleFilterChange(event.target.value)
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">
                Tanggal Dibuat
              </Label>
              <CollectionFilterInput
                type="date"
                value={createdAtFilter}
                onChange={(event) => onCreatedAtFilterChange(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">
                Lifecycle
              </Label>
              <Select
                value={lifecycleFilter}
                onValueChange={(value) =>
                  onLifecycleFilterChange(value as RiskRegisterLifecycleFilter)
                }
              >
                <SelectTrigger className="h-10 rounded-lg border border-input bg-card text-sm">
                  <SelectValue placeholder="Lifecycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="archived">Arsip</SelectItem>
                  <SelectItem value="all">Semua</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">
                Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  onStatusFilterChange(value as RiskRegisterStatusFilter)
                }
              >
                <SelectTrigger className="h-10 rounded-lg border border-input bg-card text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="draft">
                    Draf Risiko
                  </SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">
                Kategori
              </Label>
              <Select
                value={categoryFilter}
                onValueChange={(value) =>
                  onCategoryFilterChange(value as RiskRegisterCategoryFilter)
                }
              >
                <SelectTrigger className="h-10 rounded-lg border border-input bg-card text-sm">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  <SelectItem value="kebijakan">
                    {riskCategoryLabels.kebijakan}
                  </SelectItem>
                  <SelectItem value="reputasi">
                    {riskCategoryLabels.reputasi}
                  </SelectItem>
                  <SelectItem value="fraud_korupsi">
                    {riskCategoryLabels.fraud_korupsi}
                  </SelectItem>
                  <SelectItem value="legal">
                    {riskCategoryLabels.legal}
                  </SelectItem>
                  <SelectItem value="kepatuhan">
                    {riskCategoryLabels.kepatuhan}
                  </SelectItem>
                  <SelectItem value="operasional">
                    {riskCategoryLabels.operasional}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button type="button" variant="ghost" size="md" onClick={onReset} className="shadow-none">
              Reset
            </Button>
            <Button
              type="button"
              size="md"
              className="gap-1.5"
              onClick={() => onOpenChange(false)}
            >
              Terapkan
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
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
        <ActionButton
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          icon={<MoreHorizontal className="size-3.5" />}
          aria-label={`Aksi risiko ${risk.code || risk.title || risk.id}`}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
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
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedRiskForReassessment, setSelectedRiskForReassessment] =
    useState<RiskListItem | null>(null);
  const [selectedAssessmentCycle, setSelectedAssessmentCycle] = useState(
    currentMonitoringCycle(),
  );
  const selectableMonitoringCycles = useMemo(
    () => getSelectableMonitoringCycles(currentMonitoringCycle()),
    [],
  );
  const [riskToArchive, setRiskToArchive] = useState<RiskListItem | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const handleRegisterSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleRegisterAssessmentCycleChange = (value: string) => {
    setAssessmentCycleFilter(value);
    setPage(1);
  };

  const handleRegisterCreatedAtChange = (value: string) => {
    setCreatedAtFilter(value);
    setPage(1);
  };

  const handleRegisterLifecycleChange = (
    value: RiskRegisterLifecycleFilter,
  ) => {
    setLifecycleFilter(value);
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
  const handleResetRegisterFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setLifecycleFilter("active");
    setCategoryFilter("all");
    setAssessmentCycleFilter("");
    setCreatedAtFilter("");
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


  const handleArchiveRisk = async () => {
    if (!token || !riskToArchive) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }
    if (!archiveReason.trim()) {
      toast.error("Alasan arsip wajib diisi.");
      return;
    }

    const current = riskToArchive;
    setRiskToArchive(null);
    setArchiveReason("");
    setArchiveNote("");

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
    setSelectedAssessmentCycle(currentMonitoringCycle());
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
      <PageStack>
        <CollectionLoadingState message="Memuat daftar risiko..." />
      </PageStack>
    );
  }

  if (error) {
    return (
      <PageStack>
        <CollectionErrorState
          title="Gagal Memuat Data"
          message={error}
          onReload={() => window.location.reload()}
        />
      </PageStack>
    );
  }
  const scoreAriaSort =
    sortBy === "nilai"
      ? sortOrder === "asc"
        ? "ascending"
        : "descending"
      : "none";
  return (
    <PageStack>
      <CollectionPageHeader title="Daftar Risiko" />
      <div className="space-y-4">
        <CollectionToolbar
            className="w-full"
            leading={
              <RiskRegisterFilterToolbar
                search={search}
                onSearchChange={handleRegisterSearchChange}
                searchPlaceholder="Cari risiko..."
                searchAriaLabel="Cari risiko"
                filterOpen={filterOpen}
                onFilterOpenChange={setFilterOpen}
                assessmentCycleFilter={assessmentCycleFilter}
                onAssessmentCycleFilterChange={handleRegisterAssessmentCycleChange}
                createdAtFilter={createdAtFilter}
                onCreatedAtFilterChange={handleRegisterCreatedAtChange}
                lifecycleFilter={lifecycleFilter}
                onLifecycleFilterChange={handleRegisterLifecycleChange}
                statusFilter={statusFilter}
                onStatusFilterChange={handleRegisterStatusChange}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={handleRegisterCategoryChange}
                onReset={handleResetRegisterFilters}
              />
            }
            actions={
              <>
                <ActionButton
                  asChild
                  variant="outline"
                  className="border-0 border-shadow"
                >
                  <Link href="/risk/register/bulk">
                    <Upload className="size-3.5" strokeWidth={2.5} />
                    Import Risiko
                  </Link>
                </ActionButton>
                <AccentButton asChild>
                  <Link href="/risk/register/new">
                    <Plus className="size-3.5" strokeWidth={2.5} />
                    Tambah Risiko
                  </Link>
                </AccentButton>
              </>
            }
        />
        <CollectionTableCard>
            <Table className="min-w-[1040px] table-fixed">
              <colgroup>
                <col className="w-[36%]" />
                <col className="w-[14%]" />
                <col className="w-[7%]" />
                <col className="w-[17%]" />
                <col className="w-[18%]" />
                <col className="w-[8%]" />
              </colgroup>
              <CollectionTableHeader density="compact">
                <CollectionTableHeaderRow>
                  <CollectionTableHead className="px-3">
                    Risiko
                  </CollectionTableHead>
                  <CollectionTableHead className="px-3">
                    Kategori
                  </CollectionTableHead>
                  <CollectionTableHead
                    aria-sort={scoreAriaSort}
                    className="px-0"
                  >
                    <button
                      type="button"
                      className="flex h-9 w-full items-center gap-1 px-3 text-left uppercase outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30 active:bg-muted/70"
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
                      Skor
                      {sortBy === "nilai" &&
                        (sortOrder === "desc" ? (
                          <ChevronDown aria-hidden="true" className="size-3" />
                        ) : (
                          <ChevronUp aria-hidden="true" className="size-3" />
                        ))}
                    </button>
                  </CollectionTableHead>
                  <CollectionTableHead className="px-3">
                    Status Risiko
                  </CollectionTableHead>
                  <CollectionTableHead className="min-w-[176px] px-3">
                    Pemantauan
                  </CollectionTableHead>
                  <CollectionTableHead className="sticky right-0 z-10 w-[84px] bg-table-header px-3 text-center">
                      Aksi
                  </CollectionTableHead>
                </CollectionTableHeaderRow>
              </CollectionTableHeader>
              <TableBody>
                {risks.length === 0 ? (
                  <TableRow>
                  <TableCell
                      colSpan={6}
                      className="py-8 text-left text-xs text-muted-foreground"
                    >
                      Tidak ada risiko yang ditemukan
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
                    return (
                      <TableRow
                        key={risk.id}
                        className="group h-10 border-0 hover:bg-muted/50"
                      >
                        <TableCell className="px-3 py-2">
                          <div className="flex min-w-0 flex-col items-start gap-0.5">
                            <span className="font-mono text-xs text-muted-foreground">
                              {risk.code || "-"}
                            </span>
                            <Link
                              href={`/risk/register/${risk.id}`}
                              className="min-w-0 max-w-full truncate text-sm font-normal leading-relaxed text-foreground hover:text-primary"
                              title={risk.title || "-"}
                            >
                              {risk.title || "-"}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                          {riskCategoryLabels[risk.category ?? ""] ||
                            risk.category ||
                            "-"}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <span className="text-sm font-normal tabular-nums text-muted-foreground">
                            {risk.nilai ?? risk.inherentScore ?? "-"}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <Badge
                              size="compact"
                              tone={
                                risk.archivedAt
                                  ? registerStatusTone.archived
                                  : registerStatusTone[risk.status || ""] ||
                                    "neutral"
                              }
                            >
                              {statusText}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[176px] px-3 py-2">
                          <MonitoringTransactionProgress
                            data={risk.semesterMonitoring}
                            countLabel=""
                          />
                        </TableCell>
                        <TableCell className="sticky right-0 bg-card px-3 py-2 transition-colors group-hover:bg-muted/50">
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
                                  ? () => setRiskToArchive(risk)
                                  : undefined
                              }
                              onRestore={
                                canRestore
                                  ? () => setRiskToRestore(risk)
                                  : undefined
                              }
                              onDeleteDraft={
                                risk.status === "draft"
                                  ? () => setRiskToDeleteDraft(risk)
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
        <AlertDialogContent className="max-w-lg no-scrollbar">
          <AlertDialogHeader className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both">
            <AlertDialogTitle>Konfirmasi Pemantauan</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[40ms]">
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
              <Select
                value={selectedAssessmentCycle}
                onValueChange={setSelectedAssessmentCycle}
              >
                <SelectTrigger id="monitoring-cycle" className="h-10">
                  <SelectValue placeholder="Pilih kuartal" />
                </SelectTrigger>
                <SelectContent>
                  {selectableMonitoringCycles.map((cycleOption) => (
                    <SelectItem
                      key={cycleOption.value}
                      value={cycleOption.value}
                    >
                      {cycleOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[80ms]">
            <AlertDialogCancel
              variant="outline"
              size="md"
              className="border-0 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="primary"
              size="primary"
              onClick={handleCreateReassessment}
            >
              Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!riskToArchive}
        onOpenChange={(open) => {
          if (!open) {
            setRiskToArchive(null);
            setArchiveReason("");
            setArchiveNote("");
          }
        }}
      >
        <DialogContent className="max-w-lg no-scrollbar" showCloseButton={false}>
          <div className="flex min-h-0 flex-col gap-5">
            <DialogHeader className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both">
              <DialogTitle>Arsipkan Risiko?</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[40ms]">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  Risiko
                </p>
                <p className="text-sm font-medium">
                  {riskToArchive?.title || "Tanpa judul"}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {riskToArchive?.code || riskToArchive?.id}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-sm" htmlFor="archive-reason">
                  Alasan utama arsip
                </Label>
                <Input
                  id="archive-reason"
                  value={archiveReason}
                  onChange={(event) => setArchiveReason(event.target.value)}
                  placeholder="Masukkan alasan pengarsipan"
                  className="text-base sm:text-sm"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-sm" htmlFor="archive-note">
                  Catatan tambahan (opsional)
                </Label>
                <Textarea
                  id="archive-note"
                  value={archiveNote}
                  onChange={(event) => setArchiveNote(event.target.value)}
                  placeholder="Tambahkan konteks jika diperlukan"
                  className="min-h-[80px] text-base sm:text-sm"
                />
              </div>
            </div>
            <DialogFooter className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[80ms]">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Draft Risiko?</DialogTitle>
            <DialogDescription>
              Draft yang dihapus tidak bisa dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-muted px-3 py-2 text-sm ring-1 ring-inset ring-border">
            <p className="font-medium">
              {riskToDeleteDraft?.title || "Tanpa judul"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {riskToDeleteDraft?.code || riskToDeleteDraft?.id}
            </p>
          </div>
          <DialogFooter>
            <CollectionDialogCancel
              onClick={() => setRiskToDeleteDraft(null)}
            >
              Batal
            </CollectionDialogCancel>
            <Button variant="destructive" onClick={handleDeleteDraft}>
              <Trash2 className="size-3.5" />
              Hapus Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!riskToRestore}
        onOpenChange={(open) => !open && setRiskToRestore(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pulihkan Risiko?</AlertDialogTitle>
            <AlertDialogDescription>
              Risiko akan kembali muncul di daftar aktif dengan status
              terakhirnya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-2xl ring-1 ring-inset ring-border bg-muted px-3 py-2 text-sm">
            <p className="font-medium">
              {riskToRestore?.title || "Tanpa judul"}
            </p>
            <p className="text-xs text-muted-foreground">
              {riskToRestore?.code || riskToRestore?.id}
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
