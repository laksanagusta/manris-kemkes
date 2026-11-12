"use client";

import { CollectionCode } from "@/components/shared/design-system/collections/collection-code";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { listUsers, type UserListItem } from "@/lib/api/users";
import {
  createWorkingPaper,
  findActiveWorkingPaperForPeriod,
  previewWorkingPaperRoster,
} from "@/lib/api/working-papers";
import { getWorkingPaperCreateErrorMessage } from "@/lib/api/working-paper-create-error";
import { createEmptyWorkingPaperSignatory } from "@/lib/working-paper-signatories";
import {
  buildInitialRosterDecisions,
  summarizeRosterDecisions,
  ROSTER_STATUS_LABELS,
  type RosterDecision,
} from "@/lib/working-paper-roster";
import type {
  WorkingPaperRosterPreview,
} from "@/types/working-paper";
import type { UserPickerOption } from "@/lib/risk-register-user-picker";
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";
import {
  currentMonitoringCycle,
  isCurrentMonitoringCycleAvailable,
  shiftMonitoringCycle,
} from "@/lib/risk-cycle-options";

import { FormPage, FormSection } from "@/components/shared/form-shell";
import {
  AccentButton,
  ActionButton,
  CollectionErrorState,
  CollectionEmptyState,
  FieldErrorMessage,
  CollectionLoadingState,
  CollectionPageHeader,
  CollectionSearchField,
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
} from "@/components/shared/design-system";
import { OrderedUserSelectionTable } from "@/components/risk/ordered-user-selection-table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Save } from "@/components/shared/icons";

const formSchema = z.object({
  assessment_cycle: z.string().optional(),
  signatories: z
    .array(
      z.object({
        user_id: z.string().min(1, "Pengguna harus dipilih"),
        signer_jabatan: z.string(),
        signer_pangkat: z.string(),
        signer_name: z.string(),
        signer_nip: z.string().optional(),
      }),
    )
    .min(1, "Minimal 1 penandatangan harus ditambahkan"),
});

type FormValues = z.infer<typeof formSchema>;

function normalizeAssessmentCycle(cycle: string) {
  const match = cycle.trim().match(/^(\d{4})-(H[12]|Q[1-4])$/i);
  if (!match) return cycle;
  const legacy = match[2].toUpperCase();
  const quarter = legacy === "H1" ? "Q2" : legacy === "H2" ? "Q4" : legacy;
  return `${match[1]}-${quarter}`;
}

function toUserPickerOption(user: UserListItem): UserPickerOption {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    subtitle: user.orgName || user.email,
    email: user.email,
    username: user.username,
    nip: user.nip,
    jabatan: user.jabatan,
    pangkat: user.pangkat,
    orgName: user.orgName,
  };
}

const ROSTER_STATUS_TO_TONE = {
  not_started: "neutral",
  in_progress: "info",
  finalized: "success",
} as const;

export default function CreateWorkingPaperPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();

  const currentCycle = currentMonitoringCycle();
  const previousCycle = shiftMonitoringCycle(currentCycle, -1);
  const requestedCycle = normalizeAssessmentCycle(
    searchParams.get("cycle") ?? previousCycle,
  );
  const assessmentCycle =
    requestedCycle === currentCycle && !isCurrentMonitoringCycleAvailable()
      ? previousCycle
      : requestedCycle;

  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [needsRosterRefresh, setNeedsRosterRefresh] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [rosterChanges, setRosterChanges] = useState<string[]>([]);
  const [organizationName, setOrganizationName] = useState<{ id: string; name: string } | null>(null);
  const previousPreviewRef = useRef<WorkingPaperRosterPreview | null>(null);
  const [preview, setPreview] =
    useState<WorkingPaperRosterPreview | null>(null);
  const [decisions, setDecisions] = useState<RosterDecision[]>([]);
  const [searchRisk, setSearchRisk] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assessment_cycle: assessmentCycle,
      signatories: [createEmptyWorkingPaperSignatory()],
    },
  });

  const {
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const {
    fields: signatoryFields,
    append: appendSignatory,
    move: moveSignatory,
    remove: removeSignatory,
  } = useFieldArray({
    control,
    name: "signatories",
  });

  const watchedSignatories = watch("signatories") ?? [];

  const organizationId = user?.isGlobal
    ? searchParams.get("org_id") ?? ""
    : (user?.organizationId ?? "");

  const reloadRoster = () => setReloadCount((count) => count + 1);
  const previewMatchesScope = preview?.organizationId === organizationId && preview.assessmentCycle === assessmentCycle;

  useEffect(() => {
    if (!token || !organizationId || (organizationId === user?.organizationId && user.orgName)) return;
    let active = true;
    void api.get<{ name: string }>(`/organizations/${encodeURIComponent(organizationId)}`, token).then((organization) => {
      if (active) setOrganizationName({ id: organizationId, name: organization.name });
    }).catch(() => {});
    return () => { active = false; };
  }, [token, organizationId, user?.organizationId, user?.orgName]);

  useEffect(() => {
    if (!token || !organizationId) return;
    let active = true;
    setLoadingPreview(true);
    setPreviewFailed(false);
    void previewWorkingPaperRoster(organizationId, assessmentCycle, token).then((result) => {
      if (!active) return;
      const previous = previousPreviewRef.current;
      const sameScope = previous?.organizationId === result.organizationId && previous.assessmentCycle === result.assessmentCycle;
      const changes: string[] = [];
      if (sameScope) {
        const oldEntries = new Map(previous.entries.map((entry) => [entry.versionGroupId, entry]));
        for (const entry of result.entries) {
          const old = oldEntries.get(entry.versionGroupId);
          if (!old) changes.push(`${entry.code} — risiko baru, disertakan`);
          else if (old.rosterStatus !== entry.rosterStatus || old.monitoringStatus !== entry.monitoringStatus || old.monitoringId !== entry.monitoringId || old.sourceRiskId !== entry.sourceRiskId || old.resultRiskId !== entry.resultRiskId) {
            changes.push(`${entry.code} — data diperbarui, ${ROSTER_STATUS_LABELS[entry.rosterStatus].toLowerCase()}`);
          }
          oldEntries.delete(entry.versionGroupId);
        }
        for (const entry of oldEntries.values()) changes.push(`${entry.code} — sudah keluar dari daftar periode`);
      }
      setDecisions((current) => buildInitialRosterDecisions(result, sameScope ? current : []));
      previousPreviewRef.current = result;
      setPreview(result);
      setRosterChanges(changes);
      setNeedsRosterRefresh(false);
    }).catch(() => {
      if (active) setPreviewFailed(true);
    }).finally(() => {
      if (active) setLoadingPreview(false);
    });
    return () => { active = false; };
  }, [token, organizationId, assessmentCycle, reloadCount]);

  const filteredEntries = previewMatchesScope
    ? preview.entries.filter(
        (e) =>
          e.title
            .toLowerCase()
            .includes(searchRisk.toLowerCase()) ||
          e.code
            .toLowerCase()
            .includes(searchRisk.toLowerCase()),
      )
    : [];

  const decisionMap = new Map(
    decisions.map((d) => [d.versionGroupId, d]),
  );

  const handleToggleEntry = (versionGroupId: string, checked: boolean) => {
    setDecisions((prev) =>
      prev.map((d) =>
        d.versionGroupId === versionGroupId
          ? { ...d, included: checked }
          : d,
      ),
    );
  };

  const handleToggleAll = (checked: boolean) => {
    const visibleIds = new Set(filteredEntries.map((entry) => entry.versionGroupId));
    setDecisions((prev) =>
      prev.map((decision) => visibleIds.has(decision.versionGroupId) ? { ...decision, included: checked } : decision),
    );
  };

  const loadSignatoryOptions = useCallback(
    async ({ q, page, limit }: { q: string; page: number; limit: number }) => {
      if (!token) {
        return { options: [], total: 0, page, limit };
      }
      const orgFilter = user?.isGlobal
        ? undefined
        : (user?.organizationId ?? undefined);
      const result = await listUsers(token, {
        q: q || undefined,
        page,
        limit,
        organizationId: orgFilter,
      });
      return {
        options: result.data.map(toUserPickerOption),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    },
    [token, user],
  );

  const handleUserSelect = useCallback(
    (rowId: string, option: UserPickerOption) => {
      const index = signatoryFields.findIndex(
        (field) => field.id === rowId,
      );
      if (index < 0) return;
      setValue(`signatories.${index}.user_id`, option.id, {
        shouldValidate: true,
      });
      setValue(`signatories.${index}.signer_name`, option.name, {
        shouldValidate: true,
      });
      setValue(
        `signatories.${index}.signer_nip`,
        option.nip || "",
        { shouldValidate: true },
      );
      setValue(
        `signatories.${index}.signer_jabatan`,
        option.jabatan || "",
        { shouldValidate: true },
      );
      setValue(
        `signatories.${index}.signer_pangkat`,
        option.pangkat || "",
        { shouldValidate: true },
      );
    },
    [setValue, signatoryFields],
  );

  const handleAddSignatory = useCallback(() => {
    appendSignatory(createEmptyWorkingPaperSignatory());
  }, [appendSignatory]);

  const handleRemoveSignatory = useCallback(
    (rowId: string) => {
      const index = signatoryFields.findIndex(
        (field) => field.id === rowId,
      );
      if (index >= 0) removeSignatory(index);
    },
    [removeSignatory, signatoryFields],
  );

  const signatoryRows = signatoryFields.map((field, index) => ({
    rowId: field.id,
    id: watchedSignatories[index]?.user_id ?? "",
    name: watchedSignatories[index]?.signer_name ?? "",
    nip: watchedSignatories[index]?.signer_nip ?? "",
    jabatan: watchedSignatories[index]?.signer_jabatan ?? "",
    pangkat: watchedSignatories[index]?.signer_pangkat ?? "",
  }));

  const summary = previewMatchesScope ? summarizeRosterDecisions(preview, decisions) : null;
  const canCreateDraft = Boolean(summary?.includedCount && !loadingPreview && !previewFailed && !needsRosterRefresh);
  const handleConfirmOpen = handleSubmit(() => {
    if (canCreateDraft) setShowConfirm(true);
  });

  const onSubmit: SubmitHandler<FormValues> = async (
    data: FormValues,
  ) => {
    if (!token || !preview || !canCreateDraft) return;
    setShowConfirm(false);
    try {
      const payload = {
        organization_id: preview.organizationId,
        assessment_cycle: preview.assessmentCycle,
        roster_revision: preview.revision,
        roster_decisions: decisions.map((d) => ({
          version_group_id: d.versionGroupId,
          included: d.included,
        })),
        signatories: data.signatories.map((sig, idx) => ({
          user_id: sig.user_id,
          sequence_no: idx + 1,
          signer_name: sig.signer_name,
          signer_jabatan: sig.signer_jabatan,
          signer_pangkat: sig.signer_pangkat,
          signer_nip: sig.signer_nip || undefined,
        })),
      };

      const result = await createWorkingPaper(payload, token);
      toast.success("Draf Kertas Kerja berhasil dibuat.");
      router.push(`/risk/working-papers/${result.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.type?.endsWith("/working-paper-roster-stale")) {
        setNeedsRosterRefresh(true);
        return;
      }
      if (error instanceof ApiError && error.type?.endsWith("/working-paper-period-conflict")) {
        const existing = await findActiveWorkingPaperForPeriod(token, preview.organizationId, preview.assessmentCycle).catch(() => null);
        if (existing) {
          toast.info("Kertas Kerja untuk periode ini sudah ada.");
          router.push(`/risk/working-papers/${existing.id}`);
          return;
        }
        toast.error("Kertas Kerja periode ini sudah ada. Buka daftar Kertas Kerja untuk melihatnya.");
        return;
      }
      const isClientError =
        error instanceof ApiError && error.status >= 400 && error.status < 500;
      if (!isClientError) {
        console.error("Failed to create working paper", error);
      }
      toast.error(getWorkingPaperCreateErrorMessage(error));
    }
  };

  if (!organizationId) {
    return (
      <FormPage className="space-y-6 pb-0">
      <CollectionPageHeader
        title="Buat Kertas Kerja Baru"
        />
        <CollectionEmptyState
          title="Unit kerja belum dipilih"
          description="Pilih unit kerja terlebih dahulu untuk memuat roster risiko."
        />
      </FormPage>
    );
  }

  const unitName = organizationId === user?.organizationId && user.orgName
    ? user.orgName
    : organizationName?.id === organizationId ? organizationName.name : "Unit terpilih";

  return (
    <FormPage className="space-y-6 pb-0">
      <CollectionPageHeader
        actionsPlacement="top"
        title="Buat Kertas Kerja Baru"
        eyebrow={
          <Badge variant="outline" className="">
            {unitName} · {assessmentCycle}
          </Badge>
        }
        actions={
          <AccentButton
            type="button"
            onClick={handleConfirmOpen}
            disabled={isSubmitting || !canCreateDraft}
            icon={
              isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )
            }
          >
            {isSubmitting ? "Menyimpan…" : "Buat draf Kertas Kerja"}
          </AccentButton>
        }
      />

      <form
        id="working-paper-create-form"
        onSubmit={handleConfirmOpen}
        className="space-y-6"
      >
        <FormSection
          title="Daftar Risiko"
          action={
            <CollectionSearchField
              value={searchRisk}
              onChange={(event) => setSearchRisk(event.target.value)}
              placeholder="Cari judul atau kode risiko"
              aria-label="Cari judul atau kode risiko"
            />
          }
        >

          {needsRosterRefresh && (
            <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg bg-state-surface p-3 text-sm text-state-foreground">
              <p>Daftar risiko atau hasil Pemantauan berubah. Muat daftar terbaru sebelum membuat draf.</p>
              <ActionButton type="button" size="sm" onClick={reloadRoster} disabled={loadingPreview}>Muat daftar terbaru</ActionButton>
            </div>
          )}
          {rosterChanges.length > 0 && (
            <details className="rounded-lg border border-border p-3 text-sm">
              <summary className="cursor-pointer font-medium">{rosterChanges.length} perubahan pada daftar risiko</summary>
              <ul className="mt-2 list-disc space-y-1 ps-5">{rosterChanges.map((change, index) => <li key={index}>{change}</li>)}</ul>
            </details>
          )}
          {summary && summary.eligibleCount > 0 && (
            <p role="status" className="text-sm text-muted-foreground">
              {summary.includedCount} risiko disertakan · {summary.finalizedCount} pemantauan final · {summary.notStartedCount + summary.inProgressCount} belum final · {summary.excludedCount} dikecualikan
              {summary.includedCount === 0 && ". Sertakan minimal satu risiko untuk membuat draf."}
            </p>
          )}
          {loadingPreview ? (
            <CollectionLoadingState message="Memuat daftar risiko…" />
          ) : previewFailed ? (
            <CollectionErrorState
              title="Daftar risiko gagal dimuat"
              message={previewMatchesScope ? "Pilihan yang sudah dibuat tetap tersedia." : "Coba muat lagi daftar risiko untuk periode ini."}
              onReload={reloadRoster}
            />
          ) : !previewMatchesScope || preview.entries.length === 0 ? (
            <CollectionEmptyState
              title="Belum ada risiko aktif untuk siklus ini"
              description={`Tidak ada risiko final pada siklus ${assessmentCycle} untuk unit kerja ini.`}
            />
          ) : filteredEntries.length === 0 ? (
            <CollectionEmptyState
              title="Risiko tidak ditemukan"
              description="Ubah kata kunci pencarian untuk melihat risiko lain."
            />
          ) : (
            <CollectionTableCard>
              <Table className="min-w-[880px] table-fixed">
              <CollectionTableHeader
                density="compact"
                className="sticky top-0 z-10"
              >
                <CollectionTableHeaderRow>
                  <CollectionTableHead className="w-[18%] min-w-0 align-middle">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={
                          filteredEntries.length > 0 &&
                          filteredEntries.every((entry) => decisionMap.get(entry.versionGroupId)?.included)
                            ? true
                            : filteredEntries.some((entry) => decisionMap.get(entry.versionGroupId)?.included) ? "indeterminate" : false
                        }
                        onCheckedChange={(checked) =>
                          handleToggleAll(!!checked)
                        }
                        aria-label="Sertakan semua risiko yang ditampilkan"
                      />
                      <span>Kode</span>
                    </div>
                  </CollectionTableHead>
                  <CollectionTableHead className="w-[14%] min-w-0 whitespace-normal text-center">
                    Periode
                  </CollectionTableHead>
                  <CollectionTableHead className="w-[44%] min-w-0">
                    Judul risiko
                  </CollectionTableHead>
                  <CollectionTableHead className="w-[24%] min-w-0 whitespace-normal text-center">
                    Status monitoring
                  </CollectionTableHead>
                </CollectionTableHeaderRow>
              </CollectionTableHeader>
              <TableBody>
                {filteredEntries.map((entry) => {
                  const decision = decisionMap.get(entry.versionGroupId);
                  const isIncluded = decision?.included ?? true;

                  return (
                    <TableRow
                      key={entry.versionGroupId}
                      className="hover:bg-muted/30"
                    >
                      <TableCell className="w-[18%] min-w-0 align-middle">
                        <div className="flex min-w-0 items-center gap-2">
                          <Checkbox
                            checked={isIncluded}
                            onCheckedChange={(checked) =>
                              handleToggleEntry(
                                entry.versionGroupId,
                                !!checked,
                              )
                            }
                            aria-label={`Sertakan risiko ${entry.code}`}
                          />
                          <CollectionCode code={entry.code} href={`/risk/register/${entry.sourceRiskId}`} />
                        </div>
                      </TableCell>
                      <TableCell className="w-[14%] min-w-0 text-center">
                        <span
                          className="block truncate"
                          title={entry.monitoringCycle}
                        >
                          {entry.monitoringCycle}
                        </span>
                      </TableCell>
                      <TableCell className="w-[44%] min-w-0">
                        <span
                          className="block max-w-full truncate text-sm font-medium text-foreground"
                          title={entry.title}
                        >
                          {entry.title}
                        </span>
                      </TableCell>
                      <TableCell className="w-[24%] min-w-0 text-center">
                        <Badge variant={toBadgeVariant(
                            ROSTER_STATUS_TO_TONE[entry.rosterStatus] ??
                            "neutral"
                          )}
                          className={`max-w-full truncate ${getStatusBadgeClassName(ROSTER_STATUS_TO_TONE[entry.rosterStatus] ?? "neutral")}`}
                        >
                          {ROSTER_STATUS_LABELS[entry.rosterStatus]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              </Table>
            </CollectionTableCard>
          )}
        </FormSection>

        <FormSection
          title="Konfigurasi Penandatangan"
          action={
            <Badge variant="secondary">
              {signatoryFields.length} penandatangan
            </Badge>
          }
        >

          <FieldErrorMessage
            className="rounded-lg border border-destructive/20 bg-destructive/[0.04] px-3 py-2"
          >
            {typeof errors.signatories?.message === "string"
              ? errors.signatories.message
              : undefined}
          </FieldErrorMessage>

          <OrderedUserSelectionTable
            rows={signatoryRows}
            loadOptions={loadSignatoryOptions}
            onSelectRow={handleUserSelect}
            onAddRow={handleAddSignatory}
            onRemoveRow={handleRemoveSignatory}
            onMoveRow={moveSignatory}
            pickerTitle="Pilih penandatangan"
            pickerDescription="Cari penandatangan yang akan dimasukkan ke urutan dokumen kertas kerja."
            pickerPlaceholder="Pilih penandatangan"
            pickerSearchPlaceholder="Cari pengguna"
            pickerEmptyMessage="Penandatangan tidak ditemukan."
            emptyStateMessage="Belum ada penandatangan. Tambahkan minimal satu user untuk menyusun urutan tanda tangan."
            addRowLabel="Tambah Penandatangan"
            footerNote="Penandatangan akan menerima giliran sesuai urutan dari atas ke bawah."
            canRemoveRow={() => signatoryFields.length > 1}
            getRowError={(_, index) =>
              errors.signatories?.[index]?.user_id?.message
            }
            dndGroup="working-paper-signatories"
          />
        </FormSection>
      </form>

      {summary && (
        <AlertDialog
          open={showConfirm}
          onOpenChange={setShowConfirm}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Buat draf Kertas Kerja</AlertDialogTitle>
              <AlertDialogDescription>
                Daftar risiko yang dipilih akan disimpan untuk {unitName}, periode {preview?.monitoringCycle}.
                Pemantauan yang belum final dapat dilengkapi sebelum tanda tangan dimulai.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">
                  Risiko tersedia
                </dt>
                <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-foreground">
                  {summary.eligibleCount}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Disertakan</dt>
                <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-foreground">
                  {summary.includedCount}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Dikecualikan
                </dt>
                <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-foreground">
                  {summary.excludedCount}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Pemantauan final</dt>
                <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-foreground">
                  {summary.finalizedCount}
                </dd>
              </div>
            </dl>
            <AlertDialogFooter>
              <AlertDialogCancel variant="outline" size="default">
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                variant="default"
                size="default"
                onClick={handleSubmit(onSubmit)}
                disabled={!canCreateDraft || isSubmitting}
              >
                Buat draf Kertas Kerja
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

    </FormPage>
  );
}
