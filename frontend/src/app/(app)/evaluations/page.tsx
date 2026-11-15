"use client";

import { ProfilePeriodPicker, type ProfilePeriodSelection } from "@/components/upr/profile-period-picker";
import { CollectionCode } from "@/components/shared/design-system/collections/collection-code";
import { createDisplayDateFormatter } from "@/lib/display-date";
import { useRemoteCollectionSorting } from "@/components/shared/design-system/collections/collection-sorting";
import { CreatedAtHead, CreatedAtCell } from "@/components/shared/design-system/collections/collection-created-at";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  FilePlus2,
  Loader2,
  MoreHorizontal,
} from "@/components/shared/icons";
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
  CollectionEmptyState,
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  CollectionToolbar,
  KpiCard,
} from "@/components/shared/design-system";
import {
  AccentButton,
  ActionButton,
  CollectionDialogCancel,
  MetricGrid,
  PageStack,
} from "@/components/shared/design-system";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
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
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { EvaluationFiltersToolbar } from "@/components/evaluation/evaluation-filters-toolbar";
import {
  buildSelectableReportOrganizations,
  buildSelectableReportOrganizationGroups,
  needsExplicitReportOrgSelection,
  resolveDefaultReportOrgId,
} from "@/lib/report-scope";
import { evaluationStatusLabel, filterEvaluations } from "@/lib/evaluations";
import {
  getLinearStatusBadgeClassName,
  getLinearStatusBadgeTone,
} from "@/lib/linear-status-badge";
import type { Evaluation, EvaluationStatus } from "@/types/evaluation";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return createDisplayDateFormatter("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const statusStyles: Record<EvaluationStatus, BadgeVariant> = {
  draft: getLinearStatusBadgeTone("draft"),
  final: getLinearStatusBadgeTone("finalized"),
};

export default function EvaluationsPage() {
  const listRequest=useRef(0);
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
  const [createdDateFilter, setCreatedDateFilter] = useState("");
  const [status, setStatus] = useState<EvaluationStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createContext,setCreateContext] = useState<ProfilePeriodSelection | null>(null);
  const createLock=useRef(false);
  const [creatingEvaluation, setCreatingEvaluation] = useState(false);
  const canCreateEvaluation = Boolean(token && user?.organizationId);
  const organizationFilterInitialized = useRef(false);

  const handleCreateDialogOpenChange = useCallback(
    (open: boolean) => {
      setCreateDialogOpen(open);
      setCreateContext(null);
      router.replace(open ? "/evaluations?create=1" : "/evaluations");
    },
    [router],
  );

  const requiresOrganizationSelection = needsExplicitReportOrgSelection(user);
  const requiresScopeSelection =
    requiresOrganizationSelection &&
    organizationGroupId === "all" &&
    organizationId === "all";

  const collectionSort = useRemoteCollectionSorting({"Kode": "code", "Organisasi": "organization", "Template": "template", "Status": "status", "Diperbarui": "updated_at"}, () => setPage(1));
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
    const request=++listRequest.current;
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
 sort_by:collectionSort.sortBy, sort_order:collectionSort.sortOrder,
      organizationId:
        organizationGroupId === "all" && organizationId !== "all"
          ? organizationId
          : undefined,
      organizationGroupId:
        organizationGroupId !== "all"
          ? organizationGroupId
          : undefined,
      createdDate: createdDateFilter || undefined,
      status: status !== "all" ? status : undefined,
      query: debouncedQuery.trim() || undefined,
      page,
      limit,
    })
      .then((response) => {
        if(request!==listRequest.current)return;
        const responseEvaluations = response.data ?? [];
        setEvaluations(responseEvaluations);
        setTotal(response.total ?? 0);
        setPage(response.page ?? page);
      })
      .catch((error) => {
        if(request!==listRequest.current)return;
        console.error(error);
        toast.error("Gagal memuat daftar evaluasi.");
      })
      .finally(() => {
        if(request===listRequest.current)setLoading(false);
      });
  }, [
    token,
    organizationId,
    organizationGroupId,
    createdDateFilter,
    status,
    debouncedQuery,
    page,
    limit,
    requiresScopeSelection, collectionSort.sortBy, collectionSort.sortOrder,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    organizationId,
    organizationGroupId,
    createdDateFilter,
    status,
    debouncedQuery,
    limit,
  ]);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateDialogOpen(true);
    }
  }, [searchParams]);

  const visibleEvaluations = useMemo(
    () =>
      filterEvaluations(evaluations, {
        search: debouncedQuery,
        status,
        organizationId:
          organizationGroupId === "all" && organizationId !== "all"
            ? organizationId
            : undefined,
    }),
    [
      evaluations,
      debouncedQuery,
      status,
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
  ];

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
        `evaluasi-mr-${evaluation.code || evaluation.id}.pdf`,
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
    if (!canCreateEvaluation || !createContext || createLock.current) return;
    if(createContext.existingRecordId){
      const existingId=createContext.existingRecordId;
      handleCreateDialogOpenChange(false);
      router.push(`/evaluations/${existingId}`);
      return;
    }
    createLock.current=true;

    setCreatingEvaluation(true);
    try {
      const evaluation = await createEvaluation(token, {profileVersionId:createContext.profileVersionId,monitoringPeriodId:createContext.monitoringPeriodId});
      toast.success("Evaluasi berhasil dibuat.");
      handleCreateDialogOpenChange(false);
      router.push(`/evaluations/${evaluation.id}`);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Gagal membuat evaluasi.",
      );
    } finally {
      createLock.current=false;
      setCreatingEvaluation(false);
    }
  };

  return (
    <PageStack>
      <CollectionPageHeader title="Evaluasi" />

      <MetricGrid>
        {evaluationSummaryCards.map((card) => (
          <KpiCard
            key={card.label}
            label={card.label}
            value={card.value}
            tone="white"
          />
        ))}
      </MetricGrid>

      <div className="space-y-4">
      <CollectionToolbar
        leading={
          <EvaluationFiltersToolbar
            query={query}
            onQueryChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            queryPlaceholder="Cari evaluasi..."
            queryAriaLabel="Cari evaluasi"
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
            createdDateFilter={createdDateFilter}
            onCreatedDateFilterChange={(value) => {
              setCreatedDateFilter(value);
              setPage(1);
            }}
            status={status}
            onStatusChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            organizationRequired={requiresOrganizationSelection}
          />
        }
        actions={
          canCreateEvaluation ? (
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

      <CollectionTableCard sorting={collectionSort.controls}>
          <Table className="min-w-[1180px] table-fixed">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[32%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-40" />
              <col className="w-[12%]" />
            </colgroup>
            <CollectionTableHeader>
              <CollectionTableHeaderRow>
                <CollectionTableHead >
                  Kode
                </CollectionTableHead>
                <CollectionTableHead >
                  Organisasi
                </CollectionTableHead>
                <CollectionTableHead >
                  Template
                </CollectionTableHead>
                <CollectionTableHead >
                  Status
                </CollectionTableHead>
                <CollectionTableHead >
                  Diperbarui
                </CollectionTableHead>
                <CreatedAtHead />
                <CollectionTableHead className="text-right">
                  <span className="sr-only">Aksi</span>
                </CollectionTableHead>
              </CollectionTableHeaderRow>
            </CollectionTableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-left"
                  >
                    Memuat evaluasi...
                  </TableCell>
                </TableRow>
              ) : visibleEvaluations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-left"
                  >
                    <CollectionEmptyState
                      title="Belum ada evaluasi yang sesuai"
                      description="Coba ubah kata kunci atau sesuaikan filter."
                    />
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
                      className="hover:bg-muted/50"
                    >
                      <TableCell className="">
                        <CollectionCode code={evaluation.code} href={`/evaluations/${evaluation.id}`} />
                      </TableCell>
                      <TableCell className="">
                        <span className="text-sm font-medium text-foreground">
                          {orgName}
                        </span>
                      </TableCell>
                      <TableCell className="">
                        {evaluation.templateName || evaluation.templateId}
                      </TableCell>
                      <TableCell className="">
                        <Badge variant={statusStyles[evaluation.status]} className={getLinearStatusBadgeClassName(evaluation.status)}
                        >
                          {evaluationStatusLabel[evaluation.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="">
                        <span data-date-time="">{formatDateTime(evaluation.updatedAt)}</span>
                      </TableCell>
                      <CreatedAtCell record={evaluation} />
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <ActionButton
                                variant="ghost"
                                size="icon-xs"
                                className="text-muted-foreground"
                                icon={<MoreHorizontal className="size-3.5" />}
                                aria-label={`Aksi evaluasi ${evaluation.code || evaluation.id}`}
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
      </div>

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          if (!creatingEvaluation) handleCreateDialogOpenChange(open);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Buat evaluasi</DialogTitle>
            <DialogDescription>
              {canCreateEvaluation
                ? <>Draf evaluasi akan dibuat untuk <strong>{user?.orgName || "organisasi Anda"}</strong>.</>
                : "Akun Anda perlu terhubung ke organisasi untuk membuat evaluasi."}
            </DialogDescription>
          </DialogHeader>
          {createDialogOpen && token && user?.organizationId && <ProfilePeriodPicker
            key={`${user.organizationId}:${createDialogOpen}`}
            token={token} organizationId={user.organizationId} process="evaluation"
            initialProfileId={searchParams.get("profile_version_id") ?? ""}
            initialPeriodId={searchParams.get("monitoring_period_id") ?? ""}
            onChange={setCreateContext} />}
          <DialogFooter>
            <CollectionDialogCancel
              type="button"
              onClick={() => handleCreateDialogOpenChange(false)}
              disabled={creatingEvaluation}
            >
              Batal
            </CollectionDialogCancel>
            {canCreateEvaluation && (
              <AccentButton
                type="button"
                onClick={handleCreateEvaluation}
                disabled={creatingEvaluation || !createContext}
                aria-busy={creatingEvaluation}
                icon={creatingEvaluation ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : undefined}
              >
                {createContext?.existingRecordId ? "Lanjutkan draf" : "Buat draf"}
              </AccentButton>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}
