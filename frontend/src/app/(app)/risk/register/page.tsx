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
import { useAuth } from "@/contexts/auth-context";
import type { RiskCategory, RiskVersionTimelineItem } from "@/types/risk";
import { isReadOnlyForOrg } from "@/lib/auth-helpers";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
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
  currentAssessmentCycle,
  getSelectableAssessmentCycles,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  calculateRiskMetrics,
  getRiskLevelLabel,
  resolveRiskScoreSemantics,
  riskCategoryLabels,
} from "@/lib/risk";
import { buildVersionHistoryItem } from "@/lib/risk-history";
import {
  buildRiskRegisterQueryString,
  parseRiskRegisterQueryState,
  shouldReplaceRiskRegisterUrl,
} from "@/lib/risk-register-query";
import { MonitoringTransactionsTable } from "@/app/(app)/risk/components/monitoring-transactions-table";
import {
  Plus,
  Search,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Edit3,
  Trash2,
  MoreHorizontal,
  Clock,
  Send,
  History,
  GitBranch,
  Calendar,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertCircle,
  Upload,
  RefreshCcw,
  Archive,
  RotateCcw,
} from "lucide-react";

const levelBadgeVariant: Record<string, string> = {
  "Sangat Rendah": "bg-green-100 text-green-700 border-green-200",
  Rendah: "bg-risk-low/15 text-risk-low border-risk-low/20",
  Sedang: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  Tinggi: "bg-risk-high/15 text-risk-high border-risk-high/20",
  "Sangat Tinggi":
    "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
};

const statusVariant: Record<string, string> = {
  assessment_draft: "bg-muted text-muted-foreground border-border",
  assessment_in_review: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  approved: "bg-success/15 text-success border-success/20",
};

const statusLabel: Record<string, string> = {
  assessment_draft: "Draf Pemantauan",
  assessment_in_review: "Dalam Review",
  approved: "Disetujui",
};

type RiskListItem = RiskRegisterListItem;

type HistoryItem = {
  id: string;
  riskId: string;
  title: string;
  unit: string;
  cycle: string;
  currentLevel: string;
  previousLevel: string;
  trend: "up" | "down" | "stable";
  changeReason: string;
  isCurrent?: boolean;
};

type VersionOption = {
  id: string;
  name: string;
  date: string;
  isCurrent: boolean;
  versionNumber?: number;
};

type RiskRegisterTab =
  | "all-risks"
  | "my-drafts"
  | "history"
  | "monitoring-transactions";

function getRiskLevel(nilai: number | undefined): string {
  if (nilai === undefined || isNaN(nilai)) return "Sangat Rendah";
  if (nilai >= 20) return "Sangat Tinggi";
  if (nilai >= 15) return "Tinggi";
  if (nilai >= 10) return "Sedang";
  if (nilai >= 5) return "Rendah";
  return "Sangat Rendah";
}

function resolveListItemScoreSemantics(risk: RiskListItem) {
  const probability = risk.probability ?? 1;
  const impact = risk.impact ?? 1;
  const fallbackMetrics = calculateRiskMetrics(probability, impact);

  return resolveRiskScoreSemantics({
    status: risk.status ?? "assessment_draft",
    probability,
    impact,
    weight: risk.weight ?? fallbackMetrics.weight,
    nilai: risk.nilai ?? fallbackMetrics.nilai,
    inherentScore: risk.inherentScore ?? fallbackMetrics.inherentScore,
  });
}

function computeCompleteness(draft: RiskListItem) {
  let score = 0;
  const total = 6;
  if (draft.title && draft.description) score++;
  if (draft.cause && draft.impactDesc) score++;
  if (draft.existingControl && draft.probability && draft.impact) score++;
  if (draft.treatmentOption) score++;
  if (draft.targetProbability && draft.targetImpact) score++;
  if (draft.nextReviewDate) score++;
  return Math.round((score / total) * 100);
}

function formatCycleLabel(cycle?: string, createdAt?: string) {
  if (cycle) return cycle;
  if (!createdAt) return "Baseline";
  return `Baseline ${new Date(createdAt).toLocaleDateString("id-ID", { year: "numeric", month: "short" })}`;
}

function formatTreatmentOption(value?: string | null) {
  if (!value) return "-";

  switch (value.trim().toLowerCase()) {
    case "avoid":
    case "menghindari":
    case "menghindari risiko":
      return "Menghindari Risiko";
    case "transfer":
    case "berbagi":
    case "berbagi risiko":
      return "Berbagi Risiko";
    case "mitigate":
    case "mitigasi":
    case "mitigasi risiko":
    case "mitigasi / penanganan":
      return "Mitigasi";
    case "accept":
    case "terima":
    case "menerima":
    case "menerima risiko":
      return "Menerima Risiko";
    default:
      return value;
  }
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
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          aria-label={`Aksi risiko ${risk.code || risk.title || risk.id}`}
        >
          <MoreHorizontal className="size-3.5" />
        </Button>
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
    RiskListItem[]
  >([]);
  const [historyRisks, setHistoryRisks] = useState<RiskListItem[]>([]);
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [historyRiskId, setHistoryRiskId] = useState<string>("");
  const [versions, setVersions] = useState<VersionOption[]>([]);
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
  const [selectedVersion, setSelectedVersion] = useState("");
  const [activeTab, setActiveTab] = useState<RiskRegisterTab>(
    () =>
      parseRiskRegisterQueryState(new URLSearchParams(searchParams.toString()))
        .activeTab,
  );
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedRiskForReassessment, setSelectedRiskForReassessment] =
    useState<RiskListItem | null>(null);
  const [selectedAssessmentCycle, setSelectedAssessmentCycle] = useState(
    currentAssessmentCycle(),
  );
  const selectableAssessmentCycles = useMemo(
    () => getSelectableAssessmentCycles(currentAssessmentCycle()),
    [],
  );
  const [draftToDelete, setDraftToDelete] = useState<RiskListItem | null>(null);
  const [riskToArchive, setRiskToArchive] = useState<RiskListItem | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveNote, setArchiveNote] = useState("");
  const [riskToRestore, setRiskToRestore] = useState<RiskListItem | null>(null);
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
      statusFilter === "all" || statusFilter === "assessment_draft"
        ? undefined
        : statusFilter;
    const monitoringStatus = statusFilter === "all" ? undefined : statusFilter;

    const [
      allRisksResponse,
      draftRisks,
      approvedRisks,
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
      api.get<RiskListItem[]>("/risks?status=approved", activeToken),
      listRiskRegister(activeToken, {
        view: "monitoring-transactions",
        q: normalizedSearch || undefined,
        lifecycle: lifecycleFilter,
        status: monitoringStatus,
        category: categoryFilter === "all" ? undefined : categoryFilter,
        assessment_cycle: normalizedAssessmentCycle || undefined,
        created_at: normalizedCreatedAt || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        limit,
      }),
    ]);

    const approvedCurrentRisks = approvedRisks.filter((risk) => risk.isCurrent);

    setDrafts(draftRisks);
    setMonitoringTransactions(monitoringTransactionsResponse.data ?? []);
    setHistoryRisks(approvedCurrentRisks);
    setRisks(allRisksResponse.data ?? []);
    setRegisterTotal(allRisksResponse.total ?? 0);
    setMonitoringTotal(monitoringTransactionsResponse.total ?? 0);
    setPage(allRisksResponse.page ?? page);
    setLimit(allRisksResponse.limit ?? limit);

    if (approvedCurrentRisks.length === 0) {
      setHistoryRiskId("");
      setVersions([]);
      setSelectedVersion("");
      setHistoryData([]);
      return;
    }

    setHistoryRiskId((currentId) => {
      if (
        currentId &&
        approvedCurrentRisks.some((risk) => risk.id === currentId)
      ) {
        return currentId;
      }

      return approvedCurrentRisks[0].id;
    });
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

  useEffect(() => {
    if (!token || !historyRiskId) return;

    const fetchVersions = async () => {
      try {
        const versionItems = await api.get<RiskVersionTimelineItem[]>(
          `/risks/${historyRiskId}/versions`,
          token,
        );
        const currentVersion =
          versionItems.find((item) => item.isCurrent) ?? versionItems[0];

        if (!currentVersion) {
          setVersions([]);
          setSelectedVersion("");
          setHistoryData([]);
          return;
        }

        const versionOptions = versionItems.map((item) => ({
          id: item.id,
          name: formatCycleLabel(item.assessmentCycle, item.createdAt),
          date: item.createdAt
            ? new Date(item.createdAt).toLocaleDateString("id-ID")
            : "-",
          isCurrent: item.isCurrent,
          versionNumber: item.versionNumber,
        }));

        setVersions(versionOptions);
        setSelectedVersion((currentId) => {
          if (
            currentId &&
            versionOptions.some((option) => option.id === currentId)
          )
            return currentId;
          return (
            versionOptions.find((option) => !option.isCurrent)?.id ||
            currentVersion.id
          );
        });
        setHistoryData(
          versionItems.map((item) =>
            buildVersionHistoryItem(item, currentVersion),
          ),
        );
      } catch (err) {
        console.error(err);
        setVersions([]);
        setSelectedVersion("");
        setHistoryData([]);
        toast.error(
          err instanceof Error
            ? err.message
            : "Riwayat versi belum berhasil dimuat.",
        );
      }
    };

    fetchVersions();
  }, [historyRiskId, token]);

  const riskLevelCounts = useMemo(() => {
    return risks.reduce<Record<string, number>>((counts, risk) => {
      const level = resolveListItemScoreSemantics(risk).effective.level;
      counts[level] = (counts[level] ?? 0) + 1;
      return counts;
    }, {});
  }, [risks]);

  const riskSummaryCards = [
    {
      label: "Total Risiko",
      value: registerTotal,
    },
    {
      label: "Sangat Tinggi",
      value: riskLevelCounts.sangat_tinggi ?? 0,
      tone: "border-risk-extreme/20 bg-risk-extreme/10 text-risk-extreme",
    },
    {
      label: "Tinggi",
      value: riskLevelCounts.tinggi ?? 0,
      tone: "border-risk-high/20 bg-risk-high/10 text-risk-high",
    },
    {
      label: "Sedang",
      value: riskLevelCounts.sedang ?? 0,
      tone: "border-border/60 bg-background/60 text-foreground",
    },
    {
      label: "Rendah",
      value: riskLevelCounts.rendah ?? 0,
    },
    {
      label: "Sangat Rendah",
      value: riskLevelCounts.sangat_rendah ?? 0,
    },
  ];

  const monitoringDraftCount = useMemo(
    () => drafts.filter((risk) => risk.status === "assessment_draft").length,
    [drafts],
  );

  const activeTotal =
    activeTab === "monitoring-transactions" ? monitoringTotal : registerTotal;
  const totalPages = Math.ceil(activeTotal / limit) || 1;

  const handleDeleteDraft = async (id: string) => {
    toast.promise(
      (async () => {
        await api.delete(`/risks/${id}`, undefined, token || undefined);
        if (token) await refreshRegisterData(token);
      })(),
      {
        loading: "Menghapus draft...",
        success: "Draft berhasil dihapus.",
        error: (err) =>
          err instanceof Error ? err.message : "Draft belum berhasil dihapus.",
      },
    );
  };

  const handleSubmitDraft = async (draft: RiskListItem) => {
    toast.promise(
      (async () => {
        const fullRisk = await api.get<RiskListItem>(
          `/risks/${draft.id}`,
          token || undefined,
        );
        await api.put(
          `/risks/${draft.id}`,
          { ...fullRisk, status: "assessment_in_review" },
          token || undefined,
        );
        if (token) await refreshRegisterData(token);
      })(),
      {
        loading: "Mengajukan draft...",
        success: "Draft berhasil diajukan menjadi ditinjau.",
        error: (err) =>
          err instanceof Error ? err.message : "Draft belum berhasil diajukan.",
      },
    );
  };

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

  const handleOpenConfirmDialog = (risk: RiskListItem) => {
    setSelectedRiskForReassessment(risk);
    setSelectedAssessmentCycle(currentAssessmentCycle());
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
          id: string;
          redirectUrl?: string;
          existingDraft?: boolean;
        }>(
          `/risks/${selectedRiskForReassessment.id}/reassess`,
          { cycle: selectedAssessmentCycle },
          token,
        );
        await refreshRegisterData(token);

        if (result.redirectUrl) {
          router.push(result.redirectUrl);
        } else {
          router.push(`/risk/assessment/${result.id}`);
        }

        return result;
      })(),
      {
        loading: `Membuat draft reassessment ${selectedAssessmentCycle}...`,
        success: (result) =>
          result.existingDraft
            ? `Melanjutkan draft reassessment ${selectedAssessmentCycle} yang sudah ada.`
            : `Draft reassessment ${selectedAssessmentCycle} berhasil dibuat.`,
        error: (err) =>
          err instanceof Error
            ? err.message
            : "Draft reassessment belum berhasil dibuat.",
      },
    );
  };

  const selectedVersionMeta = versions.find(
    (version) => version.id === selectedVersion,
  );
  const selectedHistory = historyData.find(
    (history) => history.id === selectedVersion,
  );

  if (
    loading &&
    risks.length === 0 &&
    drafts.length === 0 &&
    historyRisks.length === 0
  ) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Memuat daftar risiko...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4">
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
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Risiko</h1>
          <p className="text-sm text-muted-foreground">
            Kelola seluruh risiko organisasi sesuai ISO 31000:2018
          </p>
        </div>
        {(!token || user?.isGlobal || !!user?.organizationId) && (
          <div className="flex flex-wrap gap-2">
            {/*<Link href="/risk/cascading">
              <Button variant="outline" className="gap-2">
                <GitBranch className="size-4" />
                Eskalasi Risiko
              </Button>
            </Link>*/}
            <Link href="/risk/register/bulk">
              <Button variant="outline" className="gap-2">
                <Upload className="size-4" />
                Import Risiko
              </Button>
            </Link>
            <Link href="/risk/register/new">
              <Button className="gap-2 shadow-lg shadow-primary/20">
                <Plus className="size-4" />
                Tambah Risiko
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="all-risks"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as RiskRegisterTab)}
      >
        <TabsList className="bg-muted/40 border border-border/50">
          <TabsTrigger value="all-risks" className="gap-2">
            <GitBranch className="size-3.5" />
            All Risks
          </TabsTrigger>
          <TabsTrigger value="my-drafts" className="gap-2">
            <Edit3 className="size-3.5" />
            Draf
            {drafts.length > 0 && (
              <Badge className="ml-1 bg-primary/20 text-primary border-primary/20 text-[9px] h-4 px-1">
                {drafts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="size-3.5" />
            Version History
          </TabsTrigger>
          <TabsTrigger value="monitoring-transactions" className="gap-2">
            <RefreshCcw className="size-3.5" />
            Pemantauan
            {monitoringDraftCount > 0 && (
              <Badge className="ml-1 bg-primary/20 text-primary border-primary/20 text-[9px] h-4 px-1">
                {monitoringDraftCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ALL RISKS */}
        <TabsContent value="all-risks" className="space-y-6 mt-6">
          <div className="grid gap-3 grid-cols-6">
            {riskSummaryCards.map((card) => (
              <Card key={card.label} className={cn("", card.tone)}>
                <CardContent className="flex items-end justify-between gap-3 p-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
                      {card.label}
                    </p>
                    <p className="text-2xl font-semibold text-foreground">
                      {card.value}
                    </p>
                  </div>
                  {/*<span className="text-xs text-muted-foreground">jumlah</span>*/}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cari risiko..."
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    className="h-8 pl-8 text-xs bg-background/80 border border-border/50"
                  />
                </div>
                <div className="relative min-w-[180px] md:w-40">
                  <Calendar className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Semester"
                    value={assessmentCycleFilter}
                    onChange={(event) => {
                      setAssessmentCycleFilter(event.target.value);
                      setPage(1);
                    }}
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
                <Select
                  value={lifecycleFilter}
                  onValueChange={(value) => {
                    setLifecycleFilter(value as RiskRegisterLifecycleFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-32 text-xs bg-background/80 border border-border/50">
                    <SelectValue placeholder="Lifecycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="archived">Arsip</SelectItem>
                    <SelectItem value="all">Semua</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as RiskRegisterStatusFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-32 text-xs bg-background/80 border border-border/50">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="assessment_in_review">
                      Dalam Review
                    </SelectItem>
                    <SelectItem value="approved">Disetujui</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => {
                    setCategoryFilter(value as RiskRegisterCategoryFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-44 text-xs bg-background/80 border border-border/50">
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
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-[15px] font-semibold">
                Daftar Risiko
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {lifecycleFilter === "archived"
                  ? "Lihat risiko yang sudah diarsipkan dan pulihkan bila perlu."
                  : "Pantau risiko aktif, status penilaian terbaru, dan tindak lanjut pemantauan pada satu tabel kerja."}
              </p>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-20 whitespace-nowrap">Kode</TableHead>
                  <TableHead className="w-16 whitespace-nowrap">
                    Versi
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    Judul Risiko
                  </TableHead>
                  <TableHead className="w-28 whitespace-nowrap">
                    Kategori
                  </TableHead>
                  <TableHead
                    className="text-center w-16 whitespace-nowrap cursor-pointer select-none"
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
                    <div className="flex items-center justify-center gap-1">
                      Nilai
                      {sortBy === "nilai" &&
                        (sortOrder === "desc" ? (
                          <ChevronDown className="size-3" />
                        ) : (
                          <ChevronUp className="size-3" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead className="w-24 whitespace-nowrap">
                    Tingkat Risiko
                  </TableHead>
                  <TableHead className="w-24 whitespace-nowrap">
                    Status
                  </TableHead>
                  <TableHead className="w-24 whitespace-nowrap">
                    Penanganan
                  </TableHead>
                  <TableHead
                    className="w-28 cursor-pointer select-none whitespace-nowrap"
                    onClick={() => {
                      if (sortBy === "created_at") {
                        setSortOrder((prev) =>
                          prev === "asc" ? "desc" : "asc",
                        );
                      } else {
                        setSortBy("created_at");
                        setSortOrder("desc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Dibuat
                      {sortBy === "created_at" &&
                        (sortOrder === "desc" ? (
                          <ChevronDown className="size-3" />
                        ) : (
                          <ChevronUp className="size-3" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead className="w-28 whitespace-nowrap">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risks.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="py-8 text-left text-xs text-muted-foreground"
                    >
                      Tidak ada risiko yang ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  risks.map((risk) => {
                    const scoreSemantics = resolveListItemScoreSemantics(risk);
                    const levelLabel = getRiskLevelLabel(
                      scoreSemantics.effective.level,
                    );
                    const isReadOnly = isReadOnlyForOrg(
                      user,
                      risk.organizationId || "",
                    );
                    const canReassess =
                      risk.status === "approved" &&
                      risk.isCurrent &&
                      !risk.archivedAt &&
                      !isReadOnly;
                    const canArchive =
                      lifecycleFilter !== "archived" &&
                      risk.status === "approved" &&
                      risk.isCurrent &&
                      !risk.archivedAt &&
                      !isReadOnly;
                    const canRestore = !!risk.archivedAt && !isReadOnly;
                    return (
                      <TableRow
                        key={risk.id}
                        className="border-border/30 hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-mono text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            {risk.code || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {risk.versionNumber != null ? (
                            <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-inset ring-border/50">
                              v{risk.versionNumber}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[250px]">
                          <Link
                            href={`/risk/register/${risk.id}`}
                            className="block truncate text-sm font-medium leading-relaxed text-primary transition-colors hover:text-primary/80"
                          >
                            {risk.title || "-"}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {riskCategoryLabels[risk.category ?? ""]}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-bold">
                            {scoreSemantics.effective.score}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "text-[10px] font-semibold border h-5 px-1.5",
                              levelBadgeVariant[levelLabel],
                            )}
                          >
                            {levelLabel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1.5">
                            <Badge
                              className={cn(
                                "text-[10px] font-medium border h-5 px-1.5",
                                risk.status
                                  ? statusVariant[risk.status]
                                  : undefined,
                              )}
                            >
                              {risk.status
                                ? risk.versionNumber == 1 &&
                                  risk.status == "assessment_draft"
                                  ? "Draft"
                                  : statusLabel[risk.status] || risk.status
                                : "-"}
                            </Badge>
                            {risk.hasOngoing && risk.draftStatus && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-medium border h-5 px-1.5 bg-amber-50 text-amber-700 border-amber-200"
                              >
                                📝{" "}
                                {statusLabel[risk.draftStatus] ||
                                  risk.draftStatus}
                              </Badge>
                            )}
                            {risk.archivedAt && (
                              <Badge className="text-[10px] font-medium border h-5 px-1.5 bg-amber-500/15 text-amber-700 border-amber-500/20">
                                Diarsipkan
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatTreatmentOption(risk.treatmentOption)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatLocalDateTime(risk.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex">
                            <RiskRowActions
                              risk={risk}
                              isReadOnly={isReadOnly}
                              onContinueMonitoring={
                                canReassess && risk.hasOngoing && risk.draftId
                                  ? () =>
                                      router.push(
                                        `/risk/assessment/${risk.draftId}`,
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
                                risk.status === "assessment_draft" &&
                                !isReadOnly
                                  ? () => setDraftToDelete(risk)
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

            {/* Pagination */}
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
                    <SelectTrigger className="h-7 w-[65px] text-xs bg-muted/30 border-none">
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
                  Menampilkan {registerTotal === 0 ? 0 : (page - 1) * limit + 1}{" "}
                  - {Math.min(page * limit, registerTotal)} dari {registerTotal}{" "}
                  risiko
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground"
                  disabled={page === 1 || loading || isPending}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-xs font-medium bg-primary/10 text-primary"
                  disabled
                >
                  {page}
                </Button>
                <span className="px-1 text-xs text-muted-foreground">
                  dari {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground"
                  disabled={
                    page === totalPages ||
                    registerTotal === 0 ||
                    loading ||
                    isPending
                  }
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: MONITORING TRANSACTIONS */}
        <TabsContent value="monitoring-transactions" className="space-y-6 mt-6">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cari transaksi pemantauan..."
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    className="h-8 pl-8 text-xs bg-background/80 border border-border/50"
                  />
                </div>
                <div className="relative min-w-[180px] md:w-40">
                  <Calendar className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Semester"
                    value={assessmentCycleFilter}
                    onChange={(event) => {
                      setAssessmentCycleFilter(event.target.value);
                      setPage(1);
                    }}
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
                <Select
                  value={lifecycleFilter}
                  onValueChange={(value) => {
                    setLifecycleFilter(value as RiskRegisterLifecycleFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-32 text-xs bg-background/80 border border-border/50">
                    <SelectValue placeholder="Lifecycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="archived">Arsip</SelectItem>
                    <SelectItem value="all">Semua</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as RiskRegisterStatusFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-32 text-xs bg-background/80 border border-border/50">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="assessment_draft">
                      Draf Pemantauan
                    </SelectItem>
                    <SelectItem value="assessment_in_review">
                      Dalam Review
                    </SelectItem>
                    <SelectItem value="approved">Disetujui</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => {
                    setCategoryFilter(value as RiskRegisterCategoryFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-44 text-xs bg-background/80 border border-border/50">
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
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-[15px] font-semibold">
                Transaksi Pemantauan
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Pantau versi hasil mulai pemantauan, bandingkan nilai sebelum
                dan hasil pemantauan, lalu lanjutkan draf yang masih berjalan.
              </p>
            </CardHeader>
            <MonitoringTransactionsTable
              items={monitoringTransactions}
              levelBadgeVariant={levelBadgeVariant}
              statusVariant={statusVariant}
              statusLabel={statusLabel}
              getRiskLevelLabel={getRiskLevelLabel}
              formatTreatmentOption={formatTreatmentOption}
              formatLocalDateTime={formatLocalDateTime}
            />

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
                    <SelectTrigger className="h-7 w-[65px] text-xs bg-muted/30 border-none">
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
                  Menampilkan {activeTotal === 0 ? 0 : (page - 1) * limit + 1} -{" "}
                  {Math.min(page * limit, activeTotal)} dari {activeTotal}{" "}
                  transaksi pemantauan
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground"
                  disabled={page === 1 || loading || isPending}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-xs font-medium bg-primary/10 text-primary"
                  disabled
                >
                  {page}
                </Button>
                <span className="px-1 text-xs text-muted-foreground">
                  dari {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground"
                  disabled={
                    page === totalPages ||
                    activeTotal === 0 ||
                    loading ||
                    isPending
                  }
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 3: MY DRAFTS */}
        <TabsContent value="my-drafts" className="space-y-6 mt-6">
          <Card className="border-border/50 bg-card/80 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-20 text-xs whitespace-nowrap">
                    ID
                  </TableHead>
                  <TableHead className="text-xs whitespace-nowrap">
                    Judul Draf / Risiko
                  </TableHead>
                  <TableHead className="text-xs w-28 whitespace-nowrap">
                    Periode
                  </TableHead>
                  <TableHead className="text-xs w-32 whitespace-nowrap">
                    Status
                  </TableHead>
                  <TableHead className="text-xs w-32 whitespace-nowrap">
                    Pembaruan
                  </TableHead>
                  <TableHead className="text-xs w-28 whitespace-nowrap">
                    Progres
                  </TableHead>
                  <TableHead className="text-xs w-24 whitespace-nowrap"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drafts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-left text-xs text-muted-foreground"
                    >
                      Belum ada draft.
                    </TableCell>
                  </TableRow>
                ) : (
                  drafts.map((draft) => {
                    const completeness = computeCompleteness(draft);
                    const isReadOnly = isReadOnlyForOrg(
                      user,
                      draft.organizationId || "",
                    );
                    const date = formatLocalDateTime(draft.updatedAt);

                    return (
                      <TableRow
                        key={draft.id}
                        className="border-border/30 hover:bg-muted/30"
                      >
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {draft.code ||
                            (draft.id ? draft.id.substring(0, 8) : "-")}
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/risk/register/${draft.id}`}
                              className="block truncate text-xs font-medium leading-relaxed text-primary transition-colors hover:text-primary/80"
                            >
                              {draft.title || "Tanpa Judul"}
                            </Link>
                            {isReadOnly && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] h-4 px-1"
                                title="Read-only access"
                              >
                                RO
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatCycleLabel(
                            draft.assessmentCycle,
                            draft.updatedAt,
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] h-5 px-1.5",
                              draft.status === "assessment_draft"
                                ? "text-muted-foreground"
                                : "text-risk-medium border-risk-medium/50 bg-risk-medium/10",
                            )}
                          >
                            Draft (WIP)
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock className="size-3" /> {date}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full",
                                  completeness === 100
                                    ? "bg-success"
                                    : "bg-primary",
                                )}
                                style={{ width: `${completeness}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono">
                              {completeness}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex">
                            <RiskRowActions
                              risk={draft}
                              isReadOnly={isReadOnly}
                              onMandateCascade={() =>
                                router.push(
                                  `/risk/cascading?sourceRiskId=${draft.id}&mode=mandatory`,
                                )
                              }
                              onEscalateCascade={() =>
                                router.push(
                                  `/risk/cascading?sourceRiskId=${draft.id}&mode=bottom-up`,
                                )
                              }
                              onDeleteDraft={
                                draft.status === "assessment_draft" &&
                                !isReadOnly
                                  ? () => setDraftToDelete(draft)
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
          </Card>
        </TabsContent>

        {/* TAB 4: HISTORY */}
        <TabsContent value="history" className="space-y-6 mt-6">
          <Card className="border-border/50 bg-card/80">
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Riwayat Versi Live
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pilih satu risiko current approved untuk melihat timeline
                  reassessment dan membandingkannya dengan versi aktif saat ini.
                </p>
              </div>
              <Select value={historyRiskId} onValueChange={setHistoryRiskId}>
                <SelectTrigger className="w-full md:w-[340px]">
                  <SelectValue placeholder="Pilih risiko untuk history" />
                </SelectTrigger>
                <SelectContent>
                  {historyRisks.map((risk) => (
                    <SelectItem key={risk.id} value={risk.id}>
                      {(risk.code || "Risk") +
                        " • " +
                        (risk.title || "Tanpa judul")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-4">
            {/* Timeline Version Selector */}
            <div className="lg:col-span-1 border-r border-border/50 pr-4">
              <h3 className="text-xs font-semibold mb-4 uppercase tracking-wider text-muted-foreground">
                Timeline Snapshot
              </h3>
              <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {versions.map((ver) => (
                  <button
                    key={ver.id}
                    onClick={() => setSelectedVersion(ver.id)}
                    className={cn(
                      "relative flex items-center justify-between w-full p-3 rounded-lg border text-left transition-all z-10",
                      selectedVersion === ver.id
                        ? "bg-primary/10 border-primary/30 shadow-sm"
                        : "bg-card/80 border-border/50 hover:bg-muted/50",
                      ver.isCurrent && "ring-1 ring-primary/50",
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {ver.versionNumber != null && ver.versionNumber > 0
                            ? `v${ver.versionNumber} — `
                            : ""}
                          {ver.name}
                        </span>
                        {ver.isCurrent && (
                          <Badge className="bg-primary/20 text-primary border-primary/20 text-[9px] h-4 px-1.5 ml-1">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                        <Calendar className="size-3" />
                        <span>{ver.date}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Change Comparison */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="border-border/50 bg-card/80">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <GitBranch className="size-4" />
                    Perbandingan: {selectedVersionMeta?.name ||
                      "Pilih versi"}{" "}
                    vs Current
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="w-20 text-xs whitespace-nowrap">
                          Kode
                        </TableHead>
                        <TableHead className="text-xs whitespace-nowrap">
                          Risiko & Alasan Perubahan
                        </TableHead>
                        <TableHead className="text-xs w-28 whitespace-nowrap">
                          Versi Lama
                        </TableHead>
                        <TableHead className="text-xs w-12 whitespace-nowrap">
                          →
                        </TableHead>
                        <TableHead className="text-xs w-28 whitespace-nowrap">
                          Versi Current
                        </TableHead>
                        <TableHead className="text-xs w-16 whitespace-nowrap">
                          Tren
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!selectedHistory ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="h-24 text-left text-muted-foreground"
                          >
                            Belum ada history untuk risiko ini.
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow
                          key={selectedHistory.id}
                          className="border-border/30 hover:bg-muted/30"
                        >
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {selectedHistory.riskId || "-"}
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <p className="truncate text-xs font-medium leading-relaxed">
                              {selectedHistory.title || "-"}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {selectedHistory.cycle}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground mt-0.5 italic text-primary/70">
                              {selectedHistory.changeReason || "-"}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "text-[10px] font-semibold border h-5 px-1.5",
                                levelBadgeVariant[
                                  selectedHistory.previousLevel
                                ] || levelBadgeVariant.Rendah,
                              )}
                            >
                              {selectedHistory.previousLevel || "Rendah"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            →
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "text-[10px] font-semibold border h-5 px-1.5",
                                levelBadgeVariant[
                                  selectedHistory.currentLevel
                                ] || levelBadgeVariant.Rendah,
                              )}
                            >
                              {selectedHistory.currentLevel || "Rendah"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {selectedHistory.trend === "up" && (
                              <TrendingUp className="size-4 text-risk-extreme" />
                            )}
                            {selectedHistory.trend === "down" && (
                              <TrendingDown className="size-4 text-success" />
                            )}
                            {(selectedHistory.trend === "stable" ||
                              !selectedHistory.trend) && (
                              <Minus className="size-4 text-muted-foreground" />
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!draftToDelete}
        onOpenChange={(open) => !open && setDraftToDelete(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Draft Risiko?</DialogTitle>
            <DialogDescription>
              Draft yang dihapus tidak bisa dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <p className="font-medium">
              {draftToDelete?.title || "Tanpa judul"}
            </p>
            <p className="text-xs text-muted-foreground">
              {draftToDelete?.code || draftToDelete?.id}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraftToDelete(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!draftToDelete) return;
                const current = draftToDelete;
                setDraftToDelete(null);
                await handleDeleteDraft(current.id);
              }}
            >
              Hapus Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Arsipkan Risiko?</DialogTitle>
            <DialogDescription>
              Risiko akan hilang dari daftar aktif, tetapi tetap tersimpan untuk
              audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
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
            <textarea
              value={archiveNote}
              onChange={(event) => setArchiveNote(event.target.value)}
              placeholder="Catatan tambahan (opsional)"
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRiskToArchive(null)}>
              Batal
            </Button>
            <Button
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={handleArchiveRisk}
            >
              Arsipkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Reassessment</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan memulai pemantauan untuk risiko berikut. Tindakan ini
              akan membuat draft reassessment baru yang dapat Anda edit sebelum
              finalisasi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
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
              <span className="font-medium text-foreground">Cycle: </span>
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
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Pilih semester" />
                </SelectTrigger>
                <SelectContent>
                  {selectableAssessmentCycles.map((cycleOption) => (
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
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
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
    </div>
  );
}
