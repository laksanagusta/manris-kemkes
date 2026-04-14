"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { api } from "@/lib/api";
import {
  listRiskRegister,
  type RiskRegisterCategoryFilter,
  type RiskRegisterListItem,
  type RiskRegisterStatusFilter,
} from "@/lib/api/risk-register";
import { useAuth } from "@/contexts/auth-context";
import type {
  RiskCategory,
  RiskVersionTimelineItem,
} from "@/types/risk";
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
  Plus,
  Search,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Trash2,
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
  draft: "bg-muted text-muted-foreground border-border",
  in_review: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  in_approval: "bg-primary/15 text-primary border-primary/20",
  approved: "bg-success/15 text-success border-success/20",
  rejected: "bg-destructive/15 text-destructive border-destructive/20",
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  in_review: "Sedang Ditinjau",
  in_approval: "Menunggu Approval",
  approved: "Approved",
  rejected: "Ditolak",
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
  isCurrent: boolean;
};

type VersionOption = {
  id: string;
  name: string;
  date: string;
  isCurrent: boolean;
  versionNumber?: number;
};

type RiskRegisterTab = "all-risks" | "my-drafts" | "history";

function getRiskRegisterTab(value: string | null): RiskRegisterTab {
  if (value === "my-drafts" || value === "history") {
    return value;
  }

  return "all-risks";
}

function getRiskRegisterStatusFilter(
  value: string | null,
): RiskRegisterStatusFilter {
  if (
    value === "in_review" ||
    value === "in_approval" ||
    value === "approved" ||
    value === "rejected"
  ) {
    return value;
  }

  return "all";
}

function getRiskRegisterCategoryFilter(
  value: string | null,
): RiskRegisterCategoryFilter {
  if (
    value === "strategis" ||
    value === "operasional" ||
    value === "kepatuhan" ||
    value === "finansial" ||
    value === "reputasi" ||
    value === "teknologi_informasi"
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
    status: risk.status ?? "draft",
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

function currentGlobalCycle() {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? "H1" : "H2";
  return `${year}-${half}`;
}

function formatCycleLabel(cycle?: string, createdAt?: string) {
  if (cycle) return cycle;
  if (!createdAt) return "Baseline";
  return `Baseline ${new Date(createdAt).toLocaleDateString("id-ID", { year: "numeric", month: "short" })}`;
}

export default function RiskRegisterPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [risks, setRisks] = useState<RiskListItem[]>([]);
  const [drafts, setDrafts] = useState<RiskListItem[]>([]);
  const [historyRisks, setHistoryRisks] = useState<RiskListItem[]>([]);
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [historyRiskId, setHistoryRiskId] = useState<string>("");
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<RiskRegisterStatusFilter>(
    () => getRiskRegisterStatusFilter(searchParams.get("status")),
  );
  const [categoryFilter, setCategoryFilter] =
    useState<RiskRegisterCategoryFilter>(() =>
      getRiskRegisterCategoryFilter(searchParams.get("category")),
    );
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
  const [selectedVersion, setSelectedVersion] = useState("");
  const [activeTab, setActiveTab] = useState<RiskRegisterTab>(() =>
    getRiskRegisterTab(searchParams.get("tab")),
  );
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedRiskForReassessment, setSelectedRiskForReassessment] =
    useState<RiskListItem | null>(null);
  const [draftToDelete, setDraftToDelete] = useState<RiskListItem | null>(null);

  const deferredSearch = useDeferredValue(search);
  const deferredAssessmentCycleFilter = useDeferredValue(
    assessmentCycleFilter,
  );

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
    const normalizedCreatedAt = (queryOverrides?.createdAt ?? createdAtFilter).trim();

    const [allRisksResponse, draftRisks, approvedRisks] = await Promise.all([
      listRiskRegister(activeToken, {
        q: normalizedSearch || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        category: categoryFilter === "all" ? undefined : categoryFilter,
        assessment_cycle: normalizedAssessmentCycle || undefined,
        created_at: normalizedCreatedAt || undefined,
        page,
        limit,
      }),
      api.get<RiskListItem[]>("/risks?status=draft", activeToken),
      api.get<RiskListItem[]>("/risks?status=approved", activeToken),
    ]);

    const approvedCurrentRisks = approvedRisks.filter((risk) => risk.isCurrent);

    setDrafts(draftRisks);
    setHistoryRisks(approvedCurrentRisks);
    setRisks(allRisksResponse.data ?? []);
    setTotal(allRisksResponse.total ?? 0);
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
    const nextSearch = searchParams.get("q") ?? "";
    const nextStatusFilter = getRiskRegisterStatusFilter(
      searchParams.get("status"),
    );
    const nextCategoryFilter = getRiskRegisterCategoryFilter(
      searchParams.get("category"),
    );
    const nextAssessmentCycleFilter = searchParams.get("assessment_cycle") ?? "";
    const nextCreatedAtFilter = searchParams.get("created_at") ?? "";
    const nextPage = parsePositiveInt(searchParams.get("page"), 1);
    const nextLimit = parsePositiveInt(searchParams.get("limit"), 10);
    const nextTab = getRiskRegisterTab(searchParams.get("tab"));

    setSearch((current) => (current === nextSearch ? current : nextSearch));
    setStatusFilter((current) =>
      current === nextStatusFilter ? current : nextStatusFilter,
    );
    setCategoryFilter((current) =>
      current === nextCategoryFilter ? current : nextCategoryFilter,
    );
    setAssessmentCycleFilter((current) =>
      current === nextAssessmentCycleFilter ? current : nextAssessmentCycleFilter,
    );
    setCreatedAtFilter((current) =>
      current === nextCreatedAtFilter ? current : nextCreatedAtFilter,
    );
    setPage((current) => (current === nextPage ? current : nextPage));
    setLimit((current) => (current === nextLimit ? current : nextLimit));
    setActiveTab((current) => (current === nextTab ? current : nextTab));
  }, [searchParams]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    const normalizedSearch = search.trim();
    const normalizedAssessmentCycle = assessmentCycleFilter.trim();
    const normalizedCreatedAt = createdAtFilter.trim();

    if (activeTab === "all-risks") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", activeTab);
    }

    if (normalizedSearch) {
      nextParams.set("q", normalizedSearch);
    } else {
      nextParams.delete("q");
    }

    if (statusFilter === "all") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", statusFilter);
    }

    if (categoryFilter === "all") {
      nextParams.delete("category");
    } else {
      nextParams.set("category", categoryFilter);
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
    activeTab,
    assessmentCycleFilter,
    categoryFilter,
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
    statusFilter,
    categoryFilter,
    createdAtFilter,
    deferredSearch,
    deferredAssessmentCycleFilter,
    page,
    limit,
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

  const totalPages = Math.ceil(total / limit) || 1;

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
          { ...fullRisk, status: "in_review" },
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

  const handleOpenConfirmDialog = (risk: RiskListItem) => {
    setSelectedRiskForReassessment(risk);
    setConfirmDialogOpen(true);
  };

  const handleCreateReassessment = async () => {
    if (!token || !selectedRiskForReassessment) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }

    setConfirmDialogOpen(false);
    const cycle = currentGlobalCycle();

    toast.promise(
      (async () => {
        const result = await api.post<{ id: string }>(
          `/risks/${selectedRiskForReassessment.id}/reassess`,
          { cycle },
          token,
        );
        await refreshRegisterData(token);
        setActiveTab("my-drafts");
        router.push(`/risk/register/${result.id}`);
      })(),
      {
        loading: `Membuat draft reassessment ${cycle}...`,
        success: `Draft reassessment ${cycle} berhasil dibuat.`,
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

  if (loading && risks.length === 0 && drafts.length === 0 && historyRisks.length === 0) {
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
          <h1 className="text-2xl font-bold tracking-tight">Risk Register</h1>
          <p className="text-sm text-muted-foreground">
            Kelola seluruh risiko organisasi sesuai ISO 31000:2018
          </p>
        </div>
        {(!token || user?.isGlobal || !!user?.organizationId) && (
          <div className="flex flex-wrap gap-2">
            <Link href="/risk/register/bulk">
              <Button variant="outline" className="gap-2">
                <Upload className="size-4" />
                Bulk Create
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
        onValueChange={(value) => setActiveTab(getRiskRegisterTab(value))}
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
        </TabsList>

        {/* TAB 1: ALL RISKS */}
        <TabsContent value="all-risks" className="space-y-6 mt-6">
          {/* Summary badges */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: `Total: ${total}`, variant: "outline" as const },
              {
                label: `Sangat Tinggi: ${riskLevelCounts.sangat_tinggi ?? 0}`,
                cls: levelBadgeVariant["Sangat Tinggi"],
              },
              {
                label: `Tinggi: ${riskLevelCounts.tinggi ?? 0}`,
                cls: levelBadgeVariant.Tinggi,
              },
              {
                label: `Sedang: ${riskLevelCounts.sedang ?? 0}`,
                cls: levelBadgeVariant.Sedang,
              },
              {
                label: `Rendah: ${riskLevelCounts.rendah ?? 0}`,
                cls: levelBadgeVariant.Rendah,
              },
              {
                label: `Sangat Rendah: ${riskLevelCounts.sangat_rendah ?? 0}`,
                cls: levelBadgeVariant["Sangat Rendah"],
              },
            ].map((b) => (
                <Badge
                  key={b.label}
                  variant={b.variant || "outline"}
                  className={cn("text-xs font-medium border", b.cls)}
                >
                  {b.label}
                </Badge>
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
                    className="h-8 pl-8 text-xs bg-muted/30 border-none"
                  />
                </div>
                <div className="relative min-w-[180px] md:w-40">
                  <Calendar className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Siklus asesmen"
                    value={assessmentCycleFilter}
                    onChange={(event) => {
                      setAssessmentCycleFilter(event.target.value);
                      setPage(1);
                    }}
                    className="h-8 border-none bg-muted/30 pl-8 text-xs"
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
                    className="h-8 border-none bg-muted/30 pl-8 text-xs"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(getRiskRegisterStatusFilter(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-32 text-xs bg-muted/30 border-none">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="in_review">Sedang Ditinjau</SelectItem>
                    <SelectItem value="in_approval">
                      Menunggu Approval
                    </SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => {
                    setCategoryFilter(getRiskRegisterCategoryFilter(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-44 text-xs bg-muted/30 border-none">
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    <SelectItem value="strategis">
                      {riskCategoryLabels.strategis}
                    </SelectItem>
                    <SelectItem value="operasional">
                      {riskCategoryLabels.operasional}
                    </SelectItem>
                    <SelectItem value="kepatuhan">
                      {riskCategoryLabels.kepatuhan}
                    </SelectItem>
                    <SelectItem value="finansial">
                      {riskCategoryLabels.finansial}
                    </SelectItem>
                    <SelectItem value="reputasi">
                      {riskCategoryLabels.reputasi}
                    </SelectItem>
                    <SelectItem value="teknologi_informasi">
                      {riskCategoryLabels.teknologi_informasi}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-20">Kode</TableHead>
                  <TableHead>Judul Risiko</TableHead>
                  <TableHead className="w-32">Kategori</TableHead>
                  <TableHead className="w-28">Periode</TableHead>
                  <TableHead className="w-32">Unit Kerja</TableHead>
                  <TableHead className="text-center w-16">
                    Nilai
                  </TableHead>
                  <TableHead className="w-24">Level</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-28">Perlakuan</TableHead>
                  <TableHead className="w-28 text-right">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risks.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center py-8 text-muted-foreground text-xs"
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
                      !isReadOnly;
                    return (
                      <TableRow
                        key={risk.id}
                        className="border-border/30 hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-mono text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            {risk.code || "-"}
                            {risk.versionNumber != null && risk.versionNumber > 1 && (
                              <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-inset ring-border/50">
                                v{risk.versionNumber}
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
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
                        <TableCell className="text-muted-foreground">
                          {formatCycleLabel(
                            risk.assessmentCycle,
                            risk.updatedAt,
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-1">
                            {risk.orgName || "-"}
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
                        <TableCell className="text-center">
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
                          <Badge
                            className={cn(
                              "text-[10px] font-medium border h-5 px-1.5",
                              risk.status
                                ? statusVariant[risk.status]
                                : undefined,
                            )}
                          >
                            {risk.status ? statusLabel[risk.status] || risk.status : "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground capitalize">
                          {risk.treatmentOption || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {canReassess && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1.5 px-2 text-xs"
                                onClick={() => handleOpenConfirmDialog(risk)}
                              >
                                <RefreshCcw className="size-3" />
                                Reassessment
                              </Button>
                            )}
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
              <p className="text-xs text-muted-foreground">
                Menampilkan {total === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, total)} dari {total} risiko
              </p>
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
                    page === totalPages || total === 0 || loading || isPending
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

        {/* TAB 2: MY DRAFTS */}
        <TabsContent value="my-drafts" className="space-y-6 mt-6">
          <Card className="border-border/50 bg-card/80 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-20 text-xs">ID</TableHead>
                  <TableHead className="text-xs">Judul Draf / Risiko</TableHead>
                  <TableHead className="text-xs w-28">Periode</TableHead>
                  <TableHead className="text-xs w-32">Status</TableHead>
                  <TableHead className="text-xs w-32">Pembaruan</TableHead>
                  <TableHead className="text-xs w-28 text-center">
                    Progres
                  </TableHead>
                  <TableHead className="text-xs w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drafts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground text-xs"
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
                    const date = draft.updatedAt
                      ? new Date(draft.updatedAt).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-";

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
                              draft.status === "draft"
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
                        <TableCell className="text-center">
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
                          <div className="flex justify-end gap-1">
                            {draft.status === "draft" && !isReadOnly && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1.5 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDraftToDelete(draft)}
                              >
                                <Trash2 className="size-3" />
                                Hapus
                              </Button>
                            )}
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

        {/* TAB 3: HISTORY */}
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
                          {ver.versionNumber != null && ver.versionNumber > 0 ? `v${ver.versionNumber} — ` : ""}{ver.name}
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
                        <TableHead className="w-20 text-xs">Kode</TableHead>
                        <TableHead className="text-xs">
                          Risiko & Alasan Perubahan
                        </TableHead>
                        <TableHead className="text-xs w-28">
                          Versi Lama
                        </TableHead>
                        <TableHead className="text-xs text-center w-12">
                          →
                        </TableHead>
                        <TableHead className="text-xs w-28">
                          Versi Current
                        </TableHead>
                        <TableHead className="text-xs w-16 text-center">
                          Tren
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!selectedHistory ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center h-24 text-muted-foreground"
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
                          <TableCell className="text-center text-muted-foreground">
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
                          <TableCell className="text-center">
                            {selectedHistory.trend === "up" && (
                              <TrendingUp className="size-4 text-risk-extreme mx-auto" />
                            )}
                            {selectedHistory.trend === "down" && (
                              <TrendingDown className="size-4 text-success mx-auto" />
                            )}
                            {(selectedHistory.trend === "stable" ||
                              !selectedHistory.trend) && (
                              <Minus className="size-4 text-muted-foreground mx-auto" />
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
              Draft yang dihapus tidak bisa dikembalikan. Risiko yang sudah
              ditinjau harus dikembalikan ke draft terlebih dahulu sebelum dapat
              dihapus.
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

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Reassessment</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan memulai reassessment untuk risiko berikut. Tindakan ini
              akan membuat draft reassessment baru yang dapat Anda edit sebelum
              diajukan untuk persetujuan.
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
                {currentGlobalCycle()}
              </span>
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
    </div>
  );
}
