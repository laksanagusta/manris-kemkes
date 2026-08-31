"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { listUsers, type UserListItem } from "@/lib/api/users";
import {
  createWorkingPaper,
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

import { FormPage, FormSection } from "@/components/shared/form-shell";
import {
  ActionButton,
  AccentButton,
  CollectionEmptyState,
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
import { ArrowLeft, Loader2, Save } from "@/components/ui/icons";

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

  const assessmentCycle = normalizeAssessmentCycle(
    searchParams.get("cycle") ??
      `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`,
  );

  const [loadingPreview, setLoadingPreview] = useState(true);
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

  useEffect(() => {
    if (!token || !organizationId) return;
    let cancelled = false;

    const fetchPreview = async () => {
      try {
        setLoadingPreview(true);
        const result = await previewWorkingPaperRoster(
          organizationId,
          assessmentCycle,
          token,
        );
        if (cancelled) return;
        setPreview(result);
        setDecisions(buildInitialRosterDecisions(result));
      } catch (error) {
        console.error("Failed to load roster preview", error);
        toast.error("Gagal memuat roster risiko untuk periode ini.");
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    };

    fetchPreview();
    return () => {
      cancelled = true;
    };
  }, [token, organizationId, assessmentCycle]);

  const filteredEntries = preview
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
    setDecisions((prev) =>
      prev.map((d) => ({ ...d, included: checked })),
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

  const handleConfirmOpen = () => {
    setShowConfirm(true);
  };

  const onSubmit: SubmitHandler<FormValues> = async (
    data: FormValues,
  ) => {
    if (!token || !preview) return;
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
      toast.success("Kertas kerja berhasil dibuat");
      router.push(`/risk/working-papers/${result.id}`);
    } catch (error) {
      console.error(error);
      toast.error(getWorkingPaperCreateErrorMessage(error));
    }
  };

  const backAction = (
    <ActionButton
      asChild
      variant="secondary"
      size="sm"
    >
      <Link href="/risk/working-papers">
        <ArrowLeft className="size-3.5" />
        Kembali ke daftar kertas kerja
      </Link>
    </ActionButton>
  );

  if (!organizationId) {
    return (
      <FormPage className="max-w-7xl space-y-6 pb-0">
        <CollectionPageHeader
          backAction={backAction}
          title="Buat Kertas Kerja Baru"
        />
        <CollectionEmptyState
          title="Unit kerja belum dipilih"
          description="Pilih unit kerja terlebih dahulu untuk memuat roster risiko."
        />
      </FormPage>
    );
  }

  const summary = preview
    ? summarizeRosterDecisions(preview, decisions)
    : null;

  return (
    <FormPage className="max-w-7xl space-y-6 pb-0">
      <CollectionPageHeader
        backAction={backAction}
        actionsPlacement="title"
        title="Buat Kertas Kerja Baru"
        eyebrow={
          <Badge tone="info" size="micro" className="font-mono tracking-tight">
            Siklus asesmen {assessmentCycle}
          </Badge>
        }
        actions={
          <AccentButton
            type="button"
            onClick={handleConfirmOpen}
            disabled={isSubmitting || loadingPreview}
            icon={
              isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )
            }
          >
            {isSubmitting ? "Menyimpan..." : "Buat Kertas Kerja"}
          </AccentButton>
        }
      />

      <form
        id="working-paper-create-form"
        onSubmit={handleSubmit(onSubmit)}
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
              containerClassName="w-full sm:w-80"
            />
          }
        >

          {loadingPreview ? (
            <CollectionLoadingState message="Memuat roster risiko..." />
          ) : !preview || preview.entries.length === 0 ? (
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
              <Table className="w-full table-fixed">
              <CollectionTableHeader
                density="compact"
                className="sticky top-0 z-10"
              >
                <CollectionTableHeaderRow>
                  <CollectionTableHead className="w-[18%] min-w-0 px-2 align-middle">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={
                          decisions.length > 0 &&
                          decisions.every((d) => d.included)
                        }
                        onCheckedChange={(checked) =>
                          handleToggleAll(!!checked)
                        }
                        aria-label="Pilih semua risiko"
                      />
                      <span>Kode</span>
                    </div>
                  </CollectionTableHead>
                  <CollectionTableHead className="w-[14%] min-w-0 whitespace-normal px-2 text-center leading-tight">
                    Periode
                  </CollectionTableHead>
                  <CollectionTableHead className="w-[44%] min-w-0 px-2">
                    Judul risiko
                  </CollectionTableHead>
                  <CollectionTableHead className="w-[24%] min-w-0 whitespace-normal px-2 text-center leading-tight">
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
                      className="h-14 border-b border-border/60 hover:bg-muted/30"
                    >
                      <TableCell className="w-[18%] min-w-0 px-2 py-3 align-middle">
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
                          <span
                            className="block min-w-0 truncate font-mono text-xs font-medium text-foreground"
                            title={entry.code}
                          >
                            {entry.code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="w-[14%] min-w-0 px-2 py-3 text-center font-mono text-xs text-muted-foreground">
                        <span
                          className="block truncate"
                          title={entry.monitoringCycle}
                        >
                          {entry.monitoringCycle}
                        </span>
                      </TableCell>
                      <TableCell className="w-[44%] min-w-0 px-2 py-3">
                        <span
                          className="block max-w-full truncate text-sm font-medium text-foreground"
                          title={entry.title}
                        >
                          {entry.title}
                        </span>
                      </TableCell>
                      <TableCell className="w-[24%] min-w-0 px-2 py-3 text-center">
                        <Badge
                          tone={
                            ROSTER_STATUS_TO_TONE[entry.rosterStatus] ??
                            "neutral"
                          }
                          size="micro"
                          className="max-w-full truncate"
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
            <Badge tone="neutral" size="compact">
              {signatoryFields.length} penandatangan
            </Badge>
          }
        >

          {errors.signatories &&
            typeof errors.signatories.message === "string" && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/[0.04] px-3 py-2 text-xs text-destructive">
                {errors.signatories.message}
              </p>
            )}

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
            footerNote="Urutan baris menentukan sequence penandatangan pada payload dokumen."
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
              <AlertDialogTitle>Konfirmasi Kertas Kerja</AlertDialogTitle>
              <AlertDialogDescription>
                Snapshot risiko akan dibuat untuk siklus{" "}
                <span className="font-medium text-foreground">
                  {preview?.monitoringCycle}
                </span>
                . Pemantauan selanjutnya dilakukan dari menu Risiko.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <dl className="grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-3">
              <div className="rounded-lg bg-card px-3 py-2">
                <dt className="text-xs text-muted-foreground">
                  Risiko eligible
                </dt>
                <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-foreground">
                  {summary.eligibleCount}
                </dd>
              </div>
              <div className="rounded-lg bg-card px-3 py-2">
                <dt className="text-xs text-muted-foreground">Termasuk</dt>
                <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-foreground">
                  {summary.includedCount}
                </dd>
              </div>
              <div className="rounded-lg bg-card px-3 py-2">
                <dt className="text-xs text-muted-foreground">
                  Dikecualikan
                </dt>
                <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-foreground">
                  {summary.excludedCount}
                </dd>
              </div>
              <div className="rounded-lg bg-card px-3 py-2">
                <dt className="text-xs text-muted-foreground">Sudah final</dt>
                <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-foreground">
                  {summary.finalizedCount}
                </dd>
              </div>
            </dl>
            <AlertDialogFooter>
              <AlertDialogCancel variant="outline" size="md">
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                variant="primary"
                size="primary"
                onClick={handleSubmit(onSubmit)}
              >
                Buat Kertas Kerja
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

    </FormPage>
  );
}
