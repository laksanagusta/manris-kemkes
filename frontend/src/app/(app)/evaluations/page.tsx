"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  FilePlus2,
  Loader2,
  MoreHorizontal,
} from "@/components/ui/icons";
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
import {
  CollectionPagination,
  CollectionPageHeader,
  CollectionFilterTrigger,
  CollectionSearchField,
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  CollectionToolbar,
} from "@/components/shared/design-system";
import {
  AccentButton,
  ActionButton,
  MetricGrid,
  PageStack,
} from "@/components/shared/design-system";
import { KpiCard } from "@/components/ui/kpi-card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { OrganizationPicker } from "@/components/report/organization-picker";
import { ReportScopePicker } from "@/components/report/report-scope-picker";
import {
  buildSelectableReportOrganizations,
  buildSelectableReportOrganizationGroups,
  needsExplicitReportOrgSelection,
  resolveDefaultReportOrgId,
} from "@/lib/report-scope";
import { evaluationStatusLabel, filterEvaluations } from "@/lib/evaluations";
import { getLinearStatusBadgeClass } from "@/lib/linear-status-badge";
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
  draft: getLinearStatusBadgeClass("draft"),
  final: getLinearStatusBadgeClass("finalized"),
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
            <h4 className="text-sm font-medium">Filter Evaluasi</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Atur organisasi, periode, dan status.
            </p>
          </div>

          <div className="space-y-4">
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

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">
                Periode
              </Label>
              <Select value={periodFilter} onValueChange={onPeriodFilterChange}>
                <SelectTrigger className="h-9 rounded-lg border border-input bg-card text-sm">
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

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">
                Status
              </Label>
              <Select
                value={status}
                onValueChange={(value) => onStatusChange(value as EvaluationStatus | "all")}
              >
                <SelectTrigger className="h-9 rounded-lg border border-input bg-card text-sm">
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

          <div className="flex items-center justify-between pt-4">
            <ActionButton type="button" variant="ghost" onClick={onReset}>
              Reset
            </ActionButton>
            <AccentButton type="button" onClick={() => onOpenChange(false)}>
              Terapkan
            </AccentButton>
          </div>
        </div>
      </PopoverContent>
    </Popover>
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
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
      <CollectionSearchField
        placeholder={queryPlaceholder}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        aria-label={queryAriaLabel}
      />

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
  const [createFieldErrors, setCreateFieldErrors] = useState<{
    organization?: string;
    period?: string;
  }>({});
  const organizationFilterInitialized = useRef(false);

  const handleCreateDialogOpenChange = useCallback(
    (open: boolean) => {
      setCreateDialogOpen(open);
      if (!open) {
        setCreateFieldErrors({});
      }
      router.replace(open ? "/evaluations?create=1" : "/evaluations");
    },
    [router],
  );

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

  const handleCreateEvaluation = async () => {
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }
    const nextErrors: typeof createFieldErrors = {};
    if (!createOrganizationId) {
      nextErrors.organization = "Pilih organisasi untuk membuat evaluasi.";
    }
    if (!createPeriod.trim()) {
      nextErrors.period = "Pilih periode evaluasi.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setCreateFieldErrors(nextErrors);
      const firstInvalidId = nextErrors.organization
        ? "create-organization"
        : "create-period";
      window.requestAnimationFrame(() => {
        document.getElementById(firstInvalidId)?.focus();
      });
      return;
    }

    setCreateFieldErrors({});
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
    <PageStack>
      <CollectionPageHeader
        title="Evaluasi"
        description="Kelola evaluasi monitoring dan tindak lanjut risiko organisasi."
        actions={
          token ? (
            <AccentButton
              type="button"
              onClick={() => handleCreateDialogOpenChange(true)}
              icon={<FilePlus2 className="size-3.5" strokeWidth={2.5} />}
            >
              Buat Evaluasi
            </AccentButton>
          ) : null
        }
      />

      <MetricGrid>
        {evaluationSummaryCards.map((card) => (
          <KpiCard
            key={card.label}
            label={card.label}
            value={card.value}
            tone="white"
            className="flex min-h-[96px] flex-col rounded-lg ring-1 ring-inset ring-border border-0 p-4"
            labelClassName="capitalize tracking-normal"
            valueClassName="font-medium"
            valueWrapClassName="mt-auto"
          />
        ))}
      </MetricGrid>

      <CollectionToolbar
        actions={
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
        }
      />

      <CollectionTableCard>
          <Table className="min-w-[1020px] table-fixed">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[26%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
            </colgroup>
            <CollectionTableHeader>
              <CollectionTableHeaderRow>
                <CollectionTableHead className="pl-4 pr-3">
                  Kode
                </CollectionTableHead>
                <CollectionTableHead className="px-3">
                  Periode
                </CollectionTableHead>
                <CollectionTableHead className="px-3">
                  Organisasi
                </CollectionTableHead>
                <CollectionTableHead className="px-3">
                  Template
                </CollectionTableHead>
                <CollectionTableHead className="px-3">
                  Status
                </CollectionTableHead>
                <CollectionTableHead className="px-3">
                  Diperbarui
                </CollectionTableHead>
                <CollectionTableHead className="px-3 text-right">
                  Aksi
                </CollectionTableHead>
              </CollectionTableHeaderRow>
            </CollectionTableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-left text-xs text-muted-foreground"
                  >
                    Memuat evaluasi...
                  </TableCell>
                </TableRow>
              ) : visibleEvaluations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-left text-xs text-muted-foreground"
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
                      className="border-b border-border hover:bg-muted/50"
                    >
                      <TableCell className="py-2 pl-4 pr-3 text-foreground">
                        <Link
                          href={`/evaluations/${evaluation.id}`}
                          className="font-medium transition-colors hover:text-primary"
                          aria-label={`Buka detail evaluasi ${evaluation.code}`}
                        >
                          {evaluation.code}
                        </Link>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">
                        {evaluation.period}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <span className="text-sm font-medium text-foreground">
                          {orgName}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">
                        {evaluation.templateName || evaluation.templateId}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Badge className={statusStyles[evaluation.status]}>
                          {evaluationStatusLabel[evaluation.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">
                        {formatDateTime(evaluation.updatedAt)}
                      </TableCell>
                      <TableCell className="py-2 pl-3 pr-4 text-right">
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <ActionButton
                                variant="ghost"
                                size="icon-xs"
                                className="text-muted-foreground"
                                icon={<MoreHorizontal className="size-3.5" />}
                                aria-label={`Aksi evaluasi ${evaluation.period}`}
                              >
                              </ActionButton>
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
          <CollectionPagination
            itemLabel="evaluasi"
            page={page}
            pageSize={limit}
            total={total}
            disabled={loading}
            onPageChange={setPage}
            onPageSizeChange={(nextLimit) => {
              setLimit(nextLimit);
              setPage(1);
            }}
          />
      </CollectionTableCard>

      <Dialog
        open={createDialogOpen}
        onOpenChange={handleCreateDialogOpenChange}
      >
        <DialogContent>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreateEvaluation();
            }}
            aria-busy={creatingEvaluation}
          >
            <DialogHeader>
              <DialogTitle className="text-base font-semibold leading-tight tracking-tight text-foreground text-balance">
                Buat evaluasi
              </DialogTitle>
              <DialogDescription className="mt-1 max-w-[38ch] text-pretty">
                Pilih organisasi dan periode untuk membuat draft evaluasi.
                Detailnya dapat dilengkapi setelah draft dibuat.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="create-organization">Organisasi</Label>
                <OrganizationPicker
                  id="create-organization"
                  value={createOrganizationId}
                  organizations={organizations}
                  onChange={(value) => {
                    setCreateOrganizationId(value);
                    setCreateFieldErrors((current) => ({
                      ...current,
                      organization: undefined,
                    }));
                  }}
                  placeholder="Pilih organisasi"
                  searchPlaceholder="Cari organisasi..."
                  emptyMessage="Tidak ada organisasi ditemukan."
                  disabled={creatingEvaluation}
                  aria-required="true"
                  aria-invalid={Boolean(createFieldErrors.organization)}
                  aria-describedby={
                    createFieldErrors.organization
                      ? "create-organization-error"
                      : undefined
                  }
                  className="h-9 rounded-lg text-sm"
                />
                {createFieldErrors.organization ? (
                  <p
                    id="create-organization-error"
                    className="text-xs text-destructive"
                  >
                    {createFieldErrors.organization}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-period">Periode</Label>
                <Select
                  value={createPeriod}
                  onValueChange={(value) => {
                    setCreatePeriod(value);
                    setCreateFieldErrors((current) => ({
                      ...current,
                      period: undefined,
                    }));
                  }}
                  disabled={creatingEvaluation}
                >
                  <SelectTrigger
                    id="create-period"
                    aria-required="true"
                    aria-invalid={Boolean(createFieldErrors.period)}
                    aria-describedby={
                      createFieldErrors.period ? "create-period-error" : undefined
                    }
                    className="h-9 rounded-lg text-sm"
                  >
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
                {createFieldErrors.period ? (
                  <p id="create-period-error" className="text-xs text-destructive">
                    {createFieldErrors.period}
                  </p>
                ) : null}
              </div>
            </div>

            <DialogFooter className="sm:flex-row">
              <ActionButton
                type="button"
                variant="outline"
                onClick={() => handleCreateDialogOpenChange(false)}
                disabled={creatingEvaluation}
                className="w-full sm:w-auto"
              >
                Batal
              </ActionButton>
              <AccentButton
                type="submit"
                disabled={creatingEvaluation}
                aria-busy={creatingEvaluation}
                icon={
                  creatingEvaluation ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <FilePlus2 className="size-4" aria-hidden="true" />
                  )
                }
                className="w-full sm:w-auto"
              >
                Buat draft
              </AccentButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}
