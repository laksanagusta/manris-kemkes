"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  FilePlus2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import {
  listOrganizationGroups,
  type OrganizationGroupListItem,
} from "@/lib/api/organization-groups";
import {
  createEvaluation,
  downloadEvaluationPdf,
  listEvaluations,
} from "@/lib/api/evaluations";
import {
  listAllOrganizations,
  type OrganizationListItem,
} from "@/lib/api/organizations";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { OrganizationPicker } from "@/components/report/organization-picker";
import { ReportScopePicker } from "@/components/report/report-scope-picker";
import {
  buildSelectableReportOrganizations,
  buildSelectableReportOrganizationGroups,
  needsExplicitReportOrgSelection,
  resolveDefaultReportOrgId,
} from "@/lib/report-scope";
import { evaluationStatusLabel, filterEvaluations } from "@/lib/evaluations";
import {
  currentAssessmentCycle,
  getSelectableAssessmentCycles,
} from "@/lib/risk-cycle-options";
import type { Evaluation, EvaluationStatus } from "@/types/evaluation";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const statusStyles: Record<EvaluationStatus, string> = {
  draft: "border-border/60 bg-muted/40 text-muted-foreground",
  final:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

type EvaluationFiltersSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onOrganizationIdChange: (value: string) => void;
  organizationGroupId: string;
  onOrganizationGroupIdChange: (value: string) => void;
  organizations: OrganizationListItem[];
  organizationGroups: OrganizationGroupListItem[];
  periodOptions: { value: string; label: string }[];
  periodFilter: string;
  onPeriodFilterChange: (value: string) => void;
  status: EvaluationStatus | "all";
  onStatusChange: (value: EvaluationStatus | "all") => void;
  onReset: () => void;
};

function EvaluationFiltersSidebar({
  open,
  onOpenChange,
  organizationId,
  onOrganizationIdChange,
  organizationGroupId,
  onOrganizationGroupIdChange,
  organizations,
  organizationGroups,
  periodOptions,
  periodFilter,
  onPeriodFilterChange,
  status,
  onStatusChange,
  onReset,
}: EvaluationFiltersSidebarProps) {
  return (
    <Sheet modal={false} open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-8 gap-2">
          <Filter className="size-3.5" />
          Filter
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-[22rem]"
      >
        <SheetHeader>
          <SheetTitle>Filter Evaluasi</SheetTitle>
          <SheetDescription>
            Atur organisasi, periode, dan status. Search tetap tersedia di
            bawah KPI cards.
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Organisasi
            </Label>
            <ReportScopePicker
              organizationId={organizationId}
              onOrganizationChange={onOrganizationIdChange}
              organizations={organizations}
              organizationGroupId={organizationGroupId}
              onOrganizationGroupChange={onOrganizationGroupIdChange}
              organizationGroups={organizationGroups}
              organizationPlaceholder="Semua organisasi"
              organizationGroupPlaceholder="Semua group"
              allowAllOrganizations
              allOrganizationLabel="Semua organisasi"
              allOrganizationValue="all"
              allowAllOrganizationGroups
              allOrganizationGroupLabel="Semua group"
              allOrganizationGroupValue="all"
              orientation="vertical"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Periode
            </Label>
            <Select value={periodFilter} onValueChange={onPeriodFilterChange}>
              <SelectTrigger className="h-8 border border-border/50 bg-background/80 text-xs">
                <SelectValue placeholder="Periode" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Status
            </Label>
            <Select
              value={status}
              onValueChange={(value) => onStatusChange(value as EvaluationStatus | "all")}
            >
              <SelectTrigger className="h-8 border border-border/50 bg-background/80 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="final">Final</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <SheetFooter className="sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={onReset}>
            Reset
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type EvaluationFiltersToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  queryPlaceholder: string;
  queryAriaLabel: string;
  filterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  organizationId: string;
  onOrganizationIdChange: (value: string) => void;
  organizationGroupId: string;
  onOrganizationGroupIdChange: (value: string) => void;
  organizations: OrganizationListItem[];
  organizationGroups: OrganizationGroupListItem[];
  periodOptions: { value: string; label: string }[];
  periodFilter: string;
  onPeriodFilterChange: (value: string) => void;
  status: EvaluationStatus | "all";
  onStatusChange: (value: EvaluationStatus | "all") => void;
  onReset: () => void;
};

function EvaluationFiltersToolbar({
  query,
  onQueryChange,
  queryPlaceholder,
  queryAriaLabel,
  filterOpen,
  onFilterOpenChange,
  organizationId,
  onOrganizationIdChange,
  organizationGroupId,
  onOrganizationGroupIdChange,
  organizations,
  organizationGroups,
  periodOptions,
  periodFilter,
  onPeriodFilterChange,
  status,
  onStatusChange,
  onReset,
}: EvaluationFiltersToolbarProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 flex-1 md:max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={queryPlaceholder}
            aria-label={queryAriaLabel}
            className="h-8 border border-zinc-200 bg-white pl-9 text-sm shadow-none"
          />
        </div>
      </div>

      <EvaluationFiltersSidebar
        open={filterOpen}
        onOpenChange={onFilterOpenChange}
        organizationId={organizationId}
        onOrganizationIdChange={onOrganizationIdChange}
        organizationGroupId={organizationGroupId}
        onOrganizationGroupIdChange={onOrganizationGroupIdChange}
        organizations={organizations}
        organizationGroups={organizationGroups}
        periodOptions={periodOptions}
        periodFilter={periodFilter}
        onPeriodFilterChange={onPeriodFilterChange}
        status={status}
        onStatusChange={onStatusChange}
        onReset={onReset}
      />
    </div>
  );
}

export default function EvaluationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    [],
  );
  const [organizationGroups, setOrganizationGroups] = useState<
    OrganizationGroupListItem[]
  >([]);
  const [organizationId, setOrganizationId] = useState("all");
  const [organizationGroupId, setOrganizationGroupId] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [status, setStatus] = useState<EvaluationStatus | "all">("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createOrganizationId, setCreateOrganizationId] = useState("");
  const [createPeriod, setCreatePeriod] = useState(currentAssessmentCycle());
  const [creatingEvaluation, setCreatingEvaluation] = useState(false);
  const organizationFilterInitialized = useRef(false);

  const handleResetFilters = () => {
    setOrganizationId("all");
    setOrganizationGroupId("all");
    setPeriodFilter("all");
    setStatus("all");
    setPage(1);
  };

  const requiresOrganizationSelection = needsExplicitReportOrgSelection(user);
  const requiresScopeSelection =
    requiresOrganizationSelection &&
    organizationGroupId === "all" &&
    organizationId === "all";

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query), 350);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!token) {
      setOrganizations([]);
      setOrganizationGroups([]);
      return;
    }

    Promise.all([
      listAllOrganizations(token),
      listOrganizationGroups(token, {
        ownerOrganizationId: user?.isGlobal
          ? undefined
          : user?.organizationId ?? undefined,
        includeMembers: true,
        limit: 100,
        page: 1,
      }),
    ])
      .then(([items, groupsResponse]) => {
        setOrganizations(buildSelectableReportOrganizations(user, items));
        setOrganizationGroups(
          buildSelectableReportOrganizationGroups(
            user,
            groupsResponse.data ?? [],
          ),
        );
      })
      .catch((error) => {
        console.error(error);
        toast.error("Gagal memuat daftar organisasi.");
      });
  }, [token, user]);

  useEffect(() => {
    if (organizationGroupId !== "all") return;
    if (!organizations.length) return;
    if (organizationFilterInitialized.current) return;

    const defaultOrgId = resolveDefaultReportOrgId(user);
    const nextOrganizationId =
      defaultOrgId && organizations.some((org) => org.id === defaultOrgId)
        ? defaultOrgId
        : requiresOrganizationSelection
          ? "all"
          : organizations[0].id;

    setOrganizationId(nextOrganizationId);
    organizationFilterInitialized.current = true;
  }, [organizationGroupId, organizations, requiresOrganizationSelection, user]);

  useEffect(() => {
    if (!token) {
      setEvaluations([]);
      setLoading(false);
      return;
    }

    if (requiresScopeSelection) {
      setEvaluations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    listEvaluations(token, {
      organizationId:
        organizationGroupId === "all" && organizationId !== "all"
          ? organizationId
          : undefined,
      organizationGroupId:
        organizationGroupId !== "all"
          ? organizationGroupId
          : undefined,
      period: periodFilter !== "all" ? periodFilter : undefined,
      status: status !== "all" ? status : undefined,
      query: debouncedQuery.trim() || undefined,
      page,
      limit,
    })
      .then((response) => {
        setEvaluations(response.data ?? []);
        setTotal(response.total ?? 0);
        setPage(response.page ?? page);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Gagal memuat daftar evaluasi.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [
    token,
    organizationId,
    organizationGroupId,
    periodFilter,
    status,
    debouncedQuery,
    page,
    limit,
    requiresScopeSelection,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    organizationId,
    organizationGroupId,
    periodFilter,
    status,
    debouncedQuery,
    limit,
  ]);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateDialogOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!createDialogOpen || createOrganizationId) return;
    const defaultOrgId = resolveDefaultReportOrgId(user);
    setCreateOrganizationId(
      defaultOrgId && organizations.some((org) => org.id === defaultOrgId)
        ? defaultOrgId
        : requiresOrganizationSelection
          ? ""
          : (organizations[0]?.id ?? ""),
    );
  }, [
    createDialogOpen,
    createOrganizationId,
    organizations,
    requiresOrganizationSelection,
    user,
  ]);

  const visibleEvaluations = useMemo(
    () =>
      filterEvaluations(evaluations, {
        search: debouncedQuery,
        status,
        period: periodFilter !== "all" ? periodFilter : undefined,
      organizationId:
          organizationGroupId === "all" && organizationId !== "all"
            ? organizationId
            : undefined,
    }),
    [
      evaluations,
      debouncedQuery,
      status,
      periodFilter,
      organizationId,
      organizationGroupId,
    ],
  );

  const organizationNameById = useMemo(
    () => new Map(organizations.map((org) => [org.id, org.name])),
    [organizations],
  );

  const evaluationSummaryCards = [
    {
      label: "Total Evaluasi",
      value: visibleEvaluations.length,
      tone: "zinc" as const,
      description: "Data pada filter yang sedang aktif",
    },
    {
      label: "Draft",
      value: visibleEvaluations.filter((item) => item.status === "draft")
        .length,
      tone: "rose" as const,
      description: "Masih bisa diedit",
    },
    {
      label: "Final",
      value: visibleEvaluations.filter((item) => item.status === "final")
        .length,
      tone: "emerald" as const,
      description: "Sudah dikunci dan siap PDF",
    },
    {
      label: "Periode",
      value: periodFilter === "all" ? "Semua" : periodFilter,
      tone: "white" as const,
      description: "Filter periode aktif",
    },
  ];

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const pageEnd = total === 0 ? 0 : Math.min(page * limit, total);
  const periodOptions = useMemo(
    () => [
      { value: "all", label: "Semua periode" },
      ...getSelectableAssessmentCycles(currentAssessmentCycle()),
    ],
    [],
  );
  const createPeriodOptions = useMemo(
    () => getSelectableAssessmentCycles(currentAssessmentCycle()),
    [],
  );

  const handleDownload = async (evaluation: Evaluation) => {
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }

    setDownloadingId(evaluation.id);
    try {
      await downloadEvaluationPdf(
        token,
        evaluation.id,
        `evaluasi-mr-${evaluation.period}.pdf`,
      );
      toast.success("PDF evaluasi sedang diunduh.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal mengunduh PDF evaluasi.",
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCreateDialogOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
    router.replace(open ? "/evaluations?create=1" : "/evaluations");
  };

  const handleCreateEvaluation = async () => {
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }
    if (!createOrganizationId) {
      toast.error("Pilih organisasi terlebih dahulu.");
      return;
    }
    if (!createPeriod.trim()) {
      toast.error("Isi periode terlebih dahulu.");
      return;
    }

    setCreatingEvaluation(true);
    try {
      const evaluation = await createEvaluation(token, {
        organizationId: createOrganizationId,
        period: createPeriod.trim(),
      });
      toast.success("Evaluasi berhasil dibuat.");
      handleCreateDialogOpenChange(false);
      router.push(`/evaluations/${evaluation.id}`);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Gagal membuat evaluasi.",
      );
    } finally {
      setCreatingEvaluation(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
            Daftar evaluasi
          </p>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Evaluasi</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Buat, isi, finalisasi, dan unduh laporan evaluasi per organisasi
              dan periode dari satu halaman kerja.
            </p>
          </div>
        </div>
        <Button
          type="button"
          className="gap-2 self-start"
          onClick={() => handleCreateDialogOpenChange(true)}
        >
          <FilePlus2 className="size-4" />
          Buat Evaluasi
        </Button>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {evaluationSummaryCards.map((card) => (
          <KpiCard
            key={card.label}
            label={card.label}
            value={card.value}
            tone={card.tone}
            description={card.description}
          />
        ))}
      </div>

      <EvaluationFiltersToolbar
        query={query}
        onQueryChange={(value) => {
          setQuery(value);
          setPage(1);
        }}
        queryPlaceholder="Cari evaluasi..."
        queryAriaLabel="Cari evaluasi"
        filterOpen={filterOpen}
        onFilterOpenChange={setFilterOpen}
        organizationId={organizationId}
        onOrganizationIdChange={(value) => {
          setOrganizationId(value);
          if (value !== "all") {
            setOrganizationGroupId("all");
          }
          setPage(1);
        }}
        organizationGroupId={organizationGroupId}
        onOrganizationGroupIdChange={(value) => {
          setOrganizationGroupId(value);
          if (value !== "all") {
            setOrganizationId("all");
          }
          setPage(1);
        }}
        organizations={organizations}
        organizationGroups={organizationGroups}
        periodOptions={periodOptions}
        periodFilter={periodFilter}
        onPeriodFilterChange={(value) => {
          setPeriodFilter(value);
          setPage(1);
        }}
        status={status}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        onReset={handleResetFilters}
      />

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(24,24,27,0.05)] ring-1 ring-inset ring-zinc-200/80">
        <div className="flex flex-col gap-3 p-4 shadow-[inset_0_-1px_rgba(24,24,27,0.06)] md:flex-row md:items-start md:justify-between md:px-6">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight text-zinc-900 text-balance">
                Daftar evaluasi
              </h2>
              <p className="mt-1 text-xs text-zinc-500 text-pretty">
                {loading
                  ? "Memuat data evaluasi..."
                  : `${visibleEvaluations.length} evaluasi pada filter aktif`}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className="rounded-full bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-zinc-600 tabular-nums ring-1 ring-inset ring-zinc-200">
                {total} evaluasi
              </span>
            </div>
          </div>
        </div>

        <div className="relative w-full overflow-x-auto">
          <Table className="min-w-[1240px]">
            <TableHeader className="[&_tr]:border-b [&_tr]:border-zinc-200">
              <TableRow className="border-zinc-200 transition-colors hover:bg-transparent">
                <TableHead className="w-28 whitespace-nowrap pl-4 pr-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 md:pl-6">
                  Kode
                </TableHead>
                <TableHead className="w-28 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                  Periode
                </TableHead>
                <TableHead className="whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                  Organisasi
                </TableHead>
                <TableHead className="whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                  Template
                </TableHead>
                <TableHead className="w-28 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                  Status
                </TableHead>
                <TableHead className="w-32 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                  Diperbarui
                </TableHead>
                <TableHead className="w-32 whitespace-nowrap px-2.5 text-right align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 md:pr-6">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-0">
              {loading ? (
                <TableRow className="border-b border-zinc-200/80 transition-colors hover:bg-zinc-50/70">
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-sm text-zinc-500"
                  >
                    <Loader2 className="mx-auto mb-2 size-4 animate-spin" />
                    Memuat evaluasi...
                  </TableCell>
                </TableRow>
              ) : visibleEvaluations.length === 0 ? (
                <TableRow className="border-b border-zinc-200/80 transition-colors hover:bg-zinc-50/70">
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-sm text-zinc-500"
                  >
                    Belum ada evaluasi untuk filter yang dipilih.
                  </TableCell>
                </TableRow>
              ) : (
                visibleEvaluations.map((evaluation) => {
                  const orgName =
                    organizationNameById.get(evaluation.organizationId) ??
                    evaluation.organizationId;
                  const isDownloading = downloadingId === evaluation.id;

                  return (
                    <TableRow
                      key={evaluation.id}
                      className="border-b border-zinc-200/80 transition-colors hover:bg-zinc-50/70"
                    >
                      <TableCell className="whitespace-nowrap px-2.5 font-mono text-zinc-600 pl-4 md:pl-6">
                        <Link
                          href={`/evaluations/${evaluation.id}`}
                          className="inline-flex items-center rounded-md font-semibold text-zinc-700 transition-colors hover:text-primary"
                          aria-label={`Buka detail evaluasi ${evaluation.code}`}
                        >
                          {evaluation.code}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-2.5 text-zinc-600">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-zinc-900">
                            {evaluation.period}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px] px-2.5">
                        <div className="truncate font-medium text-zinc-900">
                          {orgName}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px] px-2.5 text-zinc-600">
                        {evaluation.templateName || evaluation.templateId}
                      </TableCell>
                      <TableCell className="px-2.5">
                        <Badge
                          variant="outline"
                          className={statusStyles[evaluation.status]}
                        >
                          {evaluationStatusLabel[evaluation.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-2.5 text-xs text-zinc-600">
                        {formatDateTime(evaluation.updatedAt)}
                      </TableCell>
                      <TableCell className="px-2.5 align-middle text-right md:pr-6">
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="flex items-center justify-center text-muted-foreground"
                                aria-label={`Aksi evaluasi ${evaluation.period}`}
                              >
                                <MoreHorizontal className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() => void handleDownload(evaluation)}
                                disabled={isDownloading}
                              >
                                {isDownloading ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Download className="size-3.5" />
                                )}
                                Unduh PDF
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3">
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
                <SelectTrigger className="h-7 w-[65px] border-none bg-muted/30 px-2.5 text-xs shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Menampilkan {pageStart} - {pageEnd} dari {total} evaluasi
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="bg-primary/10 text-xs font-medium text-primary"
              disabled
            >
              {page}
            </Button>
            <span className="px-1 text-xs text-muted-foreground">
              dari {totalPages}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages || loading || total === 0}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={createDialogOpen}
        onOpenChange={handleCreateDialogOpenChange}
      >
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-h-[88vh] sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-border/60 bg-background px-6 py-4">
            <DialogTitle className="text-[15px] font-semibold tracking-tight text-zinc-900 text-balance">
              Evaluasi
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-zinc-500 text-pretty">
              Buat draft evaluasi untuk organisasi dan periode yang dipilih.
              Data detail bisa diisi setelah draft dibuat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              <Label>Organisasi</Label>
              <OrganizationPicker
                value={createOrganizationId}
                organizations={organizations}
                onChange={setCreateOrganizationId}
                placeholder="Pilih organisasi"
                searchPlaceholder="Cari organisasi..."
                emptyMessage="Tidak ada organisasi ditemukan."
                disabled={creatingEvaluation}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-period">Periode</Label>
              <Select
                value={createPeriod}
                onValueChange={setCreatePeriod}
                disabled={creatingEvaluation}
              >
                <SelectTrigger id="create-period">
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  {createPeriodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-border/60 bg-muted/[0.18] px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleCreateDialogOpenChange(false)}
              disabled={creatingEvaluation}
            >
              Batal
            </Button>
            <Button
              type="button"
              className="gap-2"
              onClick={() => void handleCreateEvaluation()}
              disabled={creatingEvaluation}
            >
              {creatingEvaluation ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FilePlus2 className="size-4" />
              )}
              {creatingEvaluation ? "Membuat..." : "Buat Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
