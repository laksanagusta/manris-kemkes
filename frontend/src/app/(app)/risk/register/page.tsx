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
import {
  listRiskMonitorings,
} from "@/lib/api/risk-monitoring";
import { useAuth } from "@/contexts/auth-context";
import type { RiskMonitoringDetail } from "@/types/risk-monitoring";
import { isReadOnlyForOrg } from "@/lib/auth-helpers";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AccentButton,
  ActionButton,
  ActionIconButton,
  CollectionPageHeader,
  CollectionSearchField,
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
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  calculateRiskMetrics,
  getRiskLevelLabel,
  resolveRiskScoreSemantics,
  riskCategoryLabels,
} from "@/lib/risk";
import {
  buildRiskRegisterQueryString,
  parseRiskRegisterQueryState,
  shouldReplaceRiskRegisterUrl,
} from "@/lib/risk-register-query";
import { formatMonitoringNilai } from "@/lib/risk-register-monitoring";
import { MonitoringTransactionsTable } from "@/app/(app)/risk/components/monitoring-transactions-table";
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
  SidebarTabsList,
} from "@/components/shared/design-system";
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Upload,
  RefreshCcw,
  Archive,
  RotateCcw,
} from "@/components/ui/icons";
import {
  getLinearRiskLevelBadgeClass,
  getLinearStatusBadgeClass,
  getLinearToneBadgeClass,
} from "@/lib/linear-status-badge";

type BadgeTone = NonNullable<React.ComponentProps<typeof Badge>["tone"]>;

const statusVariant: Record<string, string> = {
  draft: getLinearStatusBadgeClass("draft"),
  final: getLinearStatusBadgeClass("final"),
  finalized: getLinearStatusBadgeClass("final"),
  void: getLinearToneBadgeClass("danger"),
};

const registerStatusTone: Record<string, BadgeTone> = {
  draft: "neutral",
  final: "success",
  finalized: "success",
  void: "danger",
  archived: "neutral",
};

const levelBadgeVariant: Record<string, string> = {
  "Sangat Rendah": getLinearRiskLevelBadgeClass("Sangat Rendah"),
  Rendah: getLinearRiskLevelBadgeClass("Rendah"),
  Sedang: getLinearRiskLevelBadgeClass("Sedang"),
  Tinggi: getLinearRiskLevelBadgeClass("Tinggi"),
  "Sangat Tinggi": getLinearRiskLevelBadgeClass("Sangat Tinggi"),
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  final: "Final",
  finalized: "Final",
  void: "Void",
};

type RiskListItem = RiskRegisterListItem;

type RiskRegisterTab = "all-risks" | "monitoring-transactions";

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
  onRefresh: () => void;
  refreshing: boolean;
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
  onRefresh,
  refreshing,
}: RiskRegisterFilterToolbarProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
      <CollectionSearchField
        containerClassName="w-full sm:flex-1 sm:w-auto md:flex-1 md:w-auto"
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
      <ActionButton
        aria-label="Muat ulang daftar risiko"
        disabled={refreshing}
        icon={
          <RefreshCcw
            className={cn("size-3.5", refreshing && "animate-spin")}
            strokeWidth={2.25}
          />
        }
        onClick={onRefresh}
        size="icon-xs"
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
              Atur filter untuk daftar risiko dan transaksi pemantauan.
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
                <SelectTrigger className="h-9 rounded-lg border border-input bg-card text-sm">
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
                <SelectTrigger className="h-9 rounded-lg border border-input bg-card text-sm">
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
                <SelectTrigger className="h-9 rounded-lg border border-input bg-card text-sm">
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

function resolveListItemScoreSemantics(risk: RiskListItem) {
  const probability = risk.probability ?? 1;
  const impact = risk.impact ?? 1;
  const fallbackMetrics = calculateRiskMetrics(probability, impact);

  return resolveRiskScoreSemantics({
    status: risk.status ?? "draft",
    probability,
    impact,
    weight: risk.weight ?? fallbackMetrics.weight,
    nilai: risk.nilai ?? fallbackMetrics.nilai,
    inherentScore: risk.inherentScore ?? fallbackMetrics.inherentScore,
  });
}

function formatLocalDateTime(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function RiskRowActions({
  risk,
  isReadOnly,
  onContinueMonitoring,
  onStartMonitoring,
  onMandateCascade,
  onEscalateCascade,
  onArchive,
  onRestore,
  onDeleteDraft,
}: {
  risk: RiskListItem;
  isReadOnly: boolean;
  onContinueMonitoring?: () => void;
  onStartMonitoring?: () => void;
  onMandateCascade?: () => void;
  onEscalateCascade?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onDeleteDraft?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ActionIconButton
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
        {/*{(onMandateCascade || onEscalateCascade) && (
          <>
            {onMandateCascade && (
              <DropdownMenuItem onClick={onMandateCascade}>
                <GitBranch className="size-3.5" />
                Turunkan Risiko
              </DropdownMenuItem>
            )}
            {onEscalateCascade && (
              <DropdownMenuItem onClick={onEscalateCascade}>
                <GitBranch className="size-3.5 rotate-180" />
                Usulkan Naik
              </DropdownMenuItem>
            )}
          </>
        )}*/}
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
  const [monitoringTransactions, setMonitoringTransactions] = useState<
    RiskMonitoringDetail[]
  >([]);
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
  const [monitoringTotal, setMonitoringTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<RiskRegisterTab>(
    () =>
      parseRiskRegisterQueryState(new URLSearchParams(searchParams.toString()))
        .activeTab,
  );
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

    const [
      allRisksResponse,
      draftRisks,
      monitoringTransactionsResponse,
    ] = await Promise.all([
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
      listRiskMonitorings(activeToken, {
        q: normalizedSearch || undefined,
        lifecycle: lifecycleFilter,
        status: undefined,
        category: categoryFilter === "all" ? undefined : categoryFilter,
        assessment_cycle: normalizedAssessmentCycle || undefined,
        created_at: normalizedCreatedAt || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        limit,
      }),
    ]);

    setDrafts(draftRisks);
    setMonitoringTransactions(monitoringTransactionsResponse.data ?? []);
    setRisks(allRisksResponse.data ?? []);
    setRegisterTotal(allRisksResponse.total ?? 0);
    setMonitoringTotal(monitoringTransactionsResponse.total ?? 0);
    setPage(allRisksResponse.page ?? page);
    setLimit(allRisksResponse.limit ?? limit);

  };

  const handleRefreshRegister = () => {
    if (!token || loading) return;

    setLoading(true);
    void refreshRegisterData(token)
      .catch((err) => {
        const message =
          err instanceof Error
            ? err.message
            : "Gagal memuat ulang daftar risiko.";
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
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
    setActiveTab((current) =>
      current === nextState.activeTab ? current : nextState.activeTab,
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
      activeTab,
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
    activeTab,
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


  const activeTotal =
    activeTab === "monitoring-transactions" ? monitoringTotal : registerTotal;
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

    setConfirmDialogOpen(false);

    toast.promise(
      (async () => {
        const result = await api.post<{
          monitoring: { id: string };
          redirectUrl: string;
          existingDraft: boolean;
        }>(
          `/risks/${selectedRiskForReassessment.id}/monitorings`,
          { cycle: selectedAssessmentCycle },
          token,
        );
        await refreshRegisterData(token);

        router.push(result.redirectUrl || `/risk/monitoring/${result.monitoring.id}`);

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
      <CollectionPageHeader
        title="Daftar Risiko"
        description="Kelola dan pantau seluruh risiko organisasi."
        actions={
          <>
            <ActionButton asChild variant="outline">
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
      <Tabs
        className="gap-4"
        defaultValue="all-risks"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as RiskRegisterTab)}
      >
        <div className="space-y-4">
          <SidebarTabsList>
            <TabsTrigger value="all-risks">Daftar Risiko</TabsTrigger>
            <TabsTrigger value="monitoring-transactions">Pemantauan</TabsTrigger>
          </SidebarTabsList>
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
            onRefresh={handleRefreshRegister}
            refreshing={loading}
          />
        </div>
        <TabsContent value="all-risks" className="mt-0 space-y-4">
          <CollectionTableCard>
            <Table className="min-w-[1040px] table-fixed">
              <colgroup>
                <col className="w-[10%]" />
                <col className="w-[26%]" />
                <col className="w-[14%]" />
                <col className="w-[7%]" />
                <col className="w-[17%]" />
                <col className="w-[18%]" />
                <col className="w-[8%]" />
              </colgroup>
              <CollectionTableHeader density="compact">
                <CollectionTableHeaderRow>
                  <CollectionTableHead className="pl-4 pr-3">
                    Kode
                  </CollectionTableHead>
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
                      className="flex h-9 w-full items-center gap-1 px-3 text-left outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30 active:bg-muted/70"
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
                      colSpan={7}
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
                    const canReassess =
                      risk.status === "final" &&
                      risk.isCurrent &&
                      !risk.archivedAt &&
                      !isReadOnly;
                    const canArchive =
                      lifecycleFilter !== "archived" &&
                      risk.status === "final" &&
                      risk.isCurrent &&
                      !risk.archivedAt &&
                      !isReadOnly;
                    const canRestore = !!risk.archivedAt && !isReadOnly;
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
                        <TableCell className="py-2 pl-4 pr-3 text-foreground">
                          {risk.code || "-"}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <Link
                              href={`/risk/register/${risk.id}`}
                              className="min-w-0 flex-1 truncate text-sm font-normal leading-relaxed text-foreground hover:text-primary"
                              title={risk.title || "-"}
                            >
                              {risk.title || "-"}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-3 py-2 text-foreground">
                          {riskCategoryLabels[risk.category ?? ""] ||
                            risk.category ||
                            "-"}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <span className="text-sm font-medium tabular-nums text-foreground">
                            {formatMonitoringNilai(risk.monitoringResultNilai)}
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
                          />
                        </TableCell>
                        <TableCell className="sticky right-0 bg-card px-3 py-2 transition-colors group-hover:bg-muted/50">
                          <div className="flex justify-center">
                            <RiskRowActions
                              risk={risk}
                              isReadOnly={isReadOnly}
                              onContinueMonitoring={
                                canReassess && risk.hasOngoing && risk.draftId
                                  ? () =>
                                      router.push(
                                        `/risk/monitoring/${risk.draftId}`,
                                      )
                                  : undefined
                              }
                              onStartMonitoring={
                                canReassess && !risk.hasOngoing
                                  ? () => handleOpenConfirmDialog(risk)
                                  : undefined
                              }
                              onMandateCascade={() =>
                                router.push(
                                  `/risk/cascading?sourceRiskId=${risk.id}&mode=mandatory`,
                                )
                              }
                              onEscalateCascade={() =>
                                router.push(
                                  `/risk/cascading?sourceRiskId=${risk.id}&mode=bottom-up`,
                                )
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
          </TabsContent>

        {/* TAB 2: MONITORING TRANSACTIONS */}
        <TabsContent value="monitoring-transactions" className="mt-0 space-y-4">
          <CollectionTableCard>
            <MonitoringTransactionsTable
              items={monitoringTransactions}
              levelBadgeVariant={levelBadgeVariant}
              statusVariant={statusVariant}
              getRiskLevelLabel={getRiskLevelLabel}
              formatLocalDateTime={formatLocalDateTime}
            />
            <CollectionPagination
              itemLabel="transaksi"
              page={page}
              pageSize={limit}
              total={activeTotal}
              disabled={loading || isPending}
              onPageChange={setPage}
              onPageSizeChange={(nextLimit) => {
                setLimit(nextLimit);
                setPage(1);
              }}
            />
          </CollectionTableCard>
        </TabsContent>
      </Tabs>

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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arsipkan Risiko?</DialogTitle>
            <DialogDescription>
              Risiko akan hilang dari daftar aktif, tetapi tetap tersimpan untuk
              audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-2xl ring-1 ring-inset ring-border bg-muted px-3 py-2 text-sm">
              <p className="font-medium">
                {riskToArchive?.title || "Tanpa judul"}
              </p>
              <p className="text-xs text-muted-foreground">
                {riskToArchive?.code || riskToArchive?.id}
              </p>
            </div>
            <Input
              value={archiveReason}
              onChange={(event) => setArchiveReason(event.target.value)}
              placeholder="Alasan utama arsip"
            />
            <Textarea
              value={archiveNote}
              onChange={(event) => setArchiveNote(event.target.value)}
              placeholder="Catatan tambahan (opsional)"
              className="min-h-24"
            />
          </div>
          <DialogFooter>
            <CollectionDialogCancel onClick={() => setRiskToArchive(null)}>
              Batal
            </CollectionDialogCancel>
            <Button
              className="bg-warning text-warning-foreground hover:bg-warning/90"
              onClick={handleArchiveRisk}
            >
              Arsipkan
            </Button>
          </DialogFooter>
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

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pemantauan</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan memulai pemantauan untuk risiko berikut. Tindakan ini
              akan membuat transaksi pemantauan baru yang dapat Anda edit
              sebelum finalisasi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 rounded-2xl bg-accent p-3 ring-1 ring-inset ring-border">
            <div className="text-sm">
              <span className="font-medium text-foreground">Kode: </span>
              <span className="font-mono text-xs text-muted-foreground">
                {selectedRiskForReassessment?.code || "-"}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-foreground">Judul: </span>
              <span className="text-muted-foreground">
                {selectedRiskForReassessment?.title || "-"}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-foreground">Siklus: </span>
              <span className="text-muted-foreground">
                {selectedAssessmentCycle}
              </span>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                Periode Pemantauan
              </div>
              <Select
                value={selectedAssessmentCycle}
                onValueChange={setSelectedAssessmentCycle}
              >
                <SelectTrigger className="h-9 ring-1 ring-inset ring-border">
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
            <div className="text-sm">
              <span className="font-medium text-foreground">Score: </span>
              <span className="text-muted-foreground">
                {selectedRiskForReassessment
                  ? resolveListItemScoreSemantics(selectedRiskForReassessment)
                      .effective.score
                  : "-"}
              </span>
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
