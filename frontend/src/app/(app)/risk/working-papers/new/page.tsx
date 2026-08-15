"use client";

import { useCallback, useEffect, useState } from "react";
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
  validateRosterDecisions,
  ROSTER_STATUS_LABELS,
  type RosterDecision,
} from "@/lib/working-paper-roster";
import type {
  WorkingPaperRosterPreview,
} from "@/types/working-paper";
import type { UserPickerOption } from "@/lib/risk-register-user-picker";

import {
  FormPage,
  FormHeader,
  FormSection,
} from "@/components/shared/form-shell";
import { OrderedUserSelectionTable } from "@/components/risk/ordered-user-selection-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
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
import { Loader2, Save, FileSearch, X } from "@/components/ui/icons";

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
  finalized_result: "success",
  existing_draft: "neutral",
  draft_will_be_created: "info",
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
  const [decisionErrors, setDecisionErrors] = useState<
    Record<string, string>
  >({});
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
        setDecisionErrors({});
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
          ? {
              ...d,
              included: checked,
              exclusionReason: checked ? "" : d.exclusionReason,
            }
          : d,
      ),
    );
    setDecisionErrors((prev) => {
      const next = { ...prev };
      delete next[versionGroupId];
      return next;
    });
  };

  const handleToggleAll = (checked: boolean) => {
    setDecisions((prev) =>
      prev.map((d) => ({ ...d, included: checked })),
    );
    if (checked) setDecisionErrors({});
  };

  const handleExclusionReasonChange = (
    versionGroupId: string,
    reason: string,
  ) => {
    setDecisions((prev) =>
      prev.map((d) =>
        d.versionGroupId === versionGroupId
          ? { ...d, exclusionReason: reason }
          : d,
      ),
    );
    setDecisionErrors((prev) => {
      const next = { ...prev };
      if (reason.trim()) {
        delete next[versionGroupId];
      }
      return next;
    });
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
    const errs = validateRosterDecisions(decisions);
    if (Object.keys(errs).length > 0) {
      setDecisionErrors(errs);
      return;
    }
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
          exclusion_reason: d.included
            ? undefined
            : d.exclusionReason,
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

  if (!organizationId) {
    return (
      <FormPage className="space-y-6 pb-0">
        <FormHeader
          title="Buat Kertas Kerja Baru"
        />
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Pilih unit kerja terlebih dahulu untuk melihat roster risiko.
          </p>
        </div>
      </FormPage>
    );
  }

  const summary = preview
    ? summarizeRosterDecisions(preview, decisions)
    : null;

  return (
    <FormPage className="space-y-6 pb-0">
      <FormHeader
        title="Buat Kertas Kerja Baru"
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            Roster risiko kuartal{" "}
            <Badge
              tone="info"
              size="micro"
              className="font-mono"
            >
              {assessmentCycle}
            </Badge>
            {preview && (
              <span className="text-muted-foreground">
                — {preview.monitoringCycle}
              </span>
            )}
          </span>
        }
        actions={
          <Button
            onClick={handleConfirmOpen}
            disabled={isSubmitting || loadingPreview}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Buat Kertas Kerja
              </>
            )}
          </Button>
        }
      />

      <form
        id="working-paper-create-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-8"
      >
        <FormSection
          title="Daftar Risiko"
          description={`Risiko yang aktif pada kuartal ${assessmentCycle}. Semua risiko otomatis dipilih. Risiko yang dikecualikan wajib diberi alasan.`}
          action={
            <Badge tone="neutral" size="micro">
              {decisions.filter((d) => d.included).length} dipilih dari{" "}
              {decisions.length} risiko
            </Badge>
          }
          className="rounded-lg ring-1 ring-inset ring-border border-0"
          contentClassName="space-y-4"
        >
          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative flex-1">
              <Input
                placeholder="Cari judul atau kode risiko..."
                value={searchRisk}
                onChange={(e) => setSearchRisk(e.target.value)}
                className="h-9 pr-8"
              />
              {searchRisk && (
                <button
                  type="button"
                  onClick={() => setSearchRisk("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {loadingPreview ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Memuat
              roster risiko...
            </div>
          ) : !preview || preview.entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <div className="inline-flex size-12 items-center justify-center rounded-full bg-muted">
                <FileSearch className="size-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Belum ada risiko aktif untuk kuartal ini
                </p>
                <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                  Tidak ada risiko final dalam periode kuartal{" "}
                  {assessmentCycle} untuk unit kerja ini.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg bg-card smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
              <div className="relative w-full overflow-x-auto">
                <Table className="w-full caption-bottom text-sm">
                  <TableHeader className="sticky top-0 z-10 bg-table-header [&_tr]:border-b">
                    <TableRow>
                      <TableHead className="h-10 px-2 text-center w-[50px]">
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
                      </TableHead>
                      <TableHead className="h-10 px-2 w-[100px]">
                        Kode
                      </TableHead>
                      <TableHead className="h-10 px-2 w-[90px] text-center">
                        Versi Sumber
                      </TableHead>
                      <TableHead className="h-10 px-2 w-[140px] text-center">
                        Periode
                      </TableHead>
                      <TableHead className="h-10 px-2 max-w-[280px]">
                        Judul Risiko
                      </TableHead>
                      <TableHead className="h-10 px-2 w-[220px] text-center">
                        Status Monitoring
                      </TableHead>
                      <TableHead className="h-10 px-2 w-[280px]">
                        Alasan Pengecualian
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => {
                      const decision = decisionMap.get(
                        entry.versionGroupId,
                      );
                      const isIncluded =
                        decision?.included ?? true;
                      const error =
                        decisionErrors[entry.versionGroupId];

                      return (
                        <TableRow
                          key={entry.versionGroupId}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell className="p-2 text-center">
                            <Checkbox
                              checked={isIncluded}
                              onCheckedChange={(checked) =>
                                handleToggleEntry(
                                  entry.versionGroupId,
                                  !!checked,
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="p-2 whitespace-nowrap">
                            <span className="text-sm font-medium text-foreground">
                              {entry.code}
                            </span>
                          </TableCell>
                          <TableCell className="p-2 whitespace-nowrap text-center">
                            <Badge
                              tone="neutral"
                              size="micro"
                            >
                              v{entry.sourceVersionNumber}
                            </Badge>
                            {entry.resultVersionNumber && (
                              <Badge
                                tone="info"
                                size="micro"
                                className="ml-1"
                              >
                                Hasil: v{entry.resultVersionNumber}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="p-2 whitespace-nowrap text-center text-sm text-muted-foreground">
                            {entry.monitoringCycle}
                          </TableCell>
                          <TableCell className="p-2 whitespace-nowrap">
                            <span
                              className="block max-w-[280px] truncate text-sm font-medium text-foreground"
                              title={entry.title}
                            >
                              {entry.title}
                            </span>
                          </TableCell>
                          <TableCell className="p-2 text-center">
                            <Badge
                              tone={ROSTER_STATUS_TO_TONE[entry.rosterStatus] ?? "neutral"}
                              size="micro"
                            >
                              {ROSTER_STATUS_LABELS[entry.rosterStatus]}
                            </Badge>
                          </TableCell>
                          <TableCell className="p-2">
                            {isIncluded ? (
                              <span className="text-sm text-muted-foreground">
                                &mdash;
                              </span>
                            ) : (
                              <div>
                                <Input
                                  placeholder="Alasan pengecualian"
                                  value={decision?.exclusionReason ?? ""}
                                  onChange={(e) =>
                                    handleExclusionReasonChange(
                                      entry.versionGroupId,
                                      e.target.value,
                                    )
                                  }
                                  className="h-8 text-xs"
                                />
                                {error && (
                                  <p className="mt-1 text-xs text-destructive">
                                    {error}
                                  </p>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </FormSection>

        <FormSection
          title="Konfigurasi Penandatangan"
          description="Tambah penandatangan dan atur urutan dengan drag handle."
          action={
            <Badge tone="neutral" size="compact">
              {signatoryFields.length} penandatangan
            </Badge>
          }
          className="rounded-lg ring-1 ring-inset ring-border border-0"
        >
          <div className="space-y-3">
            {errors.signatories &&
              typeof errors.signatories.message === "string" && (
                <p className="text-xs text-destructive">
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
          </div>
        </FormSection>
      </form>

      {summary && (
        <AlertDialog
          open={showConfirm}
          onOpenChange={setShowConfirm}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Konfirmasi Pembuatan Kertas Kerja
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>
                    {summary.newDraftCount} dari {summary.includedCount}{" "}
                    risiko akan dibuatkan draft monitoring{" "}
                    <strong>{preview?.monitoringCycle}</strong>.
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Total risiko eligible: {summary.eligibleCount}
                    </li>
                    <li>
                      Termasuk: {summary.includedCount} risiko
                    </li>
                    <li>
                      Dikecualikan: {summary.excludedCount} risiko
                    </li>
                    <li>
                      Monitoring sudah final:{" "}
                      {summary.finalizedCount}
                    </li>
                    <li>
                      Draft monitoring tersedia:{" "}
                      {summary.existingDraftCount}
                    </li>
                    <li>
                      Draft baru akan dibuat:{" "}
                      {summary.newDraftCount}
                    </li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Kembali</AlertDialogCancel>
              <AlertDialogAction
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
