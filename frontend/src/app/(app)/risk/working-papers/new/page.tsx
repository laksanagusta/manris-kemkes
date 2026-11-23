"use client";

import { getProfilePeriodProgress } from "@/lib/api/profile-periods";
import { periodObservationDate, periodWindowState } from "@/lib/profile-period-progress";
import { todayMonitoringDate } from "@/lib/monitoring-date";
import { ConfirmationConsequences } from "@/components/shared/design-system/actions/confirmation-consequences";
import { CollectionCode } from "@/components/shared/design-system/collections/collection-code";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  previewWorkingPaperRoster,
} from "@/lib/api/working-papers";
import { getWorkingPaperCreateErrorMessage } from "@/lib/api/working-paper-create-error";
import { createEmptyWorkingPaperSignatory } from "@/lib/working-paper-signatories";
import {
  ROSTER_STATUS_LABELS,
} from "@/lib/working-paper-roster";
import type {
  WorkingPaperRosterPreview,
} from "@/types/working-paper";
import type { UserPickerOption } from "@/lib/risk-register-user-picker";
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";

import { FormPage, FormSection } from "@/components/shared/form-shell";
import {
  AccentButton,
  ActionButton,
  CollectionErrorState,
  CollectionEmptyState,
  FieldErrorMessage,
  TableLoadingSkeleton,
  CollectionPageHeader,
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
} from "@/components/shared/design-system";
import { OrderedUserSelectionTable } from "@/components/risk/ordered-user-selection-table";
import { useSetHeaderActions } from "@/lib/header-actions-context";
import Link from "next/link";
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
  const setHeaderActions = useSetHeaderActions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();

  const profileVersionId = searchParams.get("profile_version_id") ?? "";
  const requestedCutoff = searchParams.get("observation_cutoff") ?? undefined;
  const monitoringPeriodId=searchParams.get("monitoring_period_id") ?? undefined;
  const [reloadCount, setReloadCount] = useState(0);
  const [periodContext,setPeriodContext]=useState<{key:string;cutoff?:string;error?:string}|null>(null);
  const periodContextKey=`${token}:${profileVersionId}:${monitoringPeriodId??""}:${requestedCutoff??""}`;
  const observationCutoff=periodContext?.key===periodContextKey ? periodContext.cutoff : undefined;
  useEffect(()=>{
    if(!token || !profileVersionId) return;
    let active=true;
    getProfilePeriodProgress(token,profileVersionId).then(workspace=>{
      if(!active) return;
      let cutoff=requestedCutoff;
      if(workspace.rule){
        const period=workspace.periods.find(p=>p.id===monitoringPeriodId);
        if(!period) throw new Error("Pilih periode pemantauan dari profil risiko atau menu Buat KK.");
        if(periodWindowState(period)!=='open') throw new Error("Periode pengisian belum dibuka atau sudah ditutup.");
        if(period.workingPaper.id) { router.replace(`/risk/working-papers/${period.workingPaper.id}`); return; }
        cutoff=periodObservationDate(workspace.rule,period,todayMonitoringDate());
      }
      if(active)setPeriodContext({key:periodContextKey,cutoff});
    }).catch(error=>{if(active)setPeriodContext({key:periodContextKey,error:error instanceof Error?error.message:"Jadwal gagal dimuat."});});
    return()=>{active=false;};
  },[token,profileVersionId,monitoringPeriodId,requestedCutoff,periodContextKey,router,reloadCount]);


  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState("");
  const [needsRosterRefresh, setNeedsRosterRefresh] = useState(false);
  const [rosterChanges, setRosterChanges] = useState<string[]>([]);
  const [organizationName, setOrganizationName] = useState<{ id: string; name: string } | null>(null);
  const previousPreviewRef = useRef<WorkingPaperRosterPreview | null>(null);
  const [previewPeriodKey,setPreviewPeriodKey] = useState("");
  const [preview, setPreview] =
    useState<WorkingPaperRosterPreview | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
    ? searchParams.get("org_id") ?? user.organizationId ?? ""
    : (user?.organizationId ?? "");

  const reloadRoster = () => setReloadCount((count) => count + 1);
  const previewMatchesScope = previewPeriodKey === periodContextKey && !periodContext?.error && periodContext?.key === periodContextKey && preview?.organizationId === organizationId && preview.profileVersionId === profileVersionId && (!observationCutoff || preview.observationCutoff === observationCutoff);

  useEffect(() => {
    if (!token || !organizationId || (organizationId === user?.organizationId && user.orgName)) return;
    let active = true;
    void api.get<{ name: string }>(`/organizations/${encodeURIComponent(organizationId)}`, token).then((organization) => {
      if (active) setOrganizationName({ id: organizationId, name: organization.name });
    }).catch(() => {});
    return () => { active = false; };
  }, [token, organizationId, user?.organizationId, user?.orgName]);

  useEffect(() => {
    if (!token || !organizationId || !profileVersionId || periodContext?.key!==periodContextKey) return;
    if(periodContext.error){setPreviewError(periodContext.error);setLoadingPreview(false);return;}
    let active = true;
    setLoadingPreview(true);
    setPreviewError("");
    void previewWorkingPaperRoster(organizationId, profileVersionId, token, observationCutoff, monitoringPeriodId).then((result) => {
      if (!active) return;
      const previous = previousPreviewRef.current;
      const sameScope = previous?.organizationId === result.organizationId && previous.profileVersionId === result.profileVersionId && previous.observationCutoff === result.observationCutoff;
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
      previousPreviewRef.current = result;
      setPreview(result);
      setPreviewPeriodKey(periodContextKey);
      setRosterChanges(changes);
      setNeedsRosterRefresh(false);
    }).catch((error: unknown) => {
      if (active) setPreviewError(error instanceof Error ? error.message : "Daftar risiko gagal dimuat.");
    }).finally(() => {
      if (active) setLoadingPreview(false);
    });
    return () => { active = false; };
  }, [token, organizationId, profileVersionId, observationCutoff, monitoringPeriodId, periodContext, periodContextKey, reloadCount]);

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

  const summary = previewMatchesScope ? preview.summary : null;
  const canCreateDraft = Boolean(previewMatchesScope && summary?.eligibleCount && !loadingPreview && !previewError && !needsRosterRefresh);
  const handleConfirmOpen = handleSubmit(() => {
    if (canCreateDraft) setShowConfirm(true);
  });
  const headerActions = useMemo(() => (
    <AccentButton
      type="submit"
      form="working-paper-create-form"
      disabled={isSubmitting || !canCreateDraft}
      icon={
        isSubmitting ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Save className="size-3.5" />
        )
      }
    >
      {isSubmitting ? "Menyimpan…" : "Buat draf KK Pemantauan dan Reviu"}
    </AccentButton>
  ), [canCreateDraft, isSubmitting]);

  useEffect(() => {
    if (!organizationId || !profileVersionId) return;
    setHeaderActions(headerActions);
    return () => setHeaderActions(null);
  }, [headerActions, organizationId, profileVersionId, setHeaderActions]);

  const onSubmit: SubmitHandler<FormValues> = async (
    data: FormValues,
  ) => {
    if (!token || !preview || !canCreateDraft) return;
    setShowConfirm(false);
    try {
      const payload = {
        organization_id: preview.organizationId,
        roster_revision: preview.revision,
        profile_version_id: preview.profileVersionId,
        monitoring_period_id: monitoringPeriodId,
        observation_cutoff: preview.observationCutoff,
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
      toast.success("Draf KK Pemantauan dan Reviu berhasil dibuat.");
      router.push(`/risk/working-papers/${result.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.type?.endsWith("/working-paper-roster-stale")) {
        setNeedsRosterRefresh(true);
        return;
      }
      if (error instanceof ApiError && error.type?.endsWith("/working-paper-period-conflict")) {
        toast.error("KK untuk profil dan tanggal batas ini sudah ada. Buka daftar KK untuk melihatnya.");
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

  if (!organizationId || !profileVersionId) {
    return (
      <FormPage className="space-y-6 pb-0">
      <CollectionPageHeader
        title="Buat KK Pemantauan dan Reviu Baru"
        />
        <CollectionEmptyState
          title="Profil Risiko Tahunan belum dipilih"
          description="Buka daftar KK dan pilih versi profil final untuk memulai."
          action={<ActionButton asChild><Link href="/risk/working-papers">Buka daftar KK</Link></ActionButton>}
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
        title="Buat KK Pemantauan dan Reviu Baru"
        eyebrow={
          <Badge variant="outline" className="">
            {unitName}{previewMatchesScope ? ` · ${preview.profileLabel} · Per ${preview.observationCutoff}` : ""}
          </Badge>
        }
      />

      <form
        id="working-paper-create-form"
        onSubmit={handleConfirmOpen}
        className="space-y-6"
      >
        <FormSection title="Daftar Risiko">
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
              {summary.eligibleCount} risiko disertakan · {summary.finalizedCount} pemantauan final · {summary.notStartedCount + summary.inProgressCount} belum final
            </p>
          )}
          {loadingPreview ? (
            <TableLoadingSkeleton message="Memuat daftar risiko…" />
          ) : previewError ? (
            <CollectionErrorState
              title="Daftar risiko gagal dimuat"
              message={previewError}
              onReload={reloadRoster}
            />
          ) : !previewMatchesScope || preview.entries.length === 0 ? (
            <CollectionEmptyState
              title="Profil belum berisi risiko"
              description="Pilih versi profil final yang memiliki anggota risiko."
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
                    Kode
                  </CollectionTableHead>
                  <CollectionTableHead className="w-[44%] min-w-0">
                    Risiko
                  </CollectionTableHead>
                  <CollectionTableHead className="w-[14%] min-w-0 whitespace-normal text-center">
                    Tanggal pengamatan
                  </CollectionTableHead>
                  <CollectionTableHead className="w-[24%] min-w-0 whitespace-normal text-center">
                    Status Pemantauan
                  </CollectionTableHead>
                </CollectionTableHeaderRow>
              </CollectionTableHeader>
              <TableBody>
                {preview.entries.map((entry) => {

                  return (
                    <TableRow
                      key={entry.versionGroupId}
                      className="hover:bg-muted/30"
                    >
                      <TableCell className="w-[18%] min-w-0 align-middle">
                        <div className="flex min-w-0 items-center gap-2">
                          <CollectionCode code={entry.code} href={`/risk/register/${entry.sourceRiskId}`} />
                        </div>
                      </TableCell>
                      <TableCell className="w-[44%] min-w-0">
                        <span
                          className="block max-w-full truncate text-sm font-medium text-foreground"
                          title={entry.title}
                        >
                          {entry.title}
                        </span>
                      </TableCell>
                      <TableCell className="w-[14%] min-w-0 text-center">
                        {entry.observedAt || "—"}
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
            pickerDescription="Cari penandatangan untuk ditambahkan ke urutan tanda tangan."
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
              <AlertDialogTitle>Buat draf KK Pemantauan dan Reviu</AlertDialogTitle>
              <AlertDialogDescription>Periksa profil, unit, dan tanggal batas pemantauan.</AlertDialogDescription>
            </AlertDialogHeader>
            <ConfirmationConsequences variant="plain">
              Draf KK untuk {unitName} memuat semua risiko {preview?.profileLabel}
              hingga {preview?.observationCutoff}. Pemantauan belum final dapat
              dilengkapi sebelum tanda tangan.
            </ConfirmationConsequences>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">Risiko dalam KK</dt>
                <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-foreground">
                  {summary.eligibleCount}
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
                Buat draf KK Pemantauan dan Reviu
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

    </FormPage>
  );
}
